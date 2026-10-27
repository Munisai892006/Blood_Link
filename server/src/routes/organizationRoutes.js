const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// ==========================================
// STATIC ADMIN ROUTES (Declared BEFORE /:id)
// ==========================================

// Admin System Overview Metrics (Phase 12)
router.get('/admin/overview', authenticateToken, requireRole('HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const donorCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'DONOR'").get().c;
    const verifiedDonors = db.prepare("SELECT COUNT(*) as c FROM donor_profiles WHERE verification_status = 'VERIFIED'").get().c;
    const hospitalCount = db.prepare("SELECT COUNT(*) as c FROM organizations WHERE type = 'HOSPITAL'").get().c;
    const bloodBankCount = db.prepare("SELECT COUNT(*) as c FROM organizations WHERE type = 'BLOOD_BANK'").get().c;
    const activeRequests = db.prepare("SELECT COUNT(*) as c FROM emergency_requests WHERE status IN ('PENDING_REVIEW', 'VERIFIED', 'MATCHING')").get().c;
    const pendingReviewRequests = db.prepare("SELECT COUNT(*) as c FROM emergency_requests WHERE status = 'PENDING_REVIEW'").get().c;
    const notificationFailures = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE delivery_status = 'FAILED'").get().c;
    const pendingTransfers = db.prepare("SELECT COUNT(*) as c FROM inventory_transfers WHERE status IN ('REQUESTED', 'APPROVED', 'DISPATCHED_IN_TRANSIT')").get().c;
    const inventoryExceptions = db.prepare("SELECT COUNT(*) as c FROM inventory_batches WHERE status IN ('QUARANTINED', 'EXPIRED')").get().c;

    res.json({
      total_users: totalUsers,
      donor_count: donorCount,
      verified_donors: verifiedDonors,
      hospital_count: hospitalCount,
      blood_bank_count: bloodBankCount,
      active_requests: activeRequests,
      pending_review_requests: pendingReviewRequests,
      notification_failures: notificationFailures,
      pending_transfers: pendingTransfers,
      inventory_exceptions: inventoryExceptions,
      system_status: 'OPERATIONAL',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'FETCH_ADMIN_OVERVIEW_FAILED', message: err.message });
  }
});

// Admin User Management: List and Filter Users (Phase 12)
router.get('/admin/users', authenticateToken, requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const { search = '', role = '', org = '' } = req.query;

    let query = `
      SELECT u.id, u.email, u.full_name, u.phone, u.role, u.organization_id,
             u.is_verified, COALESCE(u.is_active, 1) as is_active, u.created_at,
             o.name as organization_name, o.type as organization_type
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE 1=1
    `;
    const params = [];

    // Scope boundary: HOSPITAL_ADMIN can only view users in their own organization
    if (req.user.role === 'HOSPITAL_ADMIN') {
      query += ` AND u.organization_id = ?`;
      params.push(req.user.organization_id);
    } else if (org) {
      query += ` AND u.organization_id = ?`;
      params.push(org);
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.id LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY u.created_at DESC LIMIT 100`;

    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_USERS_FAILED', message: err.message });
  }
});

// Admin User Role Update (Phase 12)
router.post('/admin/users/:userId/role', authenticateToken, requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const { role } = req.body;
    const targetUserId = req.params.userId;

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    // Privilege escalation prevention
    if (req.user.role === 'HOSPITAL_ADMIN') {
      if (targetUser.organization_id !== req.user.organization_id) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'You may only manage users within your assigned facility.' });
      }
      if (['SYSTEM_ADMIN', 'EMERGENCY_COORDINATOR', 'VERIFICATION_REVIEWER', 'FRAUD_REVIEWER'].includes(role)) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Hospital administrators cannot grant system-level privileged roles.' });
      }
    }

    db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, targetUserId);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'USER_ROLE_UPDATED',
      entityType: 'USER',
      entityId: targetUserId,
      details: { previous_role: targetUser.role, new_role: role }
    });

    res.json({ success: true, message: `User role updated to ${role}.` });
  } catch (err) {
    res.status(400).json({ error: 'ROLE_UPDATE_FAILED', message: err.message });
  }
});

// Admin User Activation / Suspension Toggle (Phase 12)
router.post('/admin/users/:userId/status', authenticateToken, requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const targetUserId = req.params.userId;

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    if (req.user.role === 'HOSPITAL_ADMIN' && targetUser.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot manage accounts outside your hospital.' });
    }

    const newStatus = targetUser.is_active === 0 ? 1 : 0;
    db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, targetUserId);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: newStatus === 1 ? 'USER_ACCOUNT_ACTIVATED' : 'USER_ACCOUNT_SUSPENDED',
      entityType: 'USER',
      entityId: targetUserId,
      details: { new_status: newStatus }
    });

    res.json({ success: true, is_active: newStatus, message: `Account has been ${newStatus === 1 ? 'activated' : 'suspended'}.` });
  } catch (err) {
    res.status(400).json({ error: 'STATUS_UPDATE_FAILED', message: err.message });
  }
});

// Admin Audit Logs Query (Phase 12)
router.get('/admin/audit-logs', authenticateToken, requireRole('EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const { entity = '', limit = 50 } = req.query;

    let query = `
      SELECT a.*, u.full_name as actor_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_id
      WHERE 1=1
    `;
    const params = [];
    if (entity) {
      query += ` AND a.entity_type = ?`;
      params.push(entity);
    }
    query += ` ORDER BY a.created_at DESC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_AUDIT_LOGS_FAILED', message: err.message });
  }
});

