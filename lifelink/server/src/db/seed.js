const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

function seedDatabase(options = { clean: true }) {
  const db = getDb();
  const passwordHash = bcrypt.hashSync('Password@123', 10);

  console.log('[Seed] Beginning BloodLink 3.0 database seeding...');

  const runSeed = db.transaction(() => {
    if (options.clean) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        DELETE FROM bedside_crossmatch_checks;
        DELETE FROM password_resets;
        DELETE FROM privacy_requests;
        DELETE FROM cold_chain_logs;
        DELETE FROM incident_events;
        DELETE FROM inventory_transfers;
        DELETE FROM donation_history;
        DELETE FROM simulations;
        DELETE FROM fraud_flags;
        DELETE FROM incident_tasks;
        DELETE FROM incidents;
        DELETE FROM notifications;
        DELETE FROM inventory_transactions;
        DELETE FROM inventory_batches;
        DELETE FROM request_matches;
        DELETE FROM request_events;
        DELETE FROM sla_target_configs;
        DELETE FROM emergency_requests;
        DELETE FROM donor_profiles;
        DELETE FROM users;
        DELETE FROM organizations;
        DELETE FROM audit_logs;
      `);
      db.pragma('foreign_keys = ON');
    }

    // 1. Organizations
    const orgs = [
      {
        id: 'ORG-HOSP-01',
        name: 'AIIMS Apex Emergency Trauma Hospital',
        type: 'HOSPITAL',
        license_number: 'TS-MED-2024-9981',
        address: 'Bibi Nagar, Hyderabad Metropolitan Region, Telangana',
        latitude: 17.4156,
        longitude: 78.4750,
        contact_email: 'emergency@aiims.edu',
        contact_phone: '+91-40-2345-6789',
        verification_status: 'VERIFIED'
      },
      {
        id: 'ORG-BANK-01',
        name: 'Red Cross Central Regional Blood Bank',
        type: 'BLOOD_BANK',
        license_number: 'RC-BB-88910',
        address: 'Secunderabad Central Hub, Telangana',
        latitude: 17.4399,
        longitude: 78.4983,
        contact_email: 'inventory@redcrossblood.org',
        contact_phone: '+91-40-8877-6655',
        verification_status: 'VERIFIED'
      },
      {
        id: 'ORG-HOSP-02',
        name: 'Apollo Jubilee Critical Care Centre',
        type: 'HOSPITAL',
        license_number: 'APL-TS-44120',
        address: 'Road No 72, Jubilee Hills, Hyderabad',
        latitude: 17.4265,
        longitude: 78.4124,
        contact_email: 'critical@apollohyderabad.com',
        contact_phone: '+91-40-2360-7777',
        verification_status: 'VERIFIED'
      },
      {
        id: 'ORG-HOSP-03',
        name: 'Tata Memorial Trauma & Oncology Hospital',
        type: 'HOSPITAL',
        license_number: 'MH-MUM-2024-8841',
        address: 'Dr. E Borges Road, Parel, Mumbai, Maharashtra',
        latitude: 19.0028,
        longitude: 72.8428,
        contact_email: 'er@tatamemorial.org',
        contact_phone: '+91-22-2417-7000',
        verification_status: 'VERIFIED'
      },
      {
        id: 'ORG-HOSP-04',
        name: 'AIIMS New Delhi Apex Trauma Centre',
        type: 'HOSPITAL',
        license_number: 'DL-DEL-2024-1102',
        address: 'Ring Road, Ansari Nagar, New Delhi',
        latitude: 28.5672,
        longitude: 77.2100,
        contact_email: 'trauma@aiimsdelhi.edu',
        contact_phone: '+91-11-2658-8500',
        verification_status: 'VERIFIED'
      },
      {
        id: 'ORG-BANK-02',
        name: 'Rotary Central Blood Bank',
        type: 'BLOOD_BANK',
        license_number: 'DL-BB-9921',
        address: '56 Tughlakabad Institutional Area, New Delhi',
        latitude: 28.5135,
        longitude: 77.2825,
        contact_email: 'inventory@rotarybloodbank.org',
        contact_phone: '+91-11-2996-5500',
        verification_status: 'VERIFIED'
      },
      {
        id: 'ORG-HOSP-05',
        name: 'Victoria Emergency Hospital & Medical College',
        type: 'HOSPITAL',
        license_number: 'KA-BLR-2024-3310',
        address: 'Fort Road, Kalasipalya, Bengaluru, Karnataka',
        latitude: 12.9602,
        longitude: 77.5741,
        contact_email: 'triage@victoriabangalore.org',
        contact_phone: '+91-80-2670-1150',
        verification_status: 'VERIFIED'
      },
      {
        id: 'ORG-HOSP-06',
        name: 'Apollo Specialty Hospital',
        type: 'HOSPITAL',
        license_number: 'TN-CHE-2024-4491',
        address: 'Greams Lane, Thousand Lights, Chennai, Tamil Nadu',
        latitude: 13.0604,
        longitude: 80.2496,
        contact_email: 'emergency@apollochennai.com',
        contact_phone: '+91-44-2829-0200',
        verification_status: 'VERIFIED'
      }
    ];

    const insertOrg = db.prepare(`
      INSERT INTO organizations (id, name, type, license_number, address, latitude, longitude, contact_email, contact_phone, verification_status)
      VALUES (@id, @name, @type, @license_number, @address, @latitude, @longitude, @contact_email, @contact_phone, @verification_status)
    `);
    for (const org of orgs) insertOrg.run(org);

    // 2. Users representing all 10 RBAC User Classes
    const users = [
      {
        id: 'USR-DON-01',
        email: 'donor@bloodlink.org',
        full_name: 'Vikram Sharma',
        phone: '+91-9876543210',
        role: 'DONOR',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-REQ-01',
        email: 'requester@aiims.org',
        full_name: 'Dr. Priya Varma (ER Triage)',
        phone: '+91-9876543211',
        role: 'HOSPITAL_REQUESTER',
        organization_id: 'ORG-HOSP-01',
        is_verified: 1
      },
      {
        id: 'USR-HADM-01',
        email: 'admin@aiims.org',
        full_name: 'Rajesh K. Nambiar (Facility Director)',
        phone: '+91-9876543212',
        role: 'HOSPITAL_ADMIN',
        organization_id: 'ORG-HOSP-01',
        is_verified: 1
      },
      {
        id: 'USR-BBO-01',
        email: 'operator@redcross.org',
        full_name: 'Sunita Reddy (Inventory Chief)',
        phone: '+91-9876543213',
        role: 'BLOOD_BANK_OPERATOR',
        organization_id: 'ORG-BANK-01',
        is_verified: 1
      },
      {
        id: 'USR-REV-01',
        email: 'reviewer@bloodlink.org',
        full_name: 'Dr. Ananya Sen (Verification Lead)',
        phone: '+91-9876543214',
        role: 'VERIFICATION_REVIEWER',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-COORD-01',
        email: 'coordinator@bloodlink.org',
        full_name: 'Karthik Raman (Disaster Ops)',
        phone: '+91-9876543215',
        role: 'EMERGENCY_COORDINATOR',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-VOL-01',
        email: 'volunteer@bloodlink.org',
        full_name: 'Amit Patel (Logistics Lead)',
        phone: '+91-9876543216',
        role: 'VOLUNTEER',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-FRAUD-01',
        email: 'fraud@bloodlink.org',
        full_name: 'Meera Iyer (Compliance & Integrity)',
        phone: '+91-9876543217',
        role: 'FRAUD_REVIEWER',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-ADMIN-01',
        email: 'sysadmin@bloodlink.org',
        full_name: 'Platform Administrator',
        phone: '+91-9876543218',
        role: 'SYSTEM_ADMIN',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-PUB-01',
        email: 'visitor@bloodlink.org',
        full_name: 'General Public Citizen',
        phone: '+91-9876543219',
        role: 'PUBLIC_VISITOR',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-DON-02',
        email: 'donor2@bloodlink.org',
        full_name: 'Sneha Chary',
        phone: '+91-9876543220',
        role: 'DONOR',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-DON-03',
        email: 'donor3@bloodlink.org',
        full_name: 'Mohammed Irfan',
        phone: '+91-9876543221',
        role: 'DONOR',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-DON-04',
        email: 'donor4@bloodlink.org',
        full_name: 'Lakshmi Rao',
        phone: '+91-9876543222',
        role: 'DONOR',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-DON-05',
        email: 'rohan.varma@bloodlink.org',
        full_name: 'Rohan Varma (New Registrant)',
        phone: '+91-9876543223',
        role: 'DONOR',
        organization_id: null,
        is_verified: 0
      },
      {
        id: 'USR-DON-06',
        email: 'aditya.rao@bloodlink.org',
        full_name: 'Aditya Rao',
        phone: '+91-9876543224',
        role: 'DONOR',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-DON-07',
        email: 'kavita.nair@bloodlink.org',
        full_name: 'Kavita Nair',
        phone: '+91-9876543225',
        role: 'DONOR',
        organization_id: null,
        is_verified: 1
      },
      {
        id: 'USR-DON-08',
        email: 'suresh.reddy@bloodlink.org',
        full_name: 'Suresh Reddy',
        phone: '+91-9876543226',
        role: 'DONOR',
        organization_id: null,
        is_verified: 1
      }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, organization_id, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of users) {
      insertUser.run(u.id, u.email, passwordHash, u.full_name, u.phone, u.role, u.organization_id, u.is_verified);
    }

    // 3. Donor Profiles
    const donorProfiles = [
      {
        id: 'PRF-DON-01',
        user_id: 'USR-DON-01',
        blood_group: 'O-',
        date_of_birth: '1992-05-14',
        gender: 'Male',
        latitude: 17.4200,
        longitude: 78.4700,
        address_locality: 'Himayatnagar, Hyderabad',
        availability_status: 'AVAILABLE',
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_language: 'en',
        consent_emergency_alerts: 1,
        consent_data_sharing: 1,
        last_donation_date: '2026-06-10',
        verification_status: 'VERIFIED'
      },
      {
        id: 'PRF-DON-02',
        user_id: 'USR-DON-02',
        blood_group: 'O-',
        date_of_birth: '1995-11-20',
        gender: 'Female',
        latitude: 17.4350,
        longitude: 78.4800,
        address_locality: 'Basheerbagh, Hyderabad',
        availability_status: 'AVAILABLE',
        quiet_hours_start: '23:00',
        quiet_hours_end: '06:00',
        preferred_language: 'te',
        consent_emergency_alerts: 1,
        consent_data_sharing: 1,
        last_donation_date: '2026-05-18',
        verification_status: 'VERIFIED'
      },
      {
        id: 'PRF-DON-03',
        user_id: 'USR-DON-03',
        blood_group: 'A+',
        date_of_birth: '1989-02-08',
        gender: 'Male',
        latitude: 17.4500,
        longitude: 78.4900,
        address_locality: 'Begumpet, Hyderabad',
        availability_status: 'AVAILABLE',
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_language: 'hi',
        consent_emergency_alerts: 1,
        consent_data_sharing: 1,
        last_donation_date: '2026-07-22',
        verification_status: 'VERIFIED'
      },
      {
        id: 'PRF-DON-04',
        user_id: 'USR-DON-04',
        blood_group: 'B+',
        date_of_birth: '1998-09-30',
        gender: 'Female',
        latitude: 17.4100,
        longitude: 78.4500,
        address_locality: 'Banjara Hills, Hyderabad',
        availability_status: 'AVAILABLE',
        quiet_hours_start: '21:00',
        quiet_hours_end: '08:00',
        preferred_language: 'te',
        consent_emergency_alerts: 1,
        consent_data_sharing: 1,
        last_donation_date: '2026-08-01',
        verification_status: 'VERIFIED'
      },
      {
        id: 'PRF-DON-05',
        user_id: 'USR-DON-05',
        blood_group: 'AB+',
        date_of_birth: '1999-07-15',
        gender: 'Male',
        latitude: 17.4399,
        longitude: 78.4983,
        address_locality: 'Secunderabad Station Area',
        availability_status: 'AVAILABLE',
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_language: 'en',
        consent_emergency_alerts: 1,
        consent_data_sharing: 1,
        last_donation_date: null,
        verification_status: 'SELF_DECLARED'
      },
      {
        id: 'PRF-DON-06',
        user_id: 'USR-DON-06',
        blood_group: 'O-',
        date_of_birth: '1993-04-12',
        gender: 'Male',
        latitude: 17.4950,
        longitude: 78.5300,
        address_locality: 'Bowenpally, Secunderabad (10.6 km)',
        availability_status: 'AVAILABLE',
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_language: 'en',
        consent_emergency_alerts: 1,
        consent_data_sharing: 1,
        last_donation_date: '2026-06-15',
        verification_status: 'VERIFIED'
      },
      {
        id: 'PRF-DON-07',
        user_id: 'USR-DON-07',
        blood_group: 'O-',
        date_of_birth: '1990-08-25',
        gender: 'Female',
        latitude: 17.5800,
        longitude: 78.5800,
        address_locality: 'Kompally-Medchal Corridor (21.4 km)',
        availability_status: 'AVAILABLE',
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_language: 'te',
        consent_emergency_alerts: 1,
        consent_data_sharing: 1,
        last_donation_date: '2026-05-10',
        verification_status: 'VERIFIED'
      },
      {
        id: 'PRF-DON-08',
        user_id: 'USR-DON-08',
        blood_group: 'O-',
        date_of_birth: '1987-12-05',
        gender: 'Male',
        latitude: 17.7500,
        longitude: 78.6800,
        address_locality: 'Outer Ring Northern Sector (42.3 km)',
        availability_status: 'AVAILABLE',
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_language: 'hi',
        consent_emergency_alerts: 1,
        consent_data_sharing: 1,
        last_donation_date: '2026-04-20',
        verification_status: 'VERIFIED'
      }
    ];

    const insertProfile = db.prepare(`
      INSERT INTO donor_profiles (
        id, user_id, blood_group, date_of_birth, gender, latitude, longitude,
        address_locality, availability_status, quiet_hours_start, quiet_hours_end,
        preferred_language, consent_emergency_alerts, consent_data_sharing,
        last_donation_date, verification_status, member_id, qr_verification_code
      ) VALUES (
        @id, @user_id, @blood_group, @date_of_birth, @gender, @latitude, @longitude,
        @address_locality, @availability_status, @quiet_hours_start, @quiet_hours_end,
        @preferred_language, @consent_emergency_alerts, @consent_data_sharing,
        @last_donation_date, @verification_status, @member_id, @qr_verification_code
      )
    `);
    for (const p of donorProfiles) {
      insertProfile.run({
        ...p,
        member_id: p.member_id || `BL-MEM-${p.user_id.replace(/^USR-/, '')}`,
        qr_verification_code: p.qr_verification_code || `BL-VHASH-${Buffer.from(p.user_id).toString('hex')}-2026`
      });
    }

    // 4. Sample Emergency Requests
    const requests = [
      {
        id: 'REQ-2026-001',
        organization_id: 'ORG-HOSP-01',
        requester_id: 'USR-REQ-01',
        patient_reference: 'PT-ER-9011',
        blood_component: 'RED_BLOOD_CELLS',
        blood_group: 'O-',
        units_requested: 4,
        units_fulfilled: 2,
        urgency_level: 'CRITICAL_EMERGENCY',
        clinical_justification: 'High-speed highway collision multiple trauma, hypovolemic shock',
        hospital_department: 'Trauma ICU Bay 3',
        delivery_latitude: 17.4156,
        delivery_longitude: 78.4750,
        delivery_address: 'AIIMS Apex Emergency Trauma Hospital, Hyderabad',
        required_by: '2026-10-24 18:00:00',
        status: 'MATCHING',
        is_synthetic: 0
      },
      {
        id: 'REQ-2026-002',
        organization_id: 'ORG-HOSP-02',
        requester_id: 'USR-REQ-01',
        patient_reference: 'PT-OB-4412',
        blood_component: 'PLATELETS',
        blood_group: 'A+',
        units_requested: 2,
        units_fulfilled: 0,
        urgency_level: 'URGENT',
        clinical_justification: 'Emergency postpartum hemorrhage with acute thrombocytopenia',
        hospital_department: 'Maternity OT 2',
        delivery_latitude: 17.4265,
        delivery_longitude: 78.4124,
        delivery_address: 'Apollo Jubilee Critical Care Centre, Hyderabad',
        required_by: '2026-10-24 22:00:00',
        status: 'PENDING_REVIEW',
        is_synthetic: 0
      }
    ];

    const insertReq = db.prepare(`
      INSERT INTO emergency_requests (
        id, organization_id, requester_id, patient_reference, blood_component,
        blood_group, units_requested, units_fulfilled, urgency_level,
        clinical_justification, hospital_department, delivery_latitude,
        delivery_longitude, delivery_address, required_by, status, is_synthetic
      ) VALUES (
        @id, @organization_id, @requester_id, @patient_reference, @blood_component,
        @blood_group, @units_requested, @units_fulfilled, @urgency_level,
        @clinical_justification, @hospital_department, @delivery_latitude,
        @delivery_longitude, @delivery_address, @required_by, @status, @is_synthetic
      )
    `);
    for (const r of requests) insertReq.run(r);

    // 5. Inventory Batches
    const batches = [
      {
        id: 'BAT-O-NEG-001',
        organization_id: 'ORG-BANK-01',
        blood_component: 'RED_BLOOD_CELLS',
        blood_group: 'O-',
        units_total: 10,
        units_available: 8,
        units_reserved: 2,
        collection_date: '2026-10-10',
        expiry_date: '2026-11-20',
        status: 'AVAILABLE',
        storage_location: 'Cold Room A - Shelf 02'
      },
      {
        id: 'BAT-A-POS-002',
        organization_id: 'ORG-BANK-01',
        blood_component: 'PLATELETS',
        blood_group: 'A+',
        units_total: 6,
        units_available: 6,
        units_reserved: 0,
        collection_date: '2026-10-21',
        expiry_date: '2026-10-26',
        status: 'AVAILABLE',
        storage_location: 'Agitator Unit B - Tray 01'
      },
      {
        id: 'BAT-EXP-003',
        organization_id: 'ORG-BANK-01',
        blood_component: 'WHOLE_BLOOD',
        blood_group: 'B+',
        units_total: 5,
        units_available: 0,
        units_reserved: 0,
        collection_date: '2026-09-01',
        expiry_date: '2026-10-06',
        status: 'EXPIRED',
        storage_location: 'Disposal Holding Quarantine Q-01'
      },
      {
        id: 'BAT-QRN-004',
        organization_id: 'ORG-BANK-01',
        blood_component: 'FRESH_FROZEN_PLASMA',
        blood_group: 'AB-',
        units_total: 4,
        units_available: 0,
        units_reserved: 0,
        collection_date: '2026-10-20',
        expiry_date: '2027-10-20',
        status: 'QUARANTINED',
        storage_location: 'Testing Holding Freezer Q-02'
      }
    ];

    const insertBatch = db.prepare(`
      INSERT INTO inventory_batches (
        id, organization_id, blood_component, blood_group, units_total,
        units_available, units_reserved, collection_date, expiry_date,
        status, storage_location, confirmed_by_facility
      ) VALUES (
        @id, @organization_id, @blood_component, @blood_group, @units_total,
        @units_available, @units_reserved, @collection_date, @expiry_date,
        @status, @storage_location, 1
      )
    `);
    for (const b of batches) insertBatch.run(b);

    // 6. Sample Incident & Tasks
    const insertInc = db.prepare(`
      INSERT INTO incidents (id, title, description, severity, status, lead_coordinator_id, region)
      VALUES ('INC-2026-01', 'ORR Highway Multi-Vehicle Pileup', 'Mass casualty incident on Outer Ring Road. 12 casualties en route to AIIMS and Apollo.', 'CRITICAL', 'ACTIVE', 'USR-COORD-01', 'South Hyderabad')
    `);
    insertInc.run();

    const insertTask = db.prepare(`
      INSERT INTO incident_tasks (id, incident_id, title, description, assigned_to, status, priority)
      VALUES ('TSK-001', 'INC-2026-01', 'Emergency Cold-Chain Dispatch', 'Transport 4 units O- Negative RBC from Red Cross to AIIMS Trauma Centre', 'USR-VOL-01', 'IN_PROGRESS', 'URGENT')
    `);
    insertTask.run();

    // 7. Fraud / Duplicate Signal Flag
    const insertFraud = db.prepare(`
      INSERT INTO fraud_flags (id, target_type, target_id, flag_reason, evidence_payload, status)
      VALUES (
        'FRD-001',
        'REQUEST',
        'REQ-2026-002',
        'Duplicate Patient ID detected within 30 minutes across multiple facilities',
        '{"duplicate_patient_ref":"PT-OB-4412","conflicting_hospitals":["ORG-HOSP-01","ORG-HOSP-02"]}',
        'PENDING_REVIEW'
      )
    `);
    insertFraud.run();

    // 8. Sample Isolated Synthetic Simulation Record
    const insertSim = db.prepare(`
      INSERT INTO simulations (id, scenario_name, parameters, metrics, assumptions, created_by, is_synthetic)
      VALUES (
        'SIM-SYNTH-01',
        'Synthetic Scenario: Regional Monsoon Flooding & Surge',
        '{"simulated_casualties": 50, "disrupted_transit_radius_km": 15, "surge_demand_units": 80}',
        '{"fulfillment_rate": "78%", "avg_response_minutes": 24, "stockout_risk_components": ["O-", "Platelets"]}',
        'Synthetic data test run only - strictly isolated from production records.',
        'USR-ADMIN-01',
        1
      )
    `);
    insertSim.run();

    // 9. Confirmed Donation History & Milestone Badges (FR-DON-005)
    const donations = [
      {
        id: 'DON-HIST-001',
        donor_id: 'USR-DON-01',
        organization_id: 'ORG-BANK-01',
        donation_date: '2026-06-10',
        blood_component: 'WHOLE_BLOOD',
        units_donated: 1,
        hemoglobin_g_dl: 14.8,
        certificate_hash: 'CERT-BL-2026-VIKRAM-001',
        notes: 'Annual voluntary blood camp donation'
      },
      {
        id: 'DON-HIST-002',
        donor_id: 'USR-DON-01',
        organization_id: 'ORG-HOSP-01',
        donation_date: '2026-02-14',
        blood_component: 'RED_BLOOD_CELLS',
        units_donated: 1,
        hemoglobin_g_dl: 14.4,
        certificate_hash: 'CERT-BL-2026-VIKRAM-002',
        notes: 'Emergency standby direct replacement donation'
      },
      {
        id: 'DON-HIST-003',
        donor_id: 'USR-DON-01',
        organization_id: 'ORG-BANK-01',
        donation_date: '2025-10-08',
        blood_component: 'WHOLE_BLOOD',
        units_donated: 1,
        hemoglobin_g_dl: 15.0,
        certificate_hash: 'CERT-BL-2025-VIKRAM-003',
        notes: 'Community resilience blood drive'
      }
    ];

    const insertDonHist = db.prepare(`
      INSERT INTO donation_history (
        id, donor_id, organization_id, donation_date, blood_component,
        units_donated, hemoglobin_g_dl, certificate_hash, verified_by, notes
      ) VALUES (
        @id, @donor_id, @organization_id, @donation_date, @blood_component,
        @units_donated, @hemoglobin_g_dl, @certificate_hash, 'USR-REV-01', @notes
      )
    `);
    for (const d of donations) insertDonHist.run(d);

    // 10. Inter-Facility Blood Stock Transfer (FR-INV-002)
    const insertTransfer = db.prepare(`
      INSERT INTO inventory_transfers (
        id, source_org_id, destination_org_id, batch_id, blood_group, blood_component,
        quantity, status, courier_name, courier_phone, departure_temperature_c, arrival_temperature_c,
        requested_by, dispatched_at, notes
      ) VALUES (
        'XFR-2026-001',
        'ORG-BANK-01',
        'ORG-HOSP-01',
        'BAT-O-NEG-001',
        'O-',
        'RED_BLOOD_CELLS',
        2,
        'DISPATCHED_IN_TRANSIT',
        'BlueDart ColdChain Express (Vehicle TS-09-UB-1002)',
        '+91-98480-12345',
        3.8,
        null,
        'USR-REQ-01',
        '2026-10-23 16:45:00',
        'Urgent mutual-aid transfer for ORR multi-casualty trauma victims'
      )
    `);
    insertTransfer.run();

    // 11. Incident Timeline Events & Cold-Chain Telemetry (FR-INC-001, FR-VOL-002)
    const incidentEvents = [
      { id: 'EVT-01', incident_id: 'INC-2026-01', title: 'Major Collision Alert', description: 'Hyderabad Traffic Police reported 4-vehicle pileup on Outer Ring Road South.', event_type: 'ALERT' },
      { id: 'EVT-02', incident_id: 'INC-2026-01', title: 'Hospital Mass Casualty Triage', description: 'AIIMS and Apollo Trauma ICUs activated emergency code red triage.', event_type: 'TRIAGE' },
      { id: 'EVT-03', incident_id: 'INC-2026-01', title: 'Mutual-Aid Transfer Dispatched', description: 'Red Cross Central dispatched 2 units O- RBC with cold-chain monitoring.', event_type: 'DISPATCH' }
    ];

    const insertEvt = db.prepare(`
      INSERT INTO incident_events (id, incident_id, title, description, event_type, actor_id)
      VALUES (@id, @incident_id, @title, @description, @event_type, 'USR-COORD-01')
    `);
    for (const ev of incidentEvents) insertEvt.run(ev);

    const coldChainReadings = [
      { id: 'CC-01', transfer_id: 'XFR-2026-001', task_id: 'TSK-001', temp: 3.8, ambient: 29.5, safe: 1, notes: 'Departure check at Red Cross Central cold storage' },
      { id: 'CC-02', transfer_id: 'XFR-2026-001', task_id: 'TSK-001', temp: 4.1, ambient: 31.0, safe: 1, notes: 'Mid-route checkpoint at LB Nagar Junction' },
      { id: 'CC-03', transfer_id: 'XFR-2026-001', task_id: 'TSK-001', temp: 4.0, ambient: 30.2, safe: 1, notes: 'Outer Ring Road toll plaza reading' }
    ];

    const insertCC = db.prepare(`
      INSERT INTO cold_chain_logs (id, transfer_id, task_id, temperature_celsius, ambient_celsius, is_safe, recorded_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'USR-VOL-01', ?)
    `);
    for (const cc of coldChainReadings) {
      insertCC.run(cc.id, cc.transfer_id, cc.task_id, cc.temp, cc.ambient, cc.safe, cc.notes);
    }

    // 12. Operational Acceptance-Time Targets (SRS Section 2)
    const insertSla = db.prepare(`
      INSERT INTO sla_target_configs (stage_key, stage_name, target_seconds, start_trigger, stop_trigger, pause_trigger, description)
      VALUES (@stage_key, @stage_name, @target_seconds, @start_trigger, @stop_trigger, @pause_trigger, @description)
    `);

    const slaTargets = [
      {
        stage_key: 'request_validation',
        stage_name: 'Request validation',
        target_seconds: 120, // 2 minutes
        start_trigger: 'REQUEST_SUBMITTED',
        stop_trigger: 'REQUEST_VERIFIED',
        pause_trigger: null,
        description: 'Operational target to verify clinical justification and urgency level before triggering regional matching.'
      },
      {
        stage_key: 'donor_matching',
        stage_name: 'Initial donor matching',
        target_seconds: 60, // 1 minute
        start_trigger: 'REQUEST_VERIFIED',
        stop_trigger: 'DONOR_MATCHING_STARTED',
        pause_trigger: null,
        description: 'Target duration for spatial Haversine algorithm to compute eligible candidate clusters.'
      },
      {
        stage_key: 'notification_dispatch',
        stage_name: 'First notification dispatch attempt',
        target_seconds: 60, // 1 minute
        start_trigger: 'DONOR_MATCHING_STARTED',
        stop_trigger: 'DONOR_NOTIFICATIONS_QUEUED',
        pause_trigger: null,
        description: 'Target window to queue multi-channel emergency outreach alerts to candidate donors.'
      },
      {
        stage_key: 'donor_response_review',
        stage_name: 'Review of a donor response',
        target_seconds: 300, // 5 minutes
        start_trigger: 'FIRST_DONOR_RESPONSE_RECEIVED',
        stop_trigger: 'DONOR_SELECTED_FOR_COORDINATION',
        pause_trigger: null,
        description: 'Target time for ER triage to review incoming donor ETA and confirm coordination.'
      },
      {
        stage_key: 'coordinator_escalation',
        stage_name: 'Coordinator escalation review',
        target_seconds: 300, // 5 minutes
        start_trigger: 'ESCALATION_STAGE_STARTED',
        stop_trigger: 'FIRST_DONOR_RESPONSE_RECEIVED',
        pause_trigger: null,
        description: 'Target time to expand radius perimeter if no responses arrive.'
      }
    ];
    for (const target of slaTargets) insertSla.run(target);

    // 13. Request Lifecycle Events & Acceptance-Time Records for REQ-2026-001
    const insertReqEvt = db.prepare(`
      INSERT INTO request_events (id, request_id, event_type, title, description, actor_id, actor_name, actor_role, metadata, created_at)
      VALUES (@id, @request_id, @event_type, @title, @description, @actor_id, @actor_name, @actor_role, @metadata, @created_at)
    `);

    const sampleEvents = [
      {
        id: 'REQ-EVT-01',
        request_id: 'REQ-2026-001',
        event_type: 'REQUEST_CREATED',
        title: 'Emergency Request Created',
        description: '4 Units of O- Red Blood Cells requested for multiple trauma in Trauma ICU Bay 3.',
        actor_id: 'USR-REQ-01',
        actor_name: 'Dr. Priya Varma',
        actor_role: 'HOSPITAL_REQUESTER',
        metadata: JSON.stringify({ units: 4, blood_group: 'O-', urgency: 'CRITICAL_EMERGENCY' }),
        created_at: '2026-10-23 16:30:00'
      },
      {
        id: 'REQ-EVT-02',
        request_id: 'REQ-2026-001',
        event_type: 'REQUEST_SUBMITTED',
        title: 'Emergency Request Submitted',
        description: 'Submitted to clinical verification queue with Code Red urgency justification.',
        actor_id: 'USR-REQ-01',
        actor_name: 'Dr. Priya Varma',
        actor_role: 'HOSPITAL_REQUESTER',
        metadata: JSON.stringify({ submitted_at: '2026-10-23 16:30:15' }),
        created_at: '2026-10-23 16:30:15'
      },
      {
        id: 'REQ-EVT-03',
        request_id: 'REQ-2026-001',
        event_type: 'REQUEST_VERIFIED',
        title: 'Clinical Verification Approved',
        description: 'Clinical justification and transfusion requirements verified by Clinical Review Lead.',
        actor_id: 'USR-REV-01',
        actor_name: 'Dr. Ananya Sen',
        actor_role: 'VERIFICATION_REVIEWER',
        metadata: JSON.stringify({ verified_by: 'USR-REV-01', duration_seconds: 90 }),
        created_at: '2026-10-23 16:31:45'
      },
      {
        id: 'REQ-EVT-04',
        request_id: 'REQ-2026-001',
        event_type: 'DONOR_MATCHING_STARTED',
        title: 'Spatial Donor Matching Started',
        description: 'Haversine distance calculation and RBC compatibility evaluation initiated for 5 km radius.',
        actor_id: 'SYSTEM',
        actor_name: 'Matching Engine',
        actor_role: 'SYSTEM',
        metadata: JSON.stringify({ radius_km: 5.0, candidates_evaluated: 5 }),
        created_at: '2026-10-23 16:32:15'
      },
      {
        id: 'REQ-EVT-05',
        request_id: 'REQ-2026-001',
        event_type: 'ESCALATION_STAGE_STARTED',
        title: 'Stage 1 Escalation Dispatched (5 km)',
        description: 'Perimeter 5 km search perimeter activated around AIIMS Trauma Centre.',
        actor_id: 'USR-COORD-01',
        actor_name: 'Karthik Raman',
        actor_role: 'EMERGENCY_COORDINATOR',
        metadata: JSON.stringify({ stage: 1, radius_km: 5.0 }),
        created_at: '2026-10-23 16:32:30'
      },
      {
        id: 'REQ-EVT-06',
        request_id: 'REQ-2026-001',
        event_type: 'DONOR_NOTIFICATIONS_QUEUED',
        title: 'Donor Notifications Queued',
        description: 'Emergency siren notifications queued for 2 candidate O- donors within 5 km.',
        actor_id: 'SYSTEM',
        actor_name: 'Notification Dispatcher',
        actor_role: 'SYSTEM',
        metadata: JSON.stringify({ queued_count: 2, channels: ['IN_APP', 'SMS'] }),
        created_at: '2026-10-23 16:33:00'
      },
      {
        id: 'REQ-EVT-07',
        request_id: 'REQ-2026-001',
        event_type: 'NOTIFICATIONS_DELIVERY_CONFIRMED',
        title: 'Outreach Delivered to Candidate Devices',
        description: 'Emergency alert acknowledged by regional telecommunications relay & in-app siren channel.',
        actor_id: 'SYSTEM',
        actor_name: 'Delivery Gateway',
        actor_role: 'SYSTEM',
        metadata: JSON.stringify({ delivery_status: 'DELIVERED', confirmed_count: 2 }),
        created_at: '2026-10-23 16:33:10'
      },
      {
        id: 'REQ-EVT-08',
        request_id: 'REQ-2026-001',
        event_type: 'FIRST_DONOR_RESPONSE_RECEIVED',
        title: 'First Donor Response Received',
        description: 'Vikram Sharma (O-) expressed willingness to donate. ETA: 25 minutes.',
        actor_id: 'USR-DON-01',
        actor_name: 'Vikram Sharma',
        actor_role: 'DONOR',
        metadata: JSON.stringify({ response: 'ACCEPTED', eta_minutes: 25, distance_km: 0.7 }),
        created_at: '2026-10-23 16:35:40'
      },
      {
        id: 'REQ-EVT-09',
        request_id: 'REQ-2026-001',
        event_type: 'DONOR_RESPONSE_REVIEWED',
        title: 'Donor Response Reviewed by Hospital',
        description: 'ER triage physician reviewed Vikram Sharma availability and estimated arrival time.',
        actor_id: 'USR-REQ-01',
        actor_name: 'Dr. Priya Varma',
        actor_role: 'HOSPITAL_REQUESTER',
        metadata: JSON.stringify({ donor_id: 'USR-DON-01', review_status: 'SELECTED_FOR_COORDINATION' }),
        created_at: '2026-10-23 16:37:20'
      },
      {
        id: 'REQ-EVT-10',
        request_id: 'REQ-2026-001',
        event_type: 'DONOR_SELECTED_FOR_COORDINATION',
        title: 'Donor Selected for Coordination',
        description: 'Hospital accepted Vikram Sharma for bedside triage coordination. Standby at Bay 3 confirmed.',
        actor_id: 'USR-REQ-01',
        actor_name: 'Dr. Priya Varma',
        actor_role: 'HOSPITAL_REQUESTER',
        metadata: JSON.stringify({ donor_id: 'USR-DON-01', instructions: 'Report to Trauma Bay 3 Reception' }),
        created_at: '2026-10-23 16:37:45'
      }
    ];
    for (const ev of sampleEvents) insertReqEvt.run(ev);

    // 14. Initial System Audit Log
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
      VALUES (
        'AUD-INIT-001',
        'USR-ADMIN-01',
        'SYSTEM_ADMIN',
        'SYSTEM_SEED_INITIALIZED',
        'SYSTEM',
        'BLOODLINK-3.0',
        '{"version":"1.0","environment":"development","status":"baseline_seeded"}'
      )
    `);
    insertAudit.run();
  });

  runSeed();
  console.log('[Seed] Database successfully seeded with 10 user classes, organizations, requests, inventory, and simulation records.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
