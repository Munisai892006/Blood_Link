const { getDb } = require('../db/database');
const { logAudit } = require('../middleware/audit');

class InventoryService {
  static listBatches(filters = {}) {
    const db = getDb();
    let query = `
      SELECT b.*, o.name AS organization_name
      FROM inventory_batches b
      JOIN organizations o ON o.id = b.organization_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.organization_id) {
      query += ' AND b.organization_id = ?';
      params.push(filters.organization_id);
    }
    if (filters.blood_group) {
      query += ' AND b.blood_group = ?';
      params.push(filters.blood_group);
    }
    if (filters.blood_component) {
      query += ' AND b.blood_component = ?';
      params.push(filters.blood_component);
    }
    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY b.expiry_date ASC';
    return db.prepare(query).all(...params);
  }

  static getBatchById(batchId) {
    const db = getDb();
    return db.prepare(`
      SELECT b.*, o.name AS organization_name
      FROM inventory_batches b
      JOIN organizations o ON o.id = b.organization_id
      WHERE b.id = ?
    `).get(batchId);
  }

  // Concurrency-safe atomic reservation (FR-INV-003, FR-INV-004, AC-006, AC-007)
  static reserveStock({ batchId, requestId = null, quantity, user, notes = '' }) {
    const db = getDb();

    if (quantity <= 0) {
      throw new Error('Reservation quantity must be greater than zero.');
    }

    let updatedBatch = null;

    // Execute within SQLite immediate transaction
    const executeReservation = db.transaction(() => {
      // Step 1: Read batch inside transaction
      const batch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batchId);

      if (!batch) {
        throw new Error(`Inventory batch '${batchId}' not found.`);
      }

      // AC-007: Strict block on expired or quarantined or inactive status
      if (batch.status === 'EXPIRED') {
        throw new Error(`Cannot reserve from batch '${batchId}': Batch is EXPIRED and strictly blocked from clinical allocation.`);
      }

      if (batch.status === 'QUARANTINED') {
        throw new Error(`Cannot reserve from batch '${batchId}': Batch is QUARANTINED pending biological safety testing.`);
      }

      if (batch.status !== 'AVAILABLE') {
        throw new Error(`Cannot reserve from batch '${batchId}': Current status is '${batch.status}'. Only AVAILABLE stock may be reserved.`);
      }

      // Check expiry date against today
      const today = new Date().toISOString().split('T')[0];
      if (batch.expiry_date < today) {
        // Automatically mark as expired in DB
        db.prepare("UPDATE inventory_batches SET status = 'EXPIRED' WHERE id = ?").run(batchId);
        throw new Error(`Cannot reserve from batch '${batchId}': Expiry date (${batch.expiry_date}) has passed. Marked as EXPIRED.`);
      }

      // AC-006: Concurrency and oversell prevention
      if (batch.units_available < quantity) {
        throw new Error(`Insufficient inventory: Batch '${batchId}' has only ${batch.units_available} units available, but ${quantity} was requested. Duplicate allocation blocked.`);
      }

      // Atomic update
      const previousAvailable = batch.units_available;
      const newAvailable = previousAvailable - quantity;
      const newReserved = batch.units_reserved + quantity;
      const newStatus = newAvailable === 0 ? 'RESERVED' : 'AVAILABLE';

      db.prepare(`
        UPDATE inventory_batches
        SET units_available = ?, units_reserved = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newAvailable, newReserved, newStatus, batchId);

      // Auditable ledger entry
      const txId = 'TX-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      db.prepare(`
        INSERT INTO inventory_transactions (
          id, batch_id, request_id, actor_id, action_type, quantity,
          previous_available, new_available, notes
        ) VALUES (?, ?, ?, ?, 'RESERVATION', ?, ?, ?, ?)
      `).run(txId, batchId, requestId, user.id, quantity, previousAvailable, newAvailable, notes);

      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'INVENTORY_RESERVED',
        entityType: 'INVENTORY_BATCH',
        entityId: batchId,
        details: { quantity, requestId, previousAvailable, newAvailable }
      });

      updatedBatch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batchId);
    });

    executeReservation();
    return updatedBatch;
  }

  // Add a newly received/donated batch
  static createBatch(data, user) {
    const db = getDb();
    const batchId = data.id || ('BAT-' + data.blood_group.replace('+', 'POS').replace('-', 'NEG') + '-' + Math.floor(100 + Math.random() * 900));
    const orgId = user.organization_id || data.organization_id || 'ORG-BANK-01';

    const units = parseInt(data.units_total || data.units_available || 1, 10);
    const initialStatus = data.status || (data.requires_quarantine ? 'QUARANTINED' : 'AVAILABLE');

    const stmt = db.prepare(`
      INSERT INTO inventory_batches (
        id, organization_id, blood_component, blood_group, units_total,
        units_available, units_reserved, collection_date, expiry_date,
        status, storage_location, confirmed_by_facility
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      batchId,
      orgId,
      data.blood_component,
      data.blood_group,
      units,
      initialStatus === 'AVAILABLE' ? units : 0,
      data.collection_date || new Date().toISOString().split('T')[0],
      data.expiry_date,
      initialStatus,
      data.storage_location || 'Cold Room Central'
    );

