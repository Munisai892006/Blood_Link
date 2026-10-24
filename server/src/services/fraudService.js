const { getDb } = require('../db/database');
const { logAudit } = require('../middleware/audit');

class FraudService {
  static listFlags() {
    const db = getDb();
    return db.prepare(`
      SELECT f.*, u.full_name as reviewer_name
      FROM fraud_flags f
      LEFT JOIN users u ON u.id = f.reviewed_by
      ORDER BY f.created_at DESC
    `).all();
  }

  static checkDuplicateRequest(patientReference, hospitalId) {
    if (!patientReference) return null;
    const db = getDb();

    // Check for requests with the same patient reference within the last 2 hours
    const duplicate = db.prepare(`
      SELECT * FROM emergency_requests
      WHERE patient_reference = ?
        AND status NOT IN ('CANCELLED', 'EXPIRED', 'REJECTED')
        AND datetime(created_at) >= datetime('now', '-2 hours')
    `).get(patientReference);

    if (duplicate) {
      const flagId = 'FRD-' + Math.floor(1000 + Math.random() * 9000);
      const stmt = db.prepare(`
        INSERT INTO fraud_flags (id, target_type, target_id, flag_reason, evidence_payload, status)
        VALUES (?, 'REQUEST', ?, 'Duplicate patient reference detected within active 2-hour window across facilities', ?, 'PENDING_REVIEW')
      `);

      stmt.run(
        flagId,
        duplicate.id,
        JSON.stringify({ patient_reference: patientReference, existing_request: duplicate.id, hospital_id: hospitalId })
      );

      // Notify Fraud Reviewers
      try {
        const NotificationService = require('./notificationService');
        const reviewers = db.prepare("SELECT id FROM users WHERE role = 'FRAUD_REVIEWER'").all();
        for (const fr of reviewers) {
          NotificationService.sendNotification({
            recipientId: fr.id,
            channel: 'IN_APP',
            title: `⚠️ Security Integrity Flag Raised: ${flagId}`,
            body: `Duplicate request pattern detected for patient reference ${patientReference} within 2-hour window. Audit required.`,
            metadata: { flagId, patientReference, existingRequestId: duplicate.id }
          });
        }
      } catch (notifErr) {
        console.error('[NotificationError]', notifErr.message);
      }

      return flagId;
    }

    return null;
  }

  static resolveFlag(flagId, { status, reviewNotes, user }) {
    const db = getDb();
    db.prepare(`
      UPDATE fraud_flags
      SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, reviewNotes, user.id, flagId);

    logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'FRAUD_FLAG_RESOLVED',
      entityType: 'FRAUD_FLAG',
      entityId: flagId,
      details: { status, reviewNotes }
    });

    return db.prepare('SELECT * FROM fraud_flags WHERE id = ?').get(flagId);
  }
}

module.exports = FraudService;
