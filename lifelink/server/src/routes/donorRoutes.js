const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// Get Confirmed Donation History (FR-DON-005)
router.get('/my-history', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const history = db.prepare(`
      SELECT d.*, o.name as facility_name
      FROM donation_history d
      JOIN organizations o ON o.id = d.organization_id
      WHERE d.donor_id = ?
      ORDER BY d.donation_date DESC
    `).all(req.user.id);

    const totalDonations = history.length;
    let badge = 'Bronze Contributor';
    if (totalDonations >= 10) badge = 'Diamond Lifetime Lifesaver';
    else if (totalDonations >= 5) badge = 'Gold Hero Donor';
    else if (totalDonations >= 3) badge = 'Silver Community Guardian';

    res.json({
      donor_id: req.user.id,
      total_donations: totalDonations,
      milestone_badge: badge,
      history
    });
  } catch (err) {
    res.status(500).json({ error: 'FETCH_DONOR_HISTORY_FAILED', message: err.message });
  }
});

// Public Certificate Verification Endpoint (Zero PII leakage)
router.get('/certificates/verify/:hash', (req, res) => {
  try {
    const db = getDb();
    const cert = db.prepare(`
      SELECT d.id, d.donation_date, d.blood_component, d.units_donated, d.hemoglobin_g_dl,
             d.certificate_hash, d.created_at, o.name as facility_name, o.address as facility_city,
             u.full_name as donor_full_name
      FROM donation_history d
      JOIN organizations o ON o.id = d.organization_id
      JOIN users u ON u.id = d.donor_id
      WHERE d.certificate_hash = ?
    `).get(req.params.hash.trim());

    if (!cert) {
      return res.status(404).json({
        valid: false,
        error: 'CERTIFICATE_NOT_FOUND',
        message: 'No official BloodLink donation record found matching this certificate hash.'
      });
    }

    // Mask donor name to protect PII (e.g. "Vikram Sharma" -> "V. S.")
    const nameParts = cert.donor_full_name.trim().split(/\s+/);
    const donorInitials = nameParts.map(p => p[0].toUpperCase() + '.').join(' ');

    res.json({
      valid: true,
      certificate_hash: cert.certificate_hash,
      facility_name: cert.facility_name,
      facility_city: cert.facility_city,
      donation_date: cert.donation_date,
      blood_component: cert.blood_component,
      units_donated: cert.units_donated,
      hemoglobin_g_dl: cert.hemoglobin_g_dl,
      donor_initials: donorInitials,
      issued_by: 'BloodLink 3.0 Clinical Authority & Telangana Emergency Network',
      verified_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'VERIFY_FAILED', message: err.message });
  }
});

