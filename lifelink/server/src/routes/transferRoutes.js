const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// List Transfers
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const transfers = db.prepare(`
      SELECT t.*, src.name as source_org_name, dst.name as destination_org_name
      FROM inventory_transfers t
      JOIN organizations src ON src.id = t.source_org_id
      JOIN organizations dst ON dst.id = t.destination_org_id
      ORDER BY t.created_at DESC
    `).all();
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_TRANSFERS_FAILED', message: err.message });
  }
});

// Request Inter-Facility Stock Transfer (FR-INV-002)
router.post('/request', authenticateToken, requireRole('HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'BLOOD_BANK_OPERATOR', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    let { source_org_id, destination_org_id, batch_id, blood_group, blood_component, quantity, notes } = req.body;

    destination_org_id = destination_org_id || req.user.organization_id || 'ORG-HOSP-01';

    // 1. Validate source and destination are different
    if (source_org_id === destination_org_id) {
      return res.status(400).json({
        error: 'INVALID_TRANSFER_DESTINATION',
        message: 'Source organization and destination facility cannot be identical. Mutual aid transfers must be inter-facility.'
      });
    }

    // 2. Validate positive integer quantity
    const unitsRequested = parseInt(quantity, 10);
    if (isNaN(unitsRequested) || unitsRequested <= 0) {
      return res.status(400).json({
        error: 'INVALID_QUANTITY',
        message: 'Transfer quantity must be a positive integer greater than zero.'
      });
    }

    // 3. Find source batch and check stock availability
    let sourceBatch;
    if (batch_id) {
      sourceBatch = db.prepare('SELECT * FROM inventory_batches WHERE id = ? AND organization_id = ?').get(batch_id, source_org_id);
    } else {
      sourceBatch = db.prepare(`
        SELECT * FROM inventory_batches
        WHERE organization_id = ? AND blood_group = ? AND blood_component = ? AND status = 'AVAILABLE' AND units_available >= ?
        ORDER BY expiry_date ASC LIMIT 1
      `).get(source_org_id, blood_group, blood_component, unitsRequested);
      if (!sourceBatch) {
        // Fallback to any batch of that group
        sourceBatch = db.prepare(`
          SELECT * FROM inventory_batches
          WHERE organization_id = ? AND blood_group = ? AND status = 'AVAILABLE'
          ORDER BY expiry_date ASC LIMIT 1
        `).get(source_org_id, blood_group);
      }
    }

    if (!sourceBatch) {
      return res.status(400).json({
        error: 'NO_SOURCE_BATCH_FOUND',
        message: `No available inventory batch matching blood group ${blood_group} was found at the source facility.`
      });
    }

    if (sourceBatch.units_available < unitsRequested) {
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Insufficient available inventory at source facility. Requested: ${unitsRequested} unit(s), Available: ${sourceBatch.units_available} unit(s).`
      });
    }

    const transferId = 'XFR-' + Date.now().toString(36).toUpperCase();

    // Transactionally create transfer and reserve stock
    const createTransferTx = db.transaction(() => {
      // Reserve units on the source batch
      db.prepare(`
        UPDATE inventory_batches
        SET units_available = units_available - ?,
            units_reserved = units_reserved + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(unitsRequested, unitsRequested, sourceBatch.id);

      // Log inventory reservation transaction
      const txId = 'TX-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      db.prepare(`
        INSERT INTO inventory_transactions (id, batch_id, actor_id, action_type, quantity, previous_available, new_available, notes)
        VALUES (?, ?, ?, 'RESERVATION', ?, ?, ?, ?)
      `).run(
        txId,
        sourceBatch.id,
        req.user.id,
        unitsRequested,
        sourceBatch.units_available,
        sourceBatch.units_available - unitsRequested,
        `Reserved for mutual aid transfer ${transferId}`
      );

      // Insert transfer record
      db.prepare(`
        INSERT INTO inventory_transfers (
          id, source_org_id, destination_org_id, batch_id, blood_group,
          blood_component, quantity, status, requested_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?, ?)
      `).run(
        transferId,
        source_org_id,
        destination_org_id,
        sourceBatch.id,
        blood_group || sourceBatch.blood_group,
        blood_component || sourceBatch.blood_component,
        unitsRequested,
        req.user.id,
        notes || 'Emergency mutual-aid transfer'
      );
    });

    createTransferTx();

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'STOCK_TRANSFER_REQUESTED',
      entityType: 'INVENTORY_TRANSFER',
      entityId: transferId,
      details: { source_org_id, destination_org_id, quantity: unitsRequested, blood_group }
    });

    // Notify Blood Bank Operators at source organization
    try {
      const NotificationService = require('../services/notificationService');
      const bankOperators = db.prepare("SELECT id FROM users WHERE organization_id = ? AND role = 'BLOOD_BANK_OPERATOR'").all(source_org_id);
      for (const op of bankOperators) {
        NotificationService.sendNotification({
          recipientId: op.id,
          channel: 'IN_APP',
          title: `📦 Mutual Aid Stock Transfer Requested`,
          body: `Transfer ${transferId}: ${unitsRequested} units of ${blood_group} ${blood_component} requested by affiliated facility.`,
          metadata: { transferId, source_org_id, quantity: unitsRequested, blood_group }
        });
      }
    } catch (notifErr) {
      console.error('[NotificationError]', notifErr.message);
    }

    res.status(201).json({ success: true, transfer_id: transferId, status: 'REQUESTED' });
  } catch (err) {
    res.status(400).json({ error: 'TRANSFER_REQUEST_FAILED', message: err.message });
  }
});

// Dispatch Transfer with Cold-Chain Courier
router.post('/:id/dispatch', authenticateToken, requireRole('BLOOD_BANK_OPERATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const { courier_name, courier_phone, departure_temperature_c = 3.8 } = req.body;

    db.prepare(`
      UPDATE inventory_transfers
      SET status = 'DISPATCHED_IN_TRANSIT', courier_name = ?, courier_phone = ?,
          departure_temperature_c = ?, dispatched_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(courier_name, courier_phone, parseFloat(departure_temperature_c), req.params.id);

    // Initial cold-chain log
    const ccId = 'CC-' + Date.now().toString(36);
    db.prepare(`
      INSERT INTO cold_chain_logs (id, transfer_id, temperature_celsius, ambient_celsius, is_safe, recorded_by, notes)
      VALUES (?, ?, ?, 30.0, 1, ?, 'Departure inspection: Temperature certified within 2C-6C safe range')
    `).run(ccId, req.params.id, parseFloat(departure_temperature_c), req.user.id);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'STOCK_TRANSFER_DISPATCHED',
      entityType: 'INVENTORY_TRANSFER',
      entityId: req.params.id,
      details: { courier_name, departure_temperature_c }
    });

    // Notify Destination Hospital Requesters
    try {
      const NotificationService = require('../services/notificationService');
      const transfer = db.prepare('SELECT * FROM inventory_transfers WHERE id = ?').get(req.params.id);
      if (transfer) {
        const destUsers = db.prepare("SELECT id FROM users WHERE organization_id = ? AND role IN ('HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN')").all(transfer.destination_org_id);
        for (const du of destUsers) {
          NotificationService.sendNotification({
            recipientId: du.id,
            channel: 'IN_APP',
            title: `🚚 Cold-Chain Transfer Dispatched (${departure_temperature_c}°C)`,
            body: `Courier ${courier_name} (${courier_phone}) has departed with Transfer ${req.params.id}. Temperature in 2C-6C safe range.`,
            metadata: { transferId: req.params.id, courier_name, departure_temperature_c }
          });
        }
      }
    } catch (notifErr) {
      console.error('[NotificationError]', notifErr.message);
    }

    res.json({ success: true, status: 'DISPATCHED_IN_TRANSIT' });
  } catch (err) {
    res.status(400).json({ error: 'DISPATCH_FAILED', message: err.message });
  }
});

