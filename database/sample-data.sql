-- ==============================================================================
-- LifeLink: Fictional Demonstration Sample Data (MySQL 8.0 Compatible)
-- Strictly Fictional Records for Academic / Demonstration Compliance
-- All Passwords: "Password@123" (BCrypt: $2a$10$fG6a1O8K5zZ9q.F2e1yQ0uTzM3oB4a7s8d9f0g1h2j3k4l5m6n7o)
-- ==============================================================================

USE lifelink_db;

-- ------------------------------------------------------------------------------
-- 1. ACCREDITED HOSPITALS & TRANSPLANT CENTERS (TELANGANA & HYDERABAD REGION)
-- ------------------------------------------------------------------------------
INSERT INTO hospitals (id, name, code, hospital_type, license_number, address, city, state, postal_code, latitude, longitude, contact_email, contact_phone, emergency_helpline, is_verified, is_active, transplant_capabilities)
VALUES 
('HOSP-NIMS-01', 'Nizam''s Institute of Medical Sciences (NIMS)', 'NIMS-HYD-01', 'APEX_TRAUMA', 'NOTTO-APEX-TS-001', 'Punjagutta Main Road', 'Hyderabad', 'Telangana', '500082', 17.422200, 78.452600, 'transplant.apex@nims.edu.in', '+91-40-23489000', '1800-425-6467', TRUE, TRUE, 'HEART,LIVER,KIDNEY,CORNEA,PANCREAS'),
('HOSP-APOLLO-02', 'Apollo Health City Multi-Organ Transplant Hospital', 'APOLLO-JUB-02', 'TRANSPLANT_CENTER', 'NOTTO-TC-TS-044', 'Road No. 72, Film Nagar, Jubilee Hills', 'Hyderabad', 'Telangana', '500096', 17.416800, 78.412400, 'organ.care@apollohospitals.com', '+91-40-23607777', '1066', TRUE, TRUE, 'HEART,LUNGS_LEFT,LUNGS_RIGHT,LIVER,KIDNEY_LEFT,KIDNEY_RIGHT,PANCREAS,CORNEA_LEFT,CORNEA_RIGHT'),
('HOSP-YASHODA-03', 'Yashoda Super Specialty Hospital & Trauma Bay', 'YASH-SEC-03', 'TRANSPLANT_CENTER', 'NOTTO-TC-TS-072', 'Alexander Road, Secunderabad', 'Secunderabad', 'Telangana', '500003', 17.439900, 78.498300, 'emergency.transplant@yashodamail.com', '+91-40-45674567', '040-27713333', TRUE, TRUE, 'HEART,LIVER,KIDNEY_LEFT,KIDNEY_RIGHT'),
('HOSP-KIMS-04', 'Krishna Institute of Medical Sciences (KIMS)', 'KIMS-SEC-04', 'TRANSPLANT_CENTER', 'NOTTO-TC-TS-089', '1-8-31/1, Minister Road', 'Secunderabad', 'Telangana', '500003', 17.437500, 78.484200, 'organ.transplant@kimshospitals.com', '+91-40-44885000', '040-44885100', TRUE, TRUE, 'HEART,LUNGS_LEFT,LUNGS_RIGHT,LIVER,KIDNEY_LEFT,KIDNEY_RIGHT'),
('HOSP-GANDHI-05', 'Gandhi Memorial Government General Hospital', 'GANDHI-GOV-05', 'GOVERNMENT', 'NOTTO-GOV-TS-012', 'Musheerabad', 'Secunderabad', 'Telangana', '500003', 17.424300, 78.503300, 'medical.superintendent@gandhihosp.gov.in', '+91-40-27505566', '108', TRUE, TRUE, 'KIDNEY,CORNEA,LIVER');