// Single Certificate Full Details (Authenticated)
router.get('/certificates/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const cert = db.prepare(`
      SELECT d.*, o.name as facility_name, o.address as facility_city, u.full_name as donor_name,
             p.blood_group, rev.full_name as reviewer_name
      FROM donation_history d
      JOIN organizations o ON o.id = d.organization_id
      JOIN users u ON u.id = d.donor_id
      LEFT JOIN donor_profiles p ON p.user_id = d.donor_id
      LEFT JOIN users rev ON rev.id = d.verified_by
      WHERE d.id = ? OR d.certificate_hash = ?
    `).get(req.params.id, req.params.id);

    if (!cert) {
      return res.status(404).json({ error: 'CERTIFICATE_NOT_FOUND', message: 'Certificate not found.' });
    }

    // Ensure donor can only view their own certificate unless privileged
    const isOwner = cert.donor_id === req.user.id;
    const isPrivileged = ['VERIFICATION_REVIEWER', 'BLOOD_BANK_OPERATOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Unauthorized to view this certificate.' });
    }

    res.json(cert);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_CERTIFICATE_FAILED', message: err.message });
  }
});

// Authorized Facility logs confirmed donation and issues verified certificate (FR-DON-005, Instruction #8)
router.post('/log-donation', authenticateToken, requireRole('BLOOD_BANK_OPERATOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN', 'HOSPITAL_REQUESTER', 'EMERGENCY_COORDINATOR'), (req, res) => {
  try {
    const db = getDb();
    const { donor_id, blood_component = 'WHOLE_BLOOD', units_donated = 1, hemoglobin_g_dl = 14.5, notes = '' } = req.body;
    const orgId = req.user.organization_id || 'ORG-BANK-01';

    const donId = 'DON-HIST-' + Date.now().toString(36).toUpperCase();
    const certHash = `CERT-BL-2026-${donor_id}-${Math.floor(1000 + Math.random() * 9000)}`;

    db.prepare(`
      INSERT INTO donation_history (
        id, donor_id, organization_id, donation_date, blood_component,
        units_donated, hemoglobin_g_dl, certificate_hash, verified_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      donId,
      donor_id,
      orgId,
      new Date().toISOString().split('T')[0],
      blood_component,
      parseInt(units_donated, 10),
      parseFloat(hemoglobin_g_dl),
      certHash,
      req.user.id,
      notes
    );

    // Update last donation date in donor profile
    db.prepare(`
      UPDATE donor_profiles
      SET last_donation_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(new Date().toISOString().split('T')[0], donor_id);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'DONATION_RECORDED_AND_CERTIFIED',
      entityType: 'DONATION_HISTORY',
      entityId: donId,
      details: { donor_id, units_donated, certHash }
    });

    // Notify Donor with exact prompt requirements (Instruction #8)
    try {
      const NotificationService = require('../services/notificationService');
      NotificationService.sendNotification({
        recipientId: donor_id,
        channel: 'IN_APP',
        title: `Donation Completed — Certificate Available`,
        body: `Your donation record has been verified by the authorized donation centre. Your donation certificate is now available.`,
        metadata: { 
          donationId: donId, 
          certHash, 
          units_donated, 
          action: 'View Certificate',
          url: `/api/donors/certificates/verify/${certHash}`
        }
      });
    } catch (notifErr) {
      console.error('[NotificationError]', notifErr.message);
    }

    res.status(201).json({
      success: true,
      donation_id: donId,
      certificate_hash: certHash,
      message: 'Confirmed donation verified and official certificate issued.'
    });
  } catch (err) {
    res.status(400).json({ error: 'LOG_DONATION_FAILED', message: err.message });
  }
});

// Digital Donor Card (FR-DON-005, Phase 5)
router.get('/digital-card', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const profile = db.prepare(`
      SELECT p.*, u.full_name, u.email
      FROM donor_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
    `).get(req.user.id);

    if (!profile) return res.status(404).json({ error: 'PROFILE_NOT_FOUND' });

    const count = db.prepare('SELECT COUNT(*) as c FROM donation_history WHERE donor_id = ?').get(req.user.id).c;
    const memberId = profile.member_id || `BL-MEM-${profile.user_id.replace(/^USR-/, '')}`;
    const qrCode = profile.qr_verification_code || `BL-VHASH-${Buffer.from(profile.user_id).toString('hex')}-2026`;

    res.json({
      donor_id: req.user.id,
      member_id: memberId,
      full_name: profile.full_name,
      blood_group: profile.blood_group,
      verification_status: profile.verification_status,
      total_lifetime_donations: count,
      milestone_badge: count >= 5 ? 'Gold Hero Donor' : count >= 3 ? 'Silver Community Guardian' : 'Bronze Contributor',
      address_locality: profile.address_locality,
      qr_verification_code: qrCode,
      qr_verification_hash: qrCode,
      verification_url: `/api/auth/verify-credential/${qrCode}`,
      card_issue_date: '2026-10-23',
      cooldown_status: 'CLEARED_ELIGIBLE'
    });
  } catch (err) {
    res.status(500).json({ error: 'DIGITAL_CARD_FAILED', message: err.message });
  }
});

// Credential Verification Route under /donors
router.get('/verify-credential/:code', (req, res) => {
  try {
    const AuthService = require('../services/authService');
    const result = AuthService.verifyCredential(req.params.code);
    if (!result.valid) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: 'VERIFICATION_ERROR', message: err.message });
  }
});

// Data Export JSON (Phase 20 / DPDP Right to Data Portability)
router.get('/export/json', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
    const profile = db.prepare('SELECT * FROM donor_profiles WHERE user_id = ?').get(req.user.id);
    const history = db.prepare('SELECT * FROM donation_history WHERE donor_id = ? ORDER BY donation_date DESC').all(req.user.id);

    const exportPayload = {
      export_timestamp: new Date().toISOString(),
      regulations: 'Digital Personal Data Protection Act 2023 / GDPR Article 20',
      data_controller: 'BloodLink 3.0 Clinical Authority',
      user_identity: user,
      donor_profile: profile,
      donation_history: history
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bloodlink-data-export-${req.user.id}.json"`);
    res.json(exportPayload);
  } catch (err) {
    res.status(500).json({ error: 'EXPORT_FAILED', message: err.message });
  }
});

// Data Export CSV (Phase 20)
router.get('/export/csv', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const history = db.prepare(`
      SELECT d.id, d.donation_date, d.blood_component, d.units_donated, d.hemoglobin_g_dl, d.certificate_hash, o.name as facility_name
      FROM donation_history d
      JOIN organizations o ON o.id = d.organization_id
      WHERE d.donor_id = ?
      ORDER BY d.donation_date DESC
    `).all(req.user.id);

    let csv = 'Donation ID,Date,Facility,Component,Units,Hemoglobin (g/dL),Certificate Hash\r\n';
    for (const h of history) {
      csv += `"${h.id}","${h.donation_date}","${h.facility_name}","${h.blood_component}",${h.units_donated},${h.hemoglobin_g_dl},"${h.certificate_hash}"\r\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bloodlink-donations-${req.user.id}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'EXPORT_CSV_FAILED', message: err.message });
  }
});

module.exports = router;