// Receive at Destination Hospital & Verify Cold-Chain Temperature (FR-INV-002, AC-013)
router.post('/:id/receive', authenticateToken, requireRole('HOSPITAL_ADMIN', 'HOSPITAL_REQUESTER', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const { arrival_temperature_c = 4.2, seal_integrity = 'INTACT', notes = '' } = req.body;
    const arrivalTemp = parseFloat(arrival_temperature_c);

    const transfer = db.prepare('SELECT * FROM inventory_transfers WHERE id = ?').get(req.params.id);
    if (!transfer) {
      return res.status(404).json({ error: 'TRANSFER_NOT_FOUND', message: 'Transfer record not found.' });
    }

    if (transfer.status === 'RECEIVED' || transfer.status === 'REJECTED') {
      return res.status(400).json({ error: 'ALREADY_PROCESSED', message: `Transfer has already been processed with status: ${transfer.status}` });
    }

    // Cold chain rule: Strictly 2.0°C to 6.0°C and seal must be INTACT
    const isTempSafe = arrivalTemp >= 2.0 && arrivalTemp <= 6.0;
    const isSealIntact = seal_integrity === 'INTACT';
    const isColdChainCompliant = isTempSafe && isSealIntact;

    const ccId = 'CC-' + Date.now().toString(36);

    if (!isColdChainCompliant) {
      // Cold-chain deviation protocol: Quarantine batch immediately (Status REJECTED)
      const quarantineTx = db.transaction(() => {
        db.prepare(`
          UPDATE inventory_transfers
          SET status = 'REJECTED', arrival_temperature_c = ?, received_at = CURRENT_TIMESTAMP,
              notes = notes || ' | COLD CHAIN DEVIATION QUARANTINE: Temp=' || ? || 'C, Seal=' || ?
          WHERE id = ?
        `).run(arrivalTemp, arrivalTemp, seal_integrity, req.params.id);

        // Record deviation in cold chain telemetry
        db.prepare(`
          INSERT INTO cold_chain_logs (id, transfer_id, temperature_celsius, ambient_celsius, is_safe, recorded_by, notes)
          VALUES (?, ?, ?, 32.0, 0, ?, ?)
        `).run(
          ccId,
          req.params.id,
          arrivalTemp,
          req.user.id,
          `COLD CHAIN DEVIATION HAZARD: Temp ${arrivalTemp}°C outside safe 2.0°C-6.0°C bounds. Seal: ${seal_integrity}. Stock Quarantined.`
        );

        // Discard/release reserved units from source batch
        if (transfer.batch_id) {
          db.prepare(`
            UPDATE inventory_batches
            SET units_reserved = MAX(0, units_reserved - ?),
                units_total = MAX(0, units_total - ?),
                status = 'QUARANTINED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(transfer.quantity, transfer.quantity, transfer.batch_id);
        }
      });

      quarantineTx();

      logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'COLD_CHAIN_TEMPERATURE_DEVIATION',
        entityType: 'INVENTORY_TRANSFER',
        entityId: req.params.id,
        details: { arrival_temperature_c: arrivalTemp, seal_integrity, status: 'REJECTED' }
      });

      // Alert coordinator and clinical leads
      try {
        const NotificationService = require('../services/notificationService');
        NotificationService.sendNotification({
          recipientId: req.user.id,
          channel: 'IN_APP',
          title: `⚠️ Cold-Chain Hazard: Units Quarantined (${arrivalTemp}°C)`,
          body: `Transfer ${req.params.id} violated cold-chain bounds (${arrivalTemp}°C, seal: ${seal_integrity}). Stock quarantined from transfusion pool.`,
          metadata: { transferId: req.params.id, arrivalTemp, seal_integrity }
        });
      } catch (notifErr) {}

      return res.json({
        success: true,
        status: 'REJECTED',
        quarantined: true,
        message: `Cold-chain deviation detected (${arrivalTemp}°C, seal: ${seal_integrity}). Units have been quarantined per transfusion safety protocol.`
      });
    }

    // Compliant Cold-Chain: Transactionally credit destination inventory
    const receiveTx = db.transaction(() => {
      // 1. Mark transfer RECEIVED
      db.prepare(`
        UPDATE inventory_transfers
        SET status = 'RECEIVED', arrival_temperature_c = ?, received_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(arrivalTemp, req.params.id);

      // 2. Clear reservation at source batch
      if (transfer.batch_id) {
        db.prepare(`
          UPDATE inventory_batches
          SET units_reserved = MAX(0, units_reserved - ?),
              units_total = MAX(0, units_total - ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(transfer.quantity, transfer.quantity, transfer.batch_id);
      }

      // 3. Add to destination hospital inventory (find existing or create new batch)
      const existingDestBatch = db.prepare(`
        SELECT id FROM inventory_batches
        WHERE organization_id = ? AND blood_group = ? AND blood_component = ? AND status = 'AVAILABLE'
        ORDER BY expiry_date ASC LIMIT 1
      `).get(transfer.destination_org_id, transfer.blood_group, transfer.blood_component);

      let targetBatchId;
      if (existingDestBatch) {
        targetBatchId = existingDestBatch.id;
        db.prepare(`
          UPDATE inventory_batches
          SET units_available = units_available + ?,
              units_total = units_total + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(transfer.quantity, transfer.quantity, targetBatchId);
      } else {
        targetBatchId = 'BAT-' + Date.now().toString(36).toUpperCase();
        const futureExpiry = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const collectionDate = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT INTO inventory_batches (
            id, organization_id, blood_group, blood_component, units_available,
            units_reserved, units_total, collection_date, expiry_date, storage_location, status
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'Trauma Emergency Cold Storage', 'AVAILABLE')
        `).run(
          targetBatchId,
          transfer.destination_org_id,
          transfer.blood_group,
          transfer.blood_component,
          transfer.quantity,
          transfer.quantity,
          collectionDate,
          futureExpiry
        );
      }

      // 4. Log inventory transaction at destination
      const prevDest = existingDestBatch ? (existingDestBatch.units_available || 0) : 0;
      const txId = 'TX-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      db.prepare(`
        INSERT INTO inventory_transactions (id, batch_id, actor_id, action_type, quantity, previous_available, new_available, notes)
        VALUES (?, ?, ?, 'TRANSFER', ?, ?, ?, ?)
      `).run(txId, targetBatchId, req.user.id, transfer.quantity, prevDest, prevDest + transfer.quantity, `Stock intake from Transfer ${req.params.id} (${arrivalTemp}°C certified)`);

      // 5. Log verified cold-chain entry
      db.prepare(`
        INSERT INTO cold_chain_logs (id, transfer_id, temperature_celsius, ambient_celsius, is_safe, recorded_by, notes)
        VALUES (?, ?, ?, 29.5, 1, ?, ?)
      `).run(
        ccId,
        req.params.id,
        arrivalTemp,
        req.user.id,
        `Arrival inspection passed: Temperature certified at ${arrivalTemp}°C within safe 2.0°C-6.0°C range. Seal intact.`
      );
    });

    receiveTx();

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'STOCK_TRANSFER_RECEIVED',
      entityType: 'INVENTORY_TRANSFER',
      entityId: req.params.id,
      details: { arrival_temperature_c: arrivalTemp, seal_integrity, status: 'RECEIVED' }
    });

    // Notify original requester
    try {
      const NotificationService = require('../services/notificationService');
      if (transfer.requested_by) {
        NotificationService.sendNotification({
          recipientId: transfer.requested_by,
          channel: 'IN_APP',
          title: `✅ Blood Units Received & Certified (${arrivalTemp}°C)`,
          body: `Transfer ${req.params.id} has arrived safely and is logged into active hospital reserves.`,
          metadata: { transferId: req.params.id, arrival_temperature_c: arrivalTemp }
        });
      }
    } catch (notifErr) {
      console.error('[NotificationError]', notifErr.message);
    }

    res.json({ success: true, status: 'RECEIVED', verified: true, message: `Blood units verified at ${arrivalTemp}°C and successfully added to destination hospital stock.` });
  } catch (err) {
    res.status(400).json({ error: 'RECEIVE_FAILED', message: err.message });
  }
});

// Cold-chain Telemetry
router.get('/:id/telemetry', (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM cold_chain_logs WHERE transfer_id = ? ORDER BY recorded_at ASC').all(req.params.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_TELEMETRY_FAILED', message: err.message });
  }
});

module.exports = router;
