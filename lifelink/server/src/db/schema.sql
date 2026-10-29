-- =====================================================================
-- BLOODLINK 3.0 RELATIONAL DATABASE SCHEMA (ACID Compliant)
-- Meets SRS v1.0 specifications for Identity, Requests, Matching,
-- Inventory, Incidents, Fraud, Simulations, and Auditing.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- 1. Organizations (Hospitals, Blood Banks, Partners)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('HOSPITAL', 'BLOOD_BANK', 'PARTNER')),
    license_number TEXT,
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by TEXT,
    verified_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (10 RBAC User Classes)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN (
        'PUBLIC_VISITOR',
        'DONOR',
        'HOSPITAL_REQUESTER',
        'HOSPITAL_ADMIN',
        'BLOOD_BANK_OPERATOR',
        'VERIFICATION_REVIEWER',
        'EMERGENCY_COORDINATOR',
        'VOLUNTEER',
        'FRAUD_REVIEWER',
        'SYSTEM_ADMIN'
    )),
    organization_id TEXT,
    is_verified INTEGER DEFAULT 0,
    mfa_enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
);

-- 3. Donor Profiles
CREATE TABLE IF NOT EXISTS donor_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    date_of_birth TEXT,
    gender TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address_locality TEXT,
    availability_status TEXT DEFAULT 'AVAILABLE' CHECK(availability_status IN ('AVAILABLE', 'PAUSED', 'BUSY', 'INELIGIBLE_TEMPORARY')),
    quiet_hours_start TEXT DEFAULT '22:00',
    quiet_hours_end TEXT DEFAULT '07:00',
    preferred_language TEXT DEFAULT 'en' CHECK(preferred_language IN ('en', 'te', 'hi')),
    consent_emergency_alerts INTEGER DEFAULT 1,
    consent_data_sharing INTEGER DEFAULT 1,
    last_donation_date TEXT,
    verification_status TEXT DEFAULT 'SELF_DECLARED' CHECK(verification_status IN ('SELF_DECLARED', 'VERIFIED', 'REJECTED')),
    verified_by TEXT,
    verified_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Emergency Blood Requests
CREATE TABLE IF NOT EXISTS emergency_requests (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    patient_reference TEXT,
    blood_component TEXT NOT NULL CHECK(blood_component IN ('WHOLE_BLOOD', 'RED_BLOOD_CELLS', 'PLATELETS', 'FRESH_FROZEN_PLASMA', 'CRYOPRECIPITATE')),
    blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_requested INTEGER NOT NULL CHECK(units_requested > 0),
    units_fulfilled INTEGER DEFAULT 0 CHECK(units_fulfilled >= 0),
    urgency_level TEXT NOT NULL CHECK(urgency_level IN ('NORMAL', 'URGENT', 'CRITICAL_EMERGENCY')),
    clinical_justification TEXT,
    hospital_department TEXT,
    delivery_latitude REAL NOT NULL,
    delivery_longitude REAL NOT NULL,
    delivery_address TEXT NOT NULL,
    required_by TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING_REVIEW' CHECK(status IN (
        'DRAFT',
        'PENDING_REVIEW',
        'VERIFIED',
        'MATCHING',
        'PARTIALLY_FULFILLED',
        'FULFILLED',
        'CANCELLED',
        'EXPIRED',
        'REJECTED'
    )),
    verified_by TEXT,
    verified_at TEXT,
    cancellation_reason TEXT,
    is_synthetic INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Request Candidate Matches (Geographic Escalation Stages)