-- ------------------------------------------------------------------------------
-- 2. USERS ACROSS ALL 7 LIFE-LINK ROLES
-- Password for all seed users: Password@123
-- BCrypt: $2a$10$wB5WcEqp4v1O9s3Y1m3DheJ5Y5N6Z6e5O3A9I1K5L4M3N2O1P0Q2a
-- ------------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, full_name, phone, role, hospital_id, is_active)
VALUES
('USR-ADMIN-01', 'admin@lifelink.org', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Dr. Radhakrishnan Pillai', '+91-9849011111', 'ADMINISTRATOR', 'HOSP-NIMS-01', TRUE),
('USR-DOC-NIMS-01', 'doctor.sharma@nims.org', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Dr. Arvind Sharma (Critical Care)', '+91-9849022222', 'HOSPITAL_DOCTOR', 'HOSP-NIMS-01', TRUE),
('USR-DOC-APOLLO-02', 'doctor.verma@apollo.org', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Dr. Priya Verma (Neuro-Trauma)', '+91-9849033333', 'HOSPITAL_DOCTOR', 'HOSP-APOLLO-02', TRUE),
('USR-COORD-01', 'coord.ananya@lifelink.org', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Ananya Deshmukh (Lead Coordinator)', '+91-9849044444', 'TRANSPLANT_COORDINATOR', 'HOSP-NIMS-01', TRUE),
('USR-TRP-COORD-01', 'transport.karthik@lifelink.org', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Karthik Raman (Disaster Logistics)', '+91-9849055555', 'TRANSPORT_COORDINATOR', 'HOSP-NIMS-01', TRUE),
('USR-DRV-01', 'driver.ramesh@lifelink.org', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Ramesh Yadav (Certified Escort Driver)', '+91-9849066666', 'DRIVER', 'HOSP-NIMS-01', TRUE),
('USR-DRV-02', 'driver.suresh@lifelink.org', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Suresh Reddy (Rapid Care Driver)', '+91-9849077777', 'DRIVER', 'HOSP-APOLLO-02', TRUE),
('USR-FIN-01', 'finance.meera@lifelink.org', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Meera Iyer (Compliance & Finance Reviewer)', '+91-9849088888', 'FINANCE_REVIEWER', 'HOSP-NIMS-01', TRUE),
('USR-PUB-01', 'visitor.vikram@gmail.com', '$2a$10$7Z8q2qN54yRz9G4u1jK0le9gWj0Rz2D1T6yX1q7hK1Rz2D1T6yX1q', 'Vikramaditya Rao (Public Donor)', '+91-9849099999', 'PUBLIC_VISITOR', NULL, TRUE);

-- ------------------------------------------------------------------------------
-- 3. FLEET VEHICLES & DRIVER PROFILES
-- ------------------------------------------------------------------------------
INSERT INTO vehicles (id, registration_number, vehicle_type, organization_name, is_temperature_controlled, gps_device_id, is_active)
VALUES
('VEH-01', 'TS-09-UB-7701', 'ORGAN_CARE_AMBULANCE', 'NIMS Emergency Fleet Wing', TRUE, 'GPS-EMERG-7701', TRUE),
('VEH-02', 'TS-09-UB-8802', 'CRITICAL_CARE_ESCORT', 'Apollo Green Corridor Division', TRUE, 'GPS-EMERG-8802', TRUE),
('VEH-03', 'TS-10-TR-9903', 'MEDICAL_RAPID_RESPONSE', 'Telangana Trauma Care Society', TRUE, 'GPS-EMERG-9903', TRUE);

INSERT INTO driver_profiles (id, user_id, license_number, license_expiry, transport_provider_name, identity_verified, active_vehicle_id, current_latitude, current_longitude, last_gps_ping_at, is_on_duty)
VALUES
('DRV-01', 'USR-DRV-01', 'DL-TS-09-2018-998811', '2030-05-15', 'Telangana State Medical Escort Authority', TRUE, 'VEH-01', 17.422200, 78.452600, NOW(), TRUE),
('DRV-02', 'USR-DRV-02', 'DL-TS-09-2020-445566', '2032-11-20', 'Apollo Emergency Transit Services', TRUE, 'VEH-02', 17.416800, 78.412400, NOW(), TRUE);

-- ------------------------------------------------------------------------------
-- 4. DONOR REFERRALS & CASE RECORDS
-- ------------------------------------------------------------------------------
INSERT INTO donor_cases (id, case_number, referring_hospital_id, registered_by_user_id, assigned_coordinator_id, incident_reference, patient_pseudo_id, age, gender, blood_group, cause_of_death_category, referral_time, priority, workflow_status, clinical_notes, is_synthetic)
VALUES
('CASE-2026-001', 'LL-CASE-2026-001', 'HOSP-NIMS-01', 'USR-DOC-NIMS-01', 'USR-COORD-01', 'INC-HYD-TRAUMA-991', 'SYN-PAT-78101', 34, 'Male', 'O+', 'Severe Traumatic Brain Injury (Road Accident)', NOW() - INTERVAL 12 HOUR, 'CRITICAL_TIMED', 'AUTHORIZED_COORDINATION_IN_PROGRESS', 'Reflexes absent; apnea test positive; family counselled by medical social worker.', TRUE),
('CASE-2026-002', 'LL-CASE-2026-002', 'HOSP-APOLLO-02', 'USR-DOC-APOLLO-02', 'USR-COORD-01', 'INC-MED-NEURO-112', 'SYN-PAT-44203', 46, 'Female', 'A+', 'Massive Intracranial Hemorrhage', NOW() - INTERVAL 6 HOUR, 'URGENT', 'CLINICAL_ASSESSMENT_IN_PROGRESS', 'Second apnea test scheduled in 2 hours; echocardiogram demonstrates 60% LVEF.', TRUE),
('CASE-2026-003', 'LL-CASE-2026-003', 'HOSP-YASHODA-03', 'USR-DOC-NIMS-01', 'USR-COORD-01', 'INC-SEC-CARD-084', 'SYN-PAT-99104', 28, 'Male', 'B+', 'Cerebrovascular Accident with Brainstem Infarct', NOW() - INTERVAL 2 HOUR, 'STANDARD', 'REFERRAL_RECEIVED', 'Initial hospital referral logged; awaiting formal clinical bedside review.', TRUE);

-- ------------------------------------------------------------------------------
-- 5. ORGAN ASSESSMENTS FOR CASE-2026-001
-- ------------------------------------------------------------------------------
INSERT INTO organ_assessments (id, case_id, organ_type, assessment_status, clinical_findings, viability_notes, assessed_by_user_id, assessed_at)
VALUES
('ASSESS-01-HEART', 'CASE-2026-001', 'HEART', 'SUITABLE', 'Normal coronary anatomy on angiogram; LVEF 65%; no structural abnormalities.', 'Warm ischemia tolerance window: 4 hours. Ready for cardiothoracic retrieval.', 'USR-DOC-NIMS-01', NOW() - INTERVAL 4 HOUR),
('ASSESS-01-LIVER', 'CASE-2026-001', 'LIVER', 'SUITABLE', 'LFT enzymes baseline; macrovesicular steatosis < 5%; biopsy clear.', 'Optimal graft function anticipated. Target retrieval within 8 hours.', 'USR-DOC-NIMS-01', NOW() - INTERVAL 4 HOUR),
('ASSESS-01-KIDNEY-L', 'CASE-2026-001', 'KIDNEY_LEFT', 'SUITABLE', 'Serum creatinine 0.9 mg/dL; clear corticomedullary differentiation on ultrasound.', 'Good urine output maintained; suitable for standard criteria recipient.', 'USR-DOC-NIMS-01', NOW() - INTERVAL 3 HOUR),
('ASSESS-01-KIDNEY-R', 'CASE-2026-001', 'KIDNEY_RIGHT', 'SUITABLE', 'Normal anatomy, single renal artery and vein; excellent perfusion.', 'Cold-storage preservation apparatus ready.', 'USR-DOC-NIMS-01', NOW() - INTERVAL 3 HOUR),
('ASSESS-01-LUNGS-L', 'CASE-2026-001', 'LUNGS_LEFT', 'FURTHER_REVIEW_REQUIRED', 'Mild right basal atelectasis; PaO2/FiO2 ratio 340.', 'Recommend bronchoscopy clearance before confirmation.', 'USR-DOC-NIMS-01', NOW() - INTERVAL 2 HOUR),
('ASSESS-01-CORNEA-L', 'CASE-2026-001', 'CORNEA_LEFT', 'SUITABLE', 'Clear optical media; endothelial count > 2400 cells/mm2.', 'Eligible for therapeutic optical keratoplasty.', 'USR-DOC-NIMS-01', NOW() - INTERVAL 2 HOUR),
('ASSESS-01-CORNEA-R', 'CASE-2026-001', 'CORNEA_RIGHT', 'SUITABLE', 'Clear optical media; endothelial count > 2400 cells/mm2.', 'Eligible for therapeutic optical keratoplasty.', 'USR-DOC-NIMS-01', NOW() - INTERVAL 2 HOUR);

-- ------------------------------------------------------------------------------
-- 6. CONSENT & MEDICAL CERTIFICATIONS FOR CASE-2026-001
-- ------------------------------------------------------------------------------
INSERT INTO consent_records (id, case_id, consent_status, next_of_kin_relationship, consent_form_reference, witness_details, legal_clearance_status, verified_by_user_id, verified_at)
VALUES
('CONS-01', 'CASE-2026-001', 'VERIFIED', 'Spouse (Wife)', 'FORM-6-NOTTO-2026-0881', 'Dr. Ramesh Chandra (MSW) & Adv. K. Srinivas (Hospital Legal Liaison)', 'POLICE_NOC_VERIFIED', 'USR-COORD-01', NOW() - INTERVAL 5 HOUR);

INSERT INTO medical_certifications (id, case_id, certification_type, certified_by_doctor_name, doctor_license_number, certification_timestamp, is_verified, notes)
VALUES
('CERT-01', 'CASE-2026-001', 'BRAIN_STEM_DEATH_FIRST', 'Dr. Arvind Sharma (Critical Care)', 'MCI-TS-2010-44910', NOW() - INTERVAL 10 HOUR, TRUE, 'First apnea test documented; cranial nerve reflexes entirely absent.'),
('CERT-02', 'CASE-2026-001', 'BRAIN_STEM_DEATH_SECOND', 'Dr. Suresh Babu (Senior Neurologist)', 'MCI-TS-2005-11029', NOW() - INTERVAL 4 HOUR, TRUE, 'Second clinical evaluation confirmed irreversible cessation of all brain stem functions.'),
('CERT-03', 'CASE-2026-001', 'FORM_8_DECLARATION', 'Dr. Arvind Sharma (Intensivist)', 'MCI-TS-2010-44910', NOW() - INTERVAL 4 HOUR, TRUE, 'Form 8 (Declaration of Brain-Stem Death) signed by four authorized medical practitioners.');

-- ------------------------------------------------------------------------------
-- 7. TRANSPORT ASSIGNMENT & GREEN CORRIDOR FOR CASE-2026-001
-- ------------------------------------------------------------------------------
INSERT INTO transport_assignments (id, tracking_number, case_id, organ_type, dispatch_hospital_id, destination_hospital_id, transport_provider, assigned_driver_id, assigned_vehicle_id, authorization_reference, dispatch_time, estimated_arrival_time, status, last_known_latitude, last_known_longitude, last_telemetry_at)
VALUES
('TRP-2026-001', 'LL-TRP-2026-001', 'CASE-2026-001', 'HEART', 'HOSP-NIMS-01', 'HOSP-APOLLO-02', 'Telangana State Medical Escort Authority', 'DRV-01', 'VEH-01', 'NOTTO-CORR-TS-2026-8841', NOW() - INTERVAL 18 MINUTE, NOW() + INTERVAL 12 MINUTE, 'IN_TRANSIT', 17.420500, 78.435000, NOW());

INSERT INTO corridor_authorizations (id, transport_id, request_reference, requesting_authority, jurisdiction_police_division, route_description, approved_by_official, approval_status, approved_at, valid_from, valid_until)
VALUES
('CORR-01', 'TRP-2026-001', 'REQ-HYD-TRAFFIC-GC-001', 'NIMS Hospital Medical Director', 'Hyderabad Traffic Police (West & Central Zones)', 'NIMS Punjagutta -> Panjagutta Circle -> KBR Park Road -> Jubilee Hills Checkpost -> Apollo Health City Road 72 (Distance: 7.8 km)', 'DCP Traffic (West Zone), Hyderabad City', 'APPROVED', NOW() - INTERVAL 1 HOUR, NOW() - INTERVAL 30 MINUTE, NOW() + INTERVAL 90 MINUTE);

INSERT INTO location_updates (id, transport_id, driver_id, latitude, longitude, speed_kmh, heading_deg, battery_pct, recorded_at)
VALUES
('LOC-01', 'TRP-2026-001', 'DRV-01', 17.422200, 78.452600, 0.00, 270.00, 98, NOW() - INTERVAL 18 MINUTE),
('LOC-02', 'TRP-2026-001', 'DRV-01', 17.421500, 78.448000, 52.00, 265.00, 97, NOW() - INTERVAL 12 MINUTE),
('LOC-03', 'TRP-2026-001', 'DRV-01', 17.420800, 78.441000, 58.50, 260.00, 96, NOW() - INTERVAL 6 MINUTE),
('LOC-04', 'TRP-2026-001', 'DRV-01', 17.420500, 78.435000, 48.00, 255.00, 95, NOW());

-- ------------------------------------------------------------------------------
-- 8. TRANSPARENT MEDICAL LOGISTICS FUNDING CAMPAIGNS
-- ------------------------------------------------------------------------------
INSERT INTO funding_campaigns (id, campaign_code, case_id, receiving_hospital_id, title, purpose_category, description, supporting_budget_url, approved_target_amount, current_confirmed_amount, verified_expenses_amount, refunded_amount, status, approved_by_user_id, approved_at, start_date, end_date)
VALUES
('CAMP-2026-001', 'LL-CAMP-2026-001', 'CASE-2026-001', 'HOSP-NIMS-01', 'Emergency Cold-Chain Heart Perfusion Apparatus & Escort Transport', 'COLD_CHAIN_LOGISTICS', 'Subsidized preservation apparatus and multi-zone police green-corridor ambulance fuel and telemetry expenses for donor case LL-CASE-2026-001.', 'https://lifelink.org/budgets/BUDGET-LL-2026-001.pdf', 75000.00, 45000.00, 32000.00, 0.00, 'APPROVED_ACTIVE', 'USR-FIN-01', NOW() - INTERVAL 2 DAY, CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 28 DAY),
('CAMP-2026-002', 'LL-CAMP-2026-002', 'CASE-2026-002', 'HOSP-APOLLO-02', 'Rapid Regional Organ Transport & Critical Care Aviation Fuel', 'ORGAN_CARE_TRANSPORT', 'Funding specialized temperature-controlled perfusion modules and dedicated interstate logistics escorts for pediatric donor retrieval.', 'https://lifelink.org/budgets/BUDGET-LL-2026-002.pdf', 120000.00, 80000.00, 45000.00, 0.00, 'APPROVED_ACTIVE', 'USR-FIN-01', NOW() - INTERVAL 5 DAY, CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 25 DAY);

INSERT INTO funding_budgets (id, campaign_id, line_item_title, budgeted_amount, vendor_quote_reference, is_verified)
VALUES
('BUD-01', 'CAMP-2026-001', 'Sterile Hypothermic Machine Perfusion Cassette Unit', 35000.00, 'QUOTE-TRANS-MED-991', TRUE),
('BUD-02', 'CAMP-2026-001', 'Dedicated Advanced Life Support Transport Vehicle Dispatch', 25000.00, 'QUOTE-ESCORT-FLEET-441', TRUE),
('BUD-03', 'CAMP-2026-001', 'Police Green-Corridor Multi-Agency Coordination & Toll Escort', 15000.00, 'GOV-TOLL-RECEIPT-TS-10', TRUE);

INSERT INTO contribution_transactions (id, transaction_reference, campaign_id, contributor_name, contributor_email, contributor_phone, amount, currency, payment_gateway, gateway_order_id, gateway_payment_id, payment_status, is_80g_eligible, receipt_reference, receipt_hash, confirmed_at)
VALUES
('TX-2026-01', 'LL-TXN-2026-1011', 'CAMP-2026-001', 'Vikramaditya Rao', 'visitor.vikram@gmail.com', '+91-9849099999', 25000.00, 'INR', 'RAZORPAY', 'order_LL_test_1011', 'pay_LL_test_1011', 'PAYMENT_CONFIRMED', TRUE, 'LL-REC-2026-88101', 'BL-VHASH-2026-D4E19F3A4B8C1E0A', NOW() - INTERVAL 1 DAY),
('TX-2026-02', 'LL-TXN-2026-1012', 'CAMP-2026-001', 'Dr. Ramesh Chandra Trust', 'contact@chandra-health-trust.org', '+91-9849033331', 20000.00, 'INR', 'RAZORPAY', 'order_LL_test_1012', 'pay_LL_test_1012', 'PAYMENT_CONFIRMED', TRUE, 'LL-REC-2026-88102', 'BL-VHASH-2026-C8B21F7A9D3E5B1A', NOW() - INTERVAL 12 HOUR);

INSERT INTO receipts (id, receipt_number, transaction_id, contributor_masked_name, receiving_hospital_name, amount, currency, purpose, receipt_hash, issue_date, is_revoked_or_voided)
VALUES
('REC-01', 'LL-REC-2026-88101', 'TX-2026-01', 'V. R.', 'Nizam''s Institute of Medical Sciences (NIMS)', 25000.00, 'INR', 'Emergency Cold-Chain Heart Perfusion Apparatus & Escort Transport', 'BL-VHASH-2026-D4E19F3A4B8C1E0A', NOW() - INTERVAL 1 DAY, FALSE),
('REC-02', 'LL-REC-2026-88102', 'TX-2026-02', 'D. R. C. T.', 'Nizam''s Institute of Medical Sciences (NIMS)', 20000.00, 'INR', 'Emergency Cold-Chain Heart Perfusion Apparatus & Escort Transport', 'BL-VHASH-2026-C8B21F7A9D3E5B1A', NOW() - INTERVAL 12 HOUR, FALSE);

INSERT INTO expense_records (id, campaign_id, invoice_number, vendor_name, expense_title, expense_category, amount, supporting_doc_url, submitted_by_user_id, verified_by_user_id, verification_status, verified_at)
VALUES
('EXP-01', 'CAMP-2026-001', 'INV-COLD-CHAIN-8801', 'OrganOx Bio-Transport Systems Ltd', 'Machine Perfusion Consumables & Fluid Kit', 'COLD_CHAIN_SUPPLIES', 32000.00, 'https://lifelink.org/invoices/INV-COLD-CHAIN-8801.pdf', 'USR-DOC-NIMS-01', 'USR-FIN-01', 'VERIFIED_APPROVED', NOW() - INTERVAL 6 HOUR);

INSERT INTO financial_reconciliations (id, campaign_id, reconciled_by_user_id, total_contributions_received, total_expenses_approved, available_balance, remaining_requirement, discrepancy_notes, status)
VALUES
('RECON-01', 'CAMP-2026-001', 'USR-FIN-01', 45000.00, 32000.00, 13000.00, 30000.00, 'Verified against banking gateway settlement batch BATCH-RZP-2026-0991; accounts balanced.', 'BALANCED');

-- ------------------------------------------------------------------------------
-- 9. IN-APP NOTIFICATIONS
-- ------------------------------------------------------------------------------
INSERT INTO notifications (id, recipient_user_id, title, message, notification_type, reference_id, is_read)
VALUES
('NOTIF-01', 'USR-COORD-01', 'Emergency Referral Assigned', 'New potential deceased donor case LL-CASE-2026-001 registered by NIMS Trauma ICU.', 'CASE_UPDATE', 'CASE-2026-001', FALSE),
('NOTIF-02', 'USR-DRV-01', 'Transport Job Dispatched', 'Green Corridor transport LL-TRP-2026-001 active. Route cleared to Apollo Health City.', 'TRANSPORT_ALERT', 'TRP-2026-001', FALSE),
('NOTIF-03', 'USR-FIN-01', 'Campaign Contributions Received', 'Campaign LL-CAMP-2026-001 reached ₹45,000 (60% of approved logistics budget).', 'FUNDING_UPDATE', 'CAMP-2026-001', TRUE);

-- ------------------------------------------------------------------------------
-- 10. SYSTEM AUDIT TRAIL
-- ------------------------------------------------------------------------------
INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, action, entity_type, entity_id, ip_address, details)
VALUES
('AUD-01', 'USR-DOC-NIMS-01', 'Dr. Arvind Sharma (Critical Care)', 'HOSPITAL_DOCTOR', 'CASE_REGISTERED', 'DONOR_CASE', 'CASE-2026-001', '127.0.0.1', 'Registered potential case with positive apnea test findings.'),
('AUD-02', 'USR-COORD-01', 'Ananya Deshmukh (Lead Coordinator)', 'TRANSPLANT_COORDINATOR', 'CONSENT_VERIFIED', 'CONSENT_RECORD', 'CONS-01', '127.0.0.1', 'Verified Form 6 Next-of-Kin consent document and Police NOC clearance.'),
('AUD-03', 'USR-TRP-COORD-01', 'Karthik Raman (Disaster Logistics)', 'TRANSPORT_COORDINATOR', 'GREEN_CORRIDOR_DISPATCHED', 'TRANSPORT_ASSIGNMENT', 'TRP-2026-001', '127.0.0.1', 'Dispatched vehicle TS-09-UB-7701 with Heart Care Perfusion unit to Apollo Health City.');
