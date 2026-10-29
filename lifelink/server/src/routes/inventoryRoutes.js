const express = require('express');
const router = express.Router();
const InventoryService = require('../services/inventoryService');
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// List Batches
router.get('/batches', (req, res) => {
  try {
    const filters = {
      organization_id: req.query.organization_id,
      blood_group: req.query.blood_group,
      blood_component: req.query.blood_component,
      status: req.query.status
    };
    const batches = InventoryService.listBatches(filters);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_BATCHES_FAILED', message: err.message });
  }
});

// Create Batch (Blood Bank Operator / Admin)
router.post('/batches', authenticateToken, requireRole('BLOOD_BANK_OPERATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const created = InventoryService.createBatch(req.body, req.user);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: 'CREATE_BATCH_FAILED', message: err.message });
  }
});

// QA Clear Batch (Move Quarantined to Available)
router.post('/batches/:id/qa-clear', authenticateToken, requireRole('BLOOD_BANK_OPERATOR', 'VERIFICATION_REVIEWER', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const cleared = InventoryService.qaClearBatch(req.params.id, req.user, req.body.notes);
    res.json(cleared);
  } catch (err) {
    res.status(400).json({ error: 'QA_CLEAR_FAILED', message: err.message });
  }
});

// Discard Batch
router.post('/batches/:id/discard', authenticateToken, requireRole('BLOOD_BANK_OPERATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const discarded = InventoryService.discardBatch(req.params.id, req.user, req.body.reason);
    res.json(discarded);
  } catch (err) {
    res.status(400).json({ error: 'DISCARD_FAILED', message: err.message });
  }
});

// Reserve Stock (Concurrency-Safe, FR-INV-004, AC-006, AC-007)
router.post('/reserve', authenticateToken, requireRole('BLOOD_BANK_OPERATOR', 'HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { batchId, requestId, quantity, notes } = req.body;
    const reserved = InventoryService.reserveStock({
      batchId,
      requestId,
      quantity: parseInt(quantity, 10),
      user: req.user,
      notes
    });
    res.json(reserved);
  } catch (err) {
    res.status(400).json({ error: 'RESERVATION_FAILED', message: err.message });
  }
});

// Release Reserved Stock
router.post('/release', authenticateToken, requireRole('BLOOD_BANK_OPERATOR', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { batchId, requestId, quantity, notes } = req.body;
    const released = InventoryService.releaseStock({
      batchId,
      requestId,
      quantity: parseInt(quantity, 10),
      user: req.user,
      notes
    });
    res.json(released);
  } catch (err) {
    res.status(400).json({ error: 'RELEASE_FAILED', message: err.message });
  }
});

// Low-stock & Expiry Alerts (FR-INV-005)
router.get('/alerts', (req, res) => {
  try {
    const alerts = InventoryService.getStockAlerts(req.query.organization_id);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_ALERTS_FAILED', message: err.message });
  }
});

// Inventory Transaction Ledger
router.get('/transactions', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const transactions = db.prepare(`
      SELECT t.*, b.blood_group, b.blood_component, u.full_name as actor_name
      FROM inventory_transactions t
      JOIN inventory_batches b ON b.id = t.batch_id
      JOIN users u ON u.id = t.actor_id
      ORDER BY t.created_at DESC
      LIMIT 100
    `).all();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_TRANSACTIONS_FAILED', message: err.message });
  }
});

module.exports = router;