    // Audit transaction
    const txId = 'TX-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
    db.prepare(`
      INSERT INTO inventory_transactions (
        id, batch_id, actor_id, action_type, quantity,
        previous_available, new_available, notes
      ) VALUES (?, ?, ?, 'RECEIPT', ?, 0, ?, ?)
    `).run(txId, batchId, user.id, units, initialStatus === 'AVAILABLE' ? units : 0, 'New inventory batch intake');

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'INVENTORY_BATCH_CREATED',
      entityType: 'INVENTORY_BATCH',
      entityId: batchId,
      details: { blood_group: data.blood_group, units, status: initialStatus }
    });

    return InventoryService.getBatchById(batchId);
  }

  // Clear biological testing & release quarantined batch to available stock
  static qaClearBatch(batchId, user, notes = 'Biological viral markers negative: Released for transfusion') {
    const db = getDb();
    let updated = null;

    const executeQA = db.transaction(() => {
      const batch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batchId);
      if (!batch) throw new Error(`Batch '${batchId}' not found.`);

      if (batch.status !== 'QUARANTINED') {
        throw new Error(`Cannot clear batch: Current status is '${batch.status}', not QUARANTINED.`);
      }

      db.prepare(`
        UPDATE inventory_batches
        SET status = 'AVAILABLE', units_available = units_total, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(batchId);

      const txId = 'TX-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      db.prepare(`
        INSERT INTO inventory_transactions (
          id, batch_id, actor_id, action_type, quantity,
          previous_available, new_available, notes
        ) VALUES (?, ?, ?, 'ADJUSTMENT', ?, 0, ?, ?)
      `).run(txId, batchId, user.id, batch.units_total, batch.units_total, notes);

      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'INVENTORY_QUARANTINE_CLEARED',
        entityType: 'INVENTORY_BATCH',
        entityId: batchId,
        details: { units_cleared: batch.units_total, notes }
      });

      updated = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batchId);
    });

    executeQA();
    return updated;
  }

  // Discard expired, hemolyzed, or damaged stock
  static discardBatch(batchId, user, reason = 'Expired / biological disposal protocol') {
    const db = getDb();
    let updated = null;

    const executeDiscard = db.transaction(() => {
      const batch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batchId);
      if (!batch) throw new Error(`Batch '${batchId}' not found.`);

      const prevAvail = batch.units_available;
      db.prepare(`
        UPDATE inventory_batches
        SET status = 'EXPIRED', units_available = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(batchId);

      const txId = 'TX-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      db.prepare(`
        INSERT INTO inventory_transactions (
          id, batch_id, actor_id, action_type, quantity,
          previous_available, new_available, notes
        ) VALUES (?, ?, ?, 'DISCARD', ?, ?, 0, ?)
      `).run(txId, batchId, user.id, prevAvail, prevAvail, reason);

      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'INVENTORY_DISCARDED',
        entityType: 'INVENTORY_BATCH',
        entityId: batchId,
        details: { reason, previous_units: prevAvail }
      });

      updated = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batchId);
    });

    executeDiscard();
    return updated;
  }

  // Release previously reserved stock back to available pool
  static releaseStock({ batchId, requestId = null, quantity, user, notes = '' }) {
    const db = getDb();

    let updatedBatch = null;
    const executeRelease = db.transaction(() => {
      const batch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batchId);
      if (!batch) throw new Error(`Batch '${batchId}' not found.`);

      if (batch.units_reserved < quantity) {
        throw new Error(`Cannot release ${quantity} units: Batch has only ${batch.units_reserved} units currently reserved.`);
      }

      const previousAvailable = batch.units_available;
      const newAvailable = previousAvailable + quantity;
      const newReserved = batch.units_reserved - quantity;

      db.prepare(`
        UPDATE inventory_batches
        SET units_available = ?, units_reserved = ?, status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newAvailable, newReserved, batchId);

      const txId = 'TX-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      db.prepare(`
        INSERT INTO inventory_transactions (
          id, batch_id, request_id, actor_id, action_type, quantity,
          previous_available, new_available, notes
        ) VALUES (?, ?, ?, ?, 'RELEASE', ?, ?, ?, ?)
      `).run(txId, batchId, requestId, user.id, quantity, previousAvailable, newAvailable, notes);

      logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'INVENTORY_RELEASED',
        entityType: 'INVENTORY_BATCH',
        entityId: batchId,
        details: { quantity, requestId, previousAvailable, newAvailable }
      });

      updatedBatch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batchId);
    });

    executeRelease();
    return updatedBatch;
  }

  // Low stock and expiring warnings (FR-INV-005)
  static getStockAlerts(organizationId = null) {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    let orgFilter = organizationId ? 'AND organization_id = ?' : '';
    const params = organizationId ? [organizationId] : [];

    // Expiring within 7 days
    const expiringSoon = db.prepare(`
      SELECT * FROM inventory_batches
      WHERE status = 'AVAILABLE'
        AND expiry_date >= '${today}'
        AND expiry_date <= '${sevenDaysLater}'
        ${orgFilter}
    `).all(...params);

    // Low stock components (< 5 units available)
    const lowStock = db.prepare(`
      SELECT blood_group, blood_component, SUM(units_available) as total_available
      FROM inventory_batches
      WHERE status = 'AVAILABLE' ${orgFilter}
      GROUP BY blood_group, blood_component
      HAVING total_available < 5
    `).all(...params);

    return {
      expiring_soon_batches: expiringSoon,
      critically_low_components: lowStock
    };
  }
}

module.exports = InventoryService;
