const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { getDb } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => {
  try {
    const list = NotificationService.getNotificationsForUser(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_NOTIFICATIONS_FAILED', message: err.message });
  }
});

router.get('/unread-count', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE recipient_id = ? AND delivery_status != 'READ'").get(req.user.id).c;
    res.json({ unread_count: count });
  } catch (err) {
    res.status(500).json({ error: 'COUNT_FAILED', message: err.message });
  }
});

router.patch('/:id/read', authenticateToken, (req, res) => {
  try {
    NotificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, notification_id: req.params.id, status: 'READ' });
  } catch (err) {
    res.status(500).json({ error: 'MARK_READ_FAILED', message: err.message });
  }
});

router.post('/mark-all-read', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`
      UPDATE notifications
      SET delivery_status = 'READ', updated_at = CURRENT_TIMESTAMP
      WHERE recipient_id = ?
    `).run(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'MARK_ALL_READ_FAILED', message: err.message });
  }
});

router.post('/simulate-test', authenticateToken, async (req, res) => {
  try {
    const { title, body, channel } = req.body;
    const created = await NotificationService.sendNotification({
      recipientId: req.user.id,
      channel: channel || 'IN_APP',
      title: title || 'Simulated Emergency Alert',
      body: body || 'Test alert: Immediate donor standby requested in Hyderabad Sector 1.'
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: 'SIMULATION_FAILED', message: err.message });
  }
});

// Verified Provider Webhook Callback (FR-NOT-005, FR-NOT-006)
router.post('/webhook', (req, res) => {
  try {
    const webhookSecret = req.headers['x-bloodlink-webhook-secret'] || req.body.secret;
    const expectedSecret = process.env.WEBHOOK_SECRET || 'bloodlink_webhook_verification_secret_2026';

    // Verify provider signature/secret token (FR-NOT-005)
    if (webhookSecret !== expectedSecret) {
      return res.status(401).json({ error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' });
    }

    const { notification_id, provider_status, failure_reason } = req.body;
    if (!notification_id) return res.status(400).json({ error: 'MISSING_NOTIFICATION_ID' });

    const db = getDb();
    const statusMap = {
      'delivered': 'DELIVERED',
      'failed': 'FAILED',
      'sent': 'SENT',
      'read': 'READ'
    };
    const mappedStatus = statusMap[provider_status?.toLowerCase()] || 'DELIVERED';

    db.prepare(`
      UPDATE notifications
      SET delivery_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(mappedStatus, failure_reason || null, notification_id);

    res.json({ success: true, notification_id, status: mappedStatus });
  } catch (err) {
    res.status(500).json({ error: 'WEBHOOK_FAILED', message: err.message });
  }
});

module.exports = router;
