-- ==============================================================================
-- LifeLink: Emergency Organ Donation Coordination & Transport Tracking Platform
-- Complete Canonical Relational Database Schema (MySQL 8.0 / MySQL Dialect)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS lifelink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lifelink_db;

-- ------------------------------------------------------------------------------
-- 1. HOSPITALS & CLINICAL INSTITUTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    hospital_type ENUM('GOVERNMENT', 'PRIVATE_TRUST', 'APEX_TRAUMA', 'TRANSPLANT_CENTER') NOT NULL DEFAULT 'TRANSPLANT_CENTER',
    license_number VARCHAR(100),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Telangana',
    postal_code VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    contact_email VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    emergency_helpline VARCHAR(50) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    transplant_capabilities TEXT, -- Comma-separated or JSON array (e.g. HEART,LIVER,KIDNEY,CORNEA)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hosp_city (city),
    INDEX idx_hosp_verified (is_verified)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 2. USERS, ROLES & ACCESS CONTROL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    role ENUM(
        'ADMINISTRATOR',
        'HOSPITAL_DOCTOR',
        'TRANSPLANT_COORDINATOR',
        'TRANSPORT_COORDINATOR',
        'DRIVER',
        'FINANCE_REVIEWER',
        'PUBLIC_VISITOR'
    ) NOT NULL DEFAULT 'PUBLIC_VISITOR',
    hospital_id VARCHAR(36),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 3. DONOR REFERRALS & CASE MANAGEMENT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donor_cases (
    id VARCHAR(36) PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    referring_hospital_id VARCHAR(36) NOT NULL,
    registered_by_user_id VARCHAR(36) NOT NULL,
    assigned_coordinator_id VARCHAR(36),
    incident_reference VARCHAR(100),
    patient_pseudo_id VARCHAR(100) NOT NULL, -- Anonymized clinical identifier
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    cause_of_death_category VARCHAR(150),
    referral_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    priority ENUM('STANDARD', 'URGENT', 'CRITICAL_TIMED') NOT NULL DEFAULT 'URGENT',
    workflow_status ENUM(
        'REFERRAL_RECEIVED',
        'HOSPITAL_VERIFICATION_PENDING',
        'CLINICAL_ASSESSMENT_IN_PROGRESS',
        'CONSENT_DOCUMENTATION_PENDING',
        'LEGAL_VERIFICATION_PENDING',
        'AUTHORIZED_COORDINATION_IN_PROGRESS',
        'TRANSPORT_PREPARATION',
        'COMPLETED',
        'CANCELLED',
        'CLOSED_BY_AUTHORIZED_PERSONNEL'
    ) NOT NULL DEFAULT 'REFERRAL_RECEIVED',
    clinical_notes TEXT,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_case_hosp FOREIGN KEY (referring_hospital_id) REFERENCES hospitals(id),
    CONSTRAINT fk_case_reg_user FOREIGN KEY (registered_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_case_coord_user FOREIGN KEY (assigned_coordinator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_case_status (workflow_status),
    INDEX idx_case_priority (priority),
    INDEX idx_case_hosp (referring_hospital_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 4. ORGAN & TISSUE SPECIFIC ASSESSMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organ_assessments (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL,
    organ_type ENUM(
        'HEART',
        'LUNGS_LEFT',
        'LUNGS_RIGHT',
        'LIVER',
        'KIDNEY_LEFT',
        'KIDNEY_RIGHT',
        'PANCREAS',
        'INTESTINE',
        'CORNEA_LEFT',
        'CORNEA_RIGHT'
    ) NOT NULL,
    assessment_status ENUM(
        'ASSESSMENT_PENDING',
        'UNDER_MEDICAL_EVALUATION',
        'SUITABLE',
        'NOT_SUITABLE',
        'ASSESSMENT_COMPLETED',
        'FURTHER_REVIEW_REQUIRED'
    ) NOT NULL DEFAULT 'ASSESSMENT_PENDING',
    clinical_findings TEXT,
    viability_notes TEXT,
    assessed_by_user_id VARCHAR(36),
    assessed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_organ_case FOREIGN KEY (case_id) REFERENCES donor_cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_organ_assessor FOREIGN KEY (assessed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_case_organ (case_id, organ_type),
    INDEX idx_organ_status (assessment_status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 5. CONSENT & LEGAL VERIFICATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_records (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) UNIQUE NOT NULL,
    consent_status ENUM(
        'NOT_STARTED',
        'DISCUSSION_IN_PROGRESS',
        'DOCUMENTATION_PENDING',
        'UNDER_REVIEW',
        'VERIFIED',
        'DECLINED',
        'REJECTED'
    ) NOT NULL DEFAULT 'NOT_STARTED',
    next_of_kin_relationship VARCHAR(100),
    consent_form_reference VARCHAR(150),
    witness_details TEXT,
    legal_clearance_status ENUM(
        'NOT_REQUIRED',
        'PENDING_NOC',
        'POLICE_NOC_VERIFIED',
        'FORENSIC_NOC_VERIFIED',
        'REJECTED'
    ) NOT NULL DEFAULT 'NOT_REQUIRED',
    verified_by_user_id VARCHAR(36),
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_consent_case FOREIGN KEY (case_id) REFERENCES donor_cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_consent_verifier FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_consent_status (consent_status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 6. MEDICAL CERTIFICATIONS (BRAIN-STEM DEATH FORM 8 & 10)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_certifications (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL,
    certification_type ENUM(
        'BRAIN_STEM_DEATH_FIRST',
        'BRAIN_STEM_DEATH_SECOND',
        'FORM_8_DECLARATION',
        'FORM_10_DECLARATION'
    ) NOT NULL,
    certified_by_doctor_name VARCHAR(150) NOT NULL,
    doctor_license_number VARCHAR(100) NOT NULL,
    certification_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cert_case FOREIGN KEY (case_id) REFERENCES donor_cases(id) ON DELETE CASCADE,
    INDEX idx_cert_case (case_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 7. DOCUMENTS & CLINICAL EVIDENCE ATTACHMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL,
    document_type ENUM(
        'CONSENT_FORM',
        'BRAIN_DEATH_CERT_1',
        'BRAIN_DEATH_CERT_2',
        'POLICE_NOC',
        'POSTMORTEM_REPORT',
        'TRANSPLANT_AUTH'
    ) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by_user_id VARCHAR(36) NOT NULL,
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    verified_by_user_id VARCHAR(36),
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doc_case FOREIGN KEY (case_id) REFERENCES donor_cases(id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_doc_verifier FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_doc_case (case_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 8. DRIVERS & FLEET VEHICLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(36) PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type ENUM('ORGAN_CARE_AMBULANCE', 'CRITICAL_CARE_ESCORT', 'MEDICAL_RAPID_RESPONSE') NOT NULL DEFAULT 'ORGAN_CARE_AMBULANCE',
    organization_name VARCHAR(150) NOT NULL,
    is_temperature_controlled BOOLEAN NOT NULL DEFAULT TRUE,
    gps_device_id VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS driver_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    transport_provider_name VARCHAR(150) NOT NULL,
    identity_verified BOOLEAN NOT NULL DEFAULT TRUE,
    active_vehicle_id VARCHAR(36),
    current_latitude DECIMAL(10, 6),
    current_longitude DECIMAL(10, 6),
    last_gps_ping_at TIMESTAMP NULL,
    is_on_duty BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_driver_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_driver_veh FOREIGN KEY (active_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 9. ORGAN TRANSPORT ASSIGNMENTS & LIVE TRACKING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transport_assignments (
    id VARCHAR(36) PRIMARY KEY,
    tracking_number VARCHAR(50) UNIQUE NOT NULL,
    case_id VARCHAR(36) NOT NULL,
    organ_type VARCHAR(50) NOT NULL,
    dispatch_hospital_id VARCHAR(36) NOT NULL,
    destination_hospital_id VARCHAR(36) NOT NULL,
    transport_provider VARCHAR(150) NOT NULL,
    assigned_driver_id VARCHAR(36),
    assigned_vehicle_id VARCHAR(36),
    authorization_reference VARCHAR(100) NOT NULL,
    dispatch_time TIMESTAMP NULL,
    estimated_arrival_time TIMESTAMP NULL,
    actual_arrival_time TIMESTAMP NULL,
    handover_time TIMESTAMP NULL,
    completion_time TIMESTAMP NULL,
    status ENUM(
        'ASSIGNMENT_CREATED',
        'AWAITING_DRIVER_ACCEPTANCE',
        'DRIVER_ASSIGNED',
        'READY_FOR_DISPATCH',
        'DISPATCHED',
        'IN_TRANSIT',
        'ROUTE_DISRUPTION_REPORTED',
        'ARRIVED_AT_DESTINATION',
        'HANDOVER_PENDING',
        'HANDOVER_CONFIRMED',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'ASSIGNMENT_CREATED',
    last_known_latitude DECIMAL(10, 6),
    last_known_longitude DECIMAL(10, 6),
    last_telemetry_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_trans_case FOREIGN KEY (case_id) REFERENCES donor_cases(id),
    CONSTRAINT fk_trans_disp_hosp FOREIGN KEY (dispatch_hospital_id) REFERENCES hospitals(id),
    CONSTRAINT fk_trans_dest_hosp FOREIGN KEY (destination_hospital_id) REFERENCES hospitals(id),
    CONSTRAINT fk_trans_driver FOREIGN KEY (assigned_driver_id) REFERENCES driver_profiles(id) ON DELETE SET NULL,
    CONSTRAINT fk_trans_vehicle FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    INDEX idx_trans_status (status),
    INDEX idx_trans_tracking (tracking_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS location_updates (
    id VARCHAR(36) PRIMARY KEY,
    transport_id VARCHAR(36) NOT NULL,
    driver_id VARCHAR(36) NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    speed_kmh DECIMAL(5, 2) DEFAULT 0.00,
    heading_deg DECIMAL(5, 2) DEFAULT 0.00,
    battery_pct INT DEFAULT 100,
    is_stale BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loc_trans FOREIGN KEY (transport_id) REFERENCES transport_assignments(id) ON DELETE CASCADE,
    INDEX idx_loc_trans (transport_id, recorded_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transport_status_history (
    id VARCHAR(36) PRIMARY KEY,
    transport_id VARCHAR(36) NOT NULL,
    status_from VARCHAR(50),
    status_to VARCHAR(50) NOT NULL,
    changed_by_user_id VARCHAR(36) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tsh_trans FOREIGN KEY (transport_id) REFERENCES transport_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsh_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS corridor_authorizations (
    id VARCHAR(36) PRIMARY KEY,
    transport_id VARCHAR(36) NOT NULL,
    request_reference VARCHAR(100) UNIQUE NOT NULL,
    requesting_authority VARCHAR(150) NOT NULL,
    jurisdiction_police_division VARCHAR(150) NOT NULL,
    route_description TEXT NOT NULL,
    approved_by_official VARCHAR(150),
    approval_status ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    approved_at TIMESTAMP NULL,
    valid_from TIMESTAMP NULL,
    valid_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_corr_trans FOREIGN KEY (transport_id) REFERENCES transport_assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transport_incidents (
    id VARCHAR(36) PRIMARY KEY,
    transport_id VARCHAR(36) NOT NULL,
    reported_by_user_id VARCHAR(36) NOT NULL,
    incident_type ENUM('TRAFFIC_GRIDLOCK', 'MECHANICAL_BREAKDOWN', 'ACCIDENT_DISRUPTION', 'WEATHER_HAZARD', 'ROUTE_DIVERSION') NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    delay_estimate_minutes INT NOT NULL DEFAULT 15,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    CONSTRAINT fk_inc_trans FOREIGN KEY (transport_id) REFERENCES transport_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_inc_user FOREIGN KEY (reported_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 10. TRANSPARENT MEDICAL LOGISTICS FUNDING & RECONCILIATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funding_campaigns (
    id VARCHAR(36) PRIMARY KEY,
    campaign_code VARCHAR(50) UNIQUE NOT NULL,
    case_id VARCHAR(36),
    receiving_hospital_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    purpose_category ENUM(
        'COLD_CHAIN_LOGISTICS',
        'ORGAN_CARE_TRANSPORT',
        'EMERGENCY_AMBULANCE_ESCORT',
        'RAPID_PRESERVATION_APPARATUS'
    ) NOT NULL,
    description TEXT NOT NULL,
    supporting_budget_url VARCHAR(500),
    approved_target_amount DECIMAL(12, 2) NOT NULL,
    current_confirmed_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    verified_expenses_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    refunded_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status ENUM(
        'DRAFT',
        'SUBMITTED_FOR_APPROVAL',
        'APPROVED_ACTIVE',
        'COMPLETED_RECONCILED',
        'CANCELLED',
        'REJECTED'
    ) NOT NULL DEFAULT 'APPROVED_ACTIVE',
    approved_by_user_id VARCHAR(36),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    last_reconciled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_camp_case FOREIGN KEY (case_id) REFERENCES donor_cases(id) ON DELETE SET NULL,
    CONSTRAINT fk_camp_hosp FOREIGN KEY (receiving_hospital_id) REFERENCES hospitals(id),
    CONSTRAINT fk_camp_approver FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_camp_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS funding_budgets (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    line_item_title VARCHAR(255) NOT NULL,
    budgeted_amount DECIMAL(12, 2) NOT NULL,
    vendor_quote_reference VARCHAR(100),
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_budget_camp FOREIGN KEY (campaign_id) REFERENCES funding_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contribution_transactions (
    id VARCHAR(36) PRIMARY KEY,
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    contributor_name VARCHAR(150) NOT NULL,
    contributor_email VARCHAR(150) NOT NULL,
    contributor_phone VARCHAR(50),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    payment_gateway VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    payment_status ENUM('PENDING', 'PAYMENT_CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    is_80g_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    receipt_reference VARCHAR(100) UNIQUE,
    receipt_hash VARCHAR(255),
    confirmed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contrib_camp FOREIGN KEY (campaign_id) REFERENCES funding_campaigns(id),
    INDEX idx_contrib_status (payment_status),
    INDEX idx_contrib_ref (transaction_reference)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expense_records (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    vendor_name VARCHAR(150) NOT NULL,
    expense_title VARCHAR(255) NOT NULL,
    expense_category VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    supporting_doc_url VARCHAR(500),
    submitted_by_user_id VARCHAR(36) NOT NULL,
    verified_by_user_id VARCHAR(36),
    verification_status ENUM('SUBMITTED', 'UNDER_VERIFICATION', 'VERIFIED_APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exp_camp FOREIGN KEY (campaign_id) REFERENCES funding_campaigns(id),
    CONSTRAINT fk_exp_submitter FOREIGN KEY (submitted_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_exp_verifier FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_exp_status (verification_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS financial_reconciliations (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    reconciled_by_user_id VARCHAR(36) NOT NULL,
    total_contributions_received DECIMAL(12, 2) NOT NULL,
    total_expenses_approved DECIMAL(12, 2) NOT NULL,
    available_balance DECIMAL(12, 2) NOT NULL,
    remaining_requirement DECIMAL(12, 2) NOT NULL,
    discrepancy_notes TEXT,
    status ENUM('BALANCED', 'SURPLUS_REALLOCATION_PENDING', 'DEFICIT_NOTED', 'AUDITED_CLOSED') NOT NULL DEFAULT 'BALANCED',
    reconciled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recon_camp FOREIGN KEY (campaign_id) REFERENCES funding_campaigns(id),
    CONSTRAINT fk_recon_user FOREIGN KEY (reconciled_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS receipts (
    id VARCHAR(36) PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_id VARCHAR(36) UNIQUE NOT NULL,
    contributor_masked_name VARCHAR(150) NOT NULL,
    receiving_hospital_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    purpose VARCHAR(255) NOT NULL,
    receipt_hash VARCHAR(255) UNIQUE NOT NULL,
    issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_revoked_or_voided BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_receipt_tx FOREIGN KEY (transaction_id) REFERENCES contribution_transactions(id) ON DELETE CASCADE,
    INDEX idx_receipt_hash (receipt_hash)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 11. IN-APP NOTIFICATIONS & AUDIT HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    recipient_user_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('CASE_UPDATE', 'ASSESSMENT_UPDATE', 'TRANSPORT_ALERT', 'DOCUMENT_REQUIRED', 'FUNDING_UPDATE') NOT NULL,
    reference_id VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (recipient_user_id, is_read)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_user_id VARCHAR(36),
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    ip_address VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_action (action)
) ENGINE=InnoDB;