// ==========================================
// GENERAL & FACILITY ROUTES
// ==========================================

// List Organizations
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const orgs = db.prepare(`
      SELECT o.*,
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as staff_count,
        (SELECT COALESCE(SUM(units_available), 0) FROM inventory_batches WHERE organization_id = o.id AND status = 'AVAILABLE') as available_units
      FROM organizations o
      ORDER BY o.name ASC
    `).all();
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_ORGS_FAILED', message: err.message });
  }
});

// Create New Hospital / Blood Bank Facility (Phase 12)
router.post('/', authenticateToken, requireRole('SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const { name, type = 'HOSPITAL', license_number, address, latitude, longitude, contact_email, contact_phone } = req.body;

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ error: 'VALIDATION_FAILED', message: 'Name, address, latitude, and longitude are required.' });
    }

    const prefix = type === 'BLOOD_BANK' ? 'ORG-BANK-' : 'ORG-HOSP-';
    const id = prefix + Math.floor(10 + Math.random() * 90);

    db.prepare(`
      INSERT INTO organizations (
        id, name, type, license_number, address, latitude, longitude,
        contact_email, contact_phone, verification_status, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', 1)
    `).run(id, name, type, license_number || null, address, parseFloat(latitude), parseFloat(longitude), contact_email || null, contact_phone || null);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ORGANIZATION_CREATED',
      entityType: 'ORGANIZATION',
      entityId: id,
      details: { name, type, address }
    });

    res.status(201).json({ success: true, id, message: `Facility ${name} registered successfully.` });
  } catch (err) {
    res.status(400).json({ error: 'CREATE_ORG_FAILED', message: err.message });
  }
});

// Get Organization Detail
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
    if (!org) return res.status(404).json({ error: 'NOT_FOUND' });

    const members = db.prepare('SELECT id, full_name, email, role, phone, is_verified, COALESCE(is_active, 1) as is_active FROM users WHERE organization_id = ?').all(req.params.id);
    const stock = db.prepare('SELECT blood_group, blood_component, SUM(units_available) as units FROM inventory_batches WHERE organization_id = ? AND status = "AVAILABLE" GROUP BY blood_group, blood_component').all(req.params.id);

    res.json({ ...org, members, stock });
  } catch (err) {
    res.status(500).json({ error: 'FETCH_ORG_FAILED', message: err.message });
  }
});