CREATE TABLE IF NOT EXISTS request_matches (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    donor_id TEXT NOT NULL,
    stage INTEGER NOT NULL CHECK(stage IN (1, 2, 3, 4)),
    distance_km REAL NOT NULL,
    outreach_status TEXT DEFAULT 'NOTIFIED' CHECK(outreach_status IN ('PENDING', 'NOTIFIED', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    response_timestamp TEXT,
    notes TEXT,
    review_status TEXT DEFAULT 'PENDING_REVIEW' CHECK(review_status IN ('PENDING_REVIEW', 'SELECTED_FOR_COORDINATION', 'DECLINED_BY_HOSPITAL', 'FOLLOW_UP_REQUESTED')),
    reviewed_by TEXT,
    reviewed_at TEXT,
    review_notes TEXT,
    collection_confirmed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(request_id, donor_id),
    FOREIGN KEY (request_id) REFERENCES emergency_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Inventory Batches
CREATE TABLE IF NOT EXISTS inventory_batches (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    blood_component TEXT NOT NULL CHECK(blood_component IN ('WHOLE_BLOOD', 'RED_BLOOD_CELLS', 'PLATELETS', 'FRESH_FROZEN_PLASMA', 'CRYOPRECIPITATE')),
    blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_total INTEGER NOT NULL CHECK(units_total >= 0),
    units_available INTEGER NOT NULL CHECK(units_available >= 0),
    units_reserved INTEGER DEFAULT 0 CHECK(units_reserved >= 0),
    collection_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'RESERVED', 'QUARANTINED', 'EXPIRED', 'RELEASED')),
    storage_location TEXT,
    confirmed_by_facility INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 7. Inventory Transactions (Auditable Ledger)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    request_id TEXT,
    actor_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('RECEIPT', 'RESERVATION', 'RELEASE', 'TRANSFER', 'ADJUSTMENT', 'DISCARD')),
    quantity INTEGER NOT NULL,
    previous_available INTEGER NOT NULL,
    new_available INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES emergency_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('IN_APP', 'SMS', 'EMAIL', 'PUSH')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata TEXT,
    delivery_status TEXT DEFAULT 'SENT' CHECK(delivery_status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ')),
    attempt_count INTEGER DEFAULT 1,
    idempotency_key TEXT UNIQUE,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Incidents (Emergency Events)
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'CONTAINED', 'RESOLVED', 'CLOSED')),
    lead_coordinator_id TEXT,
    region TEXT,
    outcome_summary TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    FOREIGN KEY (lead_coordinator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Incident Tasks (Volunteer & Logistics assignments)
CREATE TABLE IF NOT EXISTS incident_tasks (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')),
    priority TEXT DEFAULT 'NORMAL' CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Fraud & Duplicate Flags
CREATE TABLE IF NOT EXISTS fraud_flags (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL CHECK(target_type IN ('REQUEST', 'DONOR', 'ORGANIZATION', 'ACTIVITY')),
    target_id TEXT NOT NULL,
    flag_reason TEXT NOT NULL,
    evidence_payload TEXT,
    status TEXT DEFAULT 'PENDING_REVIEW' CHECK(status IN ('PENDING_REVIEW', 'INVESTIGATING', 'DISMISSED', 'ACTION_TAKEN')),
    reviewed_by TEXT,
    review_notes TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 12. Digital Twin & Synthetic Simulations (Strictly Isolated)
CREATE TABLE IF NOT EXISTS simulations (
    id TEXT PRIMARY KEY,
    scenario_name TEXT NOT NULL,
    parameters TEXT NOT NULL,
    metrics TEXT NOT NULL,
    assumptions TEXT,
    created_by TEXT,
    is_synthetic INTEGER DEFAULT 1 CHECK(is_synthetic = 1),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. Audit Logs (Tamper-evident system activity)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 14. Confirmed Donation History & Certificates (FR-DON-005)
CREATE TABLE IF NOT EXISTS donation_history (
    id TEXT PRIMARY KEY,
    donor_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    donation_date TEXT NOT NULL,
    blood_component TEXT NOT NULL,
    units_donated INTEGER DEFAULT 1,
    hemoglobin_g_dl REAL,
    certificate_hash TEXT UNIQUE,
    verified_by TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 15. Inter-Facility Inventory Transfers (FR-INV-002)
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id TEXT PRIMARY KEY,
    source_org_id TEXT NOT NULL,
    destination_org_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    blood_component TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    status TEXT DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED', 'APPROVED', 'DISPATCHED_IN_TRANSIT', 'RECEIVED', 'REJECTED')),
    courier_name TEXT,
    courier_phone TEXT,
    departure_temperature_c REAL,
    arrival_temperature_c REAL,
    requested_by TEXT,
    dispatched_at TEXT,
    received_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_org_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE RESTRICT,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 16. Incident Timeline Events (FR-INC-001)
CREATE TABLE IF NOT EXISTS incident_events (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    event_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'UPDATE' CHECK(event_type IN ('ALERT', 'DISPATCH', 'TRIAGE', 'CASUALTY_UPDATE', 'HANDOFF', 'UPDATE')),
    actor_id TEXT,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 17. Cold-Chain Temperature Surveillance Logs (FR-VOL-002)
CREATE TABLE IF NOT EXISTS cold_chain_logs (
    id TEXT PRIMARY KEY,
    transfer_id TEXT,
    task_id TEXT,
    temperature_celsius REAL NOT NULL,
    ambient_celsius REAL,
    is_safe INTEGER DEFAULT 1, -- 1 if between 2C and 6C for RBC (or 20C-24C for platelets)
    recorded_by TEXT,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES incident_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 18. Privacy Rights & Data Deletion Requests (FR-PRV-002)
CREATE TABLE IF NOT EXISTS privacy_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK(request_type IN ('DATA_EXPORT', 'CORRECTION', 'DELETION')),
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSED', 'REJECTED_LEGAL_RETENTION')),
    reason TEXT,
    retention_justification TEXT,
    processed_by TEXT,
    processed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 19. Controlled Password Resets & Contact Verifications (FR-AUTH-003)
CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    is_used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 20. Request Lifecycle Events & Timeline (FR-REQ-007, SRS Section 2)
CREATE TABLE IF NOT EXISTS request_events (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    actor_id TEXT,
    actor_name TEXT,
    actor_role TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES emergency_requests(id) ON DELETE CASCADE
);

-- 21. Configurable Operational Acceptance-Time Targets (SRS Section 2)
CREATE TABLE IF NOT EXISTS sla_target_configs (
    stage_key TEXT PRIMARY KEY,
    stage_name TEXT NOT NULL,
    target_seconds INTEGER NOT NULL,
    start_trigger TEXT NOT NULL,
    stop_trigger TEXT NOT NULL,
    pause_trigger TEXT,
    description TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 22. Bedside Arrival & Clinical Crossmatch Verifications (FR-CLI-001, SRS Phase 7)
CREATE TABLE IF NOT EXISTS bedside_crossmatch_checks (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    unit_identifier TEXT NOT NULL,
    blood_component TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    manifest_reference TEXT,
    arrival_timestamp TEXT NOT NULL,
    responsible_clinician_id TEXT NOT NULL,
    responsible_clinician_name TEXT NOT NULL,
    identity_check_passed INTEGER NOT NULL DEFAULT 0,
    label_verification_passed INTEGER NOT NULL DEFAULT 0,
    crossmatch_result TEXT NOT NULL CHECK(crossmatch_result IN ('COMPATIBLE', 'INCOMPATIBLE', 'PENDING_LAB_CONFIRMATION', 'EMERGENCY_UN_CROSSMATCHED_RELEASE')),
    clinical_notes TEXT,
    exception_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES emergency_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (responsible_clinician_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Performance and Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_requests_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_org ON emergency_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status_exp ON inventory_batches(status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_group_comp ON inventory_batches(blood_group, blood_component);
CREATE INDEX IF NOT EXISTS idx_matches_req_stage ON request_matches(request_id, stage);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donation_history(donor_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inventory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_incident_events_inc ON incident_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_req_events_req ON request_events(request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_crossmatch_req ON bedside_crossmatch_checks(request_id);
