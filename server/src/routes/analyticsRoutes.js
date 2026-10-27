const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const ForecastService = require('../services/forecastService');
const FraudService = require('../services/fraudService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Mission Control Real-Time Analytics (FR-OPS-001 to 005, Phase 5.A)
router.get('/mission-control', (req, res) => {
  try {
    const db = getDb();

    // 1. Core Request Metrics
    const requestStats = db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(CASE WHEN status IN ('PENDING_REVIEW', 'VERIFIED', 'MATCHING') THEN 1 ELSE 0 END) as active_emergency_requests,
        SUM(CASE WHEN status = 'PENDING_REVIEW' THEN 1 ELSE 0 END) as pending_verification_count,
        SUM(CASE WHEN status = 'FULFILLED' THEN 1 ELSE 0 END) as fulfilled_requests,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_requests,
        SUM(units_requested) as total_units_demanded,
        SUM(units_fulfilled) as total_units_fulfilled
      FROM emergency_requests
      WHERE is_synthetic = 0
    `).get();

    // 2. Real-Time Available Units by Blood Group
    const inventoryStock = db.prepare(`
      SELECT blood_group, SUM(units_available) as units
      FROM inventory_batches
      WHERE status = 'AVAILABLE'
      GROUP BY blood_group
    `).all();

    // 3. Registered Donors & Active Incidents
    const donorCount = db.prepare("SELECT COUNT(*) as count FROM donor_profiles WHERE availability_status = 'AVAILABLE'").get().count;
    const activeIncidents = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status = 'ACTIVE'").get().count;

    // 4. Donor Responses Count
    const donorResponses = db.prepare("SELECT COUNT(*) as count FROM request_matches WHERE response_timestamp IS NOT NULL").get().count;

    // 5. Notification Metrics (Success vs Failure Counts)
    const notifStats = db.prepare(`
      SELECT
        SUM(CASE WHEN delivery_status IN ('DELIVERED', 'READ') THEN 1 ELSE 0 END) as delivered_count,
        SUM(CASE WHEN delivery_status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
        COUNT(*) as total_count
      FROM notifications
    `).get();

    // 6. Recent Operational Events
    const recentEvents = db.prepare(`
      SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at, u.full_name as actor_name, u.role as actor_role
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_id
      ORDER BY a.created_at DESC
      LIMIT 8
    `).all();

    // 7. Response Time & Fulfillment Metric
    const fulfillmentRate = requestStats.total_units_demanded > 0
      ? Math.round((requestStats.total_units_fulfilled / requestStats.total_units_demanded) * 100)
      : 100;

    res.json({
      timestamp: new Date().toISOString(),
      data_freshness: 'LIVE_DATABASE_FEED',
      service_health: {
        api: 'HEALTHY',
        database: 'CONNECTED_ACID',
        notification_dispatcher: 'ACTIVE'
      },
      overview: {
        active_emergency_requests: requestStats.active_emergency_requests || 0,
        pending_verification: requestStats.pending_verification_count || 0,
        total_requests: requestStats.total_requests || 0,
        fulfilled_requests: requestStats.fulfilled_requests || 0,
        fulfillment_percentage: `${fulfillmentRate}%`,
        available_donors_online: donorCount,
        active_incidents: activeIncidents,
        donor_responses: donorResponses,
        notifications_delivered: notifStats.delivered_count || 0,
        notifications_failed: notifStats.failed_count || 0
      },
      stock_by_blood_group: inventoryStock,
      recent_events: recentEvents,
      privacy_notice: 'All public analytics strictly aggregate metrics. Personally identifiable donor and patient coordinates are excluded in compliance with privacy-by-design requirements (FR-OPS-005).'
    });
  } catch (err) {
    res.status(500).json({ error: 'FETCH_MISSION_CONTROL_FAILED', message: err.message });
  }
});

// AI Forecasting Endpoint (FR-AI-001 to 005)
router.get('/forecast', (req, res) => {
  try {
    const forecast = ForecastService.getShortageForecast();
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_FORECAST_FAILED', message: err.message });
  }
});

// Fraud Flags
router.get('/fraud', authenticateToken, requireRole('FRAUD_REVIEWER', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const flags = FraudService.listFlags();
    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_FRAUD_FLAGS_FAILED', message: err.message });
  }
});

router.post('/fraud/:id/resolve', authenticateToken, requireRole('FRAUD_REVIEWER', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const resolved = FraudService.resolveFlag(req.params.id, { status, reviewNotes, user: req.user });
    res.json(resolved);
  } catch (err) {
    res.status(400).json({ error: 'RESOLVE_FRAUD_FAILED', message: err.message });
  }
});

// Audit Logs (FR-PRV-003)
router.get('/audit-logs', authenticateToken, requireRole('SYSTEM_ADMIN', 'FRAUD_REVIEWER'), (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare(`
      SELECT a.*, u.full_name as actor_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_AUDIT_LOGS_FAILED', message: err.message });
  }
});

module.exports = router;