// Update Organization Details (Phase 12)
router.put('/:id', authenticateToken, requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const orgId = req.params.id;

    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Unauthorized to modify another facility.' });
    }

    const { name, address, latitude, longitude, contact_email, contact_phone, license_number } = req.body;

    db.prepare(`
      UPDATE organizations SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        license_number = COALESCE(?, license_number)
      WHERE id = ?
    `).run(name, address, latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null, contact_email, contact_phone, license_number, orgId);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ORGANIZATION_UPDATED',
      entityType: 'ORGANIZATION',
      entityId: orgId,
      details: { name, address }
    });

    res.json({ success: true, message: 'Facility details updated.' });
  } catch (err) {
    res.status(400).json({ error: 'UPDATE_ORG_FAILED', message: err.message });
  }
});

// Toggle Organization Active Status (Phase 12)
router.post('/:id/toggle-status', authenticateToken, requireRole('SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const org = db.prepare('SELECT is_active FROM organizations WHERE id = ?').get(req.params.id);
    if (!org) return res.status(404).json({ error: 'NOT_FOUND' });

    const newActive = org.is_active === 0 ? 1 : 0;
    db.prepare('UPDATE organizations SET is_active = ? WHERE id = ?').run(newActive, req.params.id);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: newActive === 1 ? 'ORGANIZATION_ACTIVATED' : 'ORGANIZATION_DEACTIVATED',
      entityType: 'ORGANIZATION',
      entityId: req.params.id,
      details: { is_active: newActive }
    });

    res.json({ success: true, is_active: newActive });
  } catch (err) {
    res.status(400).json({ error: 'TOGGLE_ORG_STATUS_FAILED', message: err.message });
  }
});

// View Hospital Request History (Phase 12)
router.get('/:id/requests', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const orgId = req.params.id;

    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Unauthorized to view records of another facility.' });
    }

    const requests = db.prepare(`
      SELECT r.*, u.full_name as requester_name
      FROM emergency_requests r
      JOIN users u ON u.id = r.requester_id
      WHERE r.organization_id = ?
      ORDER BY r.created_at DESC
    `).all(orgId);

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'FETCH_ORG_REQUESTS_FAILED', message: err.message });
  }
});

// Add Staff Member to Organization (FR-ORG-003)
router.post('/:id/members', authenticateToken, requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const { full_name, email, role, phone } = req.body;
    const orgId = req.params.id;

    if (req.user.role === 'HOSPITAL_ADMIN' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'You may only add staff to your own facility.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'USER_EXISTS', message: 'A user with this email already exists.' });
    }

    const userId = 'USR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4);
    const bcrypt = require('bcryptjs');
    const defaultPassword = bcrypt.hashSync('Password@123', 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, organization_id, is_verified, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(userId, email.toLowerCase().trim(), defaultPassword, full_name, phone, role, orgId);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ORGANIZATION_MEMBER_ADDED',
      entityType: 'ORGANIZATION',
      entityId: orgId,
      details: { memberId: userId, email, role }
    });

    res.status(201).json({ success: true, member_id: userId, message: `Staff member ${full_name} added to facility.` });
  } catch (err) {
    res.status(400).json({ error: 'ADD_MEMBER_FAILED', message: err.message });
  }
});

// Verify Organization (FR-ORG-002)
router.post('/:id/verify', authenticateToken, requireRole('VERIFICATION_REVIEWER', 'SYSTEM_ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const { status = 'VERIFIED' } = req.body;

    db.prepare(`
      UPDATE organizations
      SET verification_status = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, req.user.id, req.params.id);

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ORGANIZATION_VERIFIED',
      entityType: 'ORGANIZATION',
      entityId: req.params.id,
      details: { status }
    });

    res.json({ success: true, status });
  } catch (err) {
    res.status(400).json({ error: 'VERIFY_ORG_FAILED', message: err.message });
  }
});

module.exports = router;
