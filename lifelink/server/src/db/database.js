const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, 'bloodlink.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');

    // Run schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      dbInstance.exec(schemaSql);
    }

    // Safe migration: ensure new columns exist in request_matches
    try { dbInstance.prepare("ALTER TABLE request_matches ADD COLUMN review_status TEXT DEFAULT 'PENDING_REVIEW'").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE request_matches ADD COLUMN reviewed_by TEXT").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE request_matches ADD COLUMN reviewed_at TEXT").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE request_matches ADD COLUMN review_notes TEXT").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE request_matches ADD COLUMN collection_confirmed_at TEXT").run(); } catch (_) {}

    // Safe migration: donor_profiles consent tracking
    try { dbInstance.prepare("ALTER TABLE donor_profiles ADD COLUMN consent_policy_version TEXT DEFAULT 'v1.0'").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE donor_profiles ADD COLUMN consent_timestamp TEXT").run(); } catch (_) {}

    // Safe migration: organizations & users active flags
    try { dbInstance.prepare("ALTER TABLE organizations ADD COLUMN is_active INTEGER DEFAULT 1").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1").run(); } catch (_) {}

    // Safe migration: donor_profiles digital ID & verification code (Phase 5 & 6)
    try { dbInstance.prepare("ALTER TABLE donor_profiles ADD COLUMN member_id TEXT").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE donor_profiles ADD COLUMN qr_verification_code TEXT").run(); } catch (_) {}

    // Safe migration: emergency_requests public submission and tracking fields
    try { dbInstance.prepare("ALTER TABLE emergency_requests ADD COLUMN requester_name TEXT").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE emergency_requests ADD COLUMN requester_phone TEXT").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE emergency_requests ADD COLUMN requester_relationship TEXT").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE emergency_requests ADD COLUMN access_pin TEXT").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE emergency_requests ADD COLUMN is_public_submission INTEGER DEFAULT 0").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE emergency_requests ADD COLUMN verification_status TEXT DEFAULT 'PENDING_VERIFICATION'").run(); } catch (_) {}
    try { dbInstance.prepare("ALTER TABLE emergency_requests ADD COLUMN hospital_name TEXT").run(); } catch (_) {}

    // Populate any null member_id and qr_verification_code
    try {
      dbInstance.prepare(`
        UPDATE donor_profiles
        SET member_id = 'BL-MEM-' || SUBSTR(user_id, 5),
            qr_verification_code = 'BL-VHASH-' || LOWER(HEX(user_id)) || '-2026'
        WHERE member_id IS NULL OR qr_verification_code IS NULL
      `).run();
    } catch (_) {}
  }
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  getDb,
  closeDb
};
