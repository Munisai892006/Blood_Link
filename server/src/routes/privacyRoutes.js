const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Export Complete Personal Data Archive (GDPR / DPDP Compliance - FR-PRV-002)
router.get('/export-my-data', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, full_name, phone, role, organization_id, created_at FROM users WHERE id = ?').get(req.user.id);
    const donorProfile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.user.id);
    const donations = db.prepare('SELECT * FROM donation_history WHERE donor_id = ?').all(req.user.id);
    const notifications = db.prepare('SELECT * FROM notifications WHERE recipient_id = ?').all(req.user.id);
    const consentChoices = {
      consent_emergency_alerts: donorProfile?.consent_emergency_alerts === 1,
      consent_data_sharing: donorProfile?.consent_data_sharing === 1,
      quiet_hours: `${donorProfile?.quiet_hours_start} to ${donorProfile?.quiet_hours_end}`,
      preferred_language: donorProfile?.preferred_language
    };

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PERSONAL_DATA_ARCHIVE_EXPORTED',
      entityType: 'USER',
      entityId: req.user.id,
      details: { exportType: 'FULL_ARCHIVE_JSON' }
    });

    res.json({
      export_timestamp: new Date().toISOString(),
      platform: 'BloodLink 3.0',
      compliance_standard: 'ISO/IEC 29148 & DPDP/GDPR Data Subject Access Request',
      user_identity: user,
      donor_profile: donorProfile,
      consent_records: consentChoices,
      confirmed_donations: donations,
      received_notifications: notifications
    });
  } catch (err) {
    res.status(500).json({ error: 'EXPORT_FAILED', message: err.message });
  }
});

// Request Data Deletion (FR-PRV-002, Section 5.3)
router.post('/request-deletion', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { reason = 'Right to be forgotten requested by user' } = req.body;
    const reqId = 'PRV-' + Date.now().toString(36).toUpperCase();

    // Check if user has confirmed donation or clinical records that MUST legally be retained (Section 5.3)
    const hasDonations = db.prepare('SELECT COUNT(*) as c FROM donation_history WHERE donor_id = ?').get(req.user.id).c > 0;
    const retentionNote = hasDonations
      ? 'Under National Blood Transfusion regulations, transfusion safety and biological donation traceability records must legally be retained for 10 years. Non-mandatory marketing and location coordinates will be anonymized.'
      : 'No clinical transfusion records on file. Full anonymization and profile removal eligible.';

    db.prepare(`
      INSERT INTO privacy_requests (id, user_id, request_type, status, reason, retention_justification)
      VALUES (?, ?, 'DELETION', 'PENDING', ?, ?)
    `).run(reqId, req.user.id, reason, retentionNote);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PRIVACY_DELETION_REQUESTED',
      entityType: 'PRIVACY_REQUEST',
      entityId: reqId,
      details: { hasClinicalRetentionObligations: hasDonations }
    });

    res.status(201).json({
      success: true,
      request_id: reqId,
      status: 'PENDING',
      legal_retention_assessment: retentionNote
    });
  } catch (err) {
    res.status(400).json({ error: 'DELETION_REQUEST_FAILED', message: err.message });
  }
});

module.exports = router;
