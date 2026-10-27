package com.lifelink.service;

import com.lifelink.entity.*;
import com.lifelink.enums.*;
import com.lifelink.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class DataInitializerService implements CommandLineRunner {

    private final HospitalRepository hospitalRepository;
    private final UserRepository userRepository;
    private final DonorCaseRepository caseRepository;
    private final OrganAssessmentRepository assessmentRepository;
    private final ConsentRecordRepository consentRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverProfileRepository driverRepository;
    private final TransportAssignmentRepository transportRepository;
    private final LocationUpdateRepository locationRepository;
    private final FundingCampaignRepository campaignRepository;
    private final FundingBudgetRepository budgetRepository;
    private final ContributionTransactionRepository transactionRepository;
    private final ReceiptRepository receiptRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializerService(HospitalRepository hospitalRepository,
                                  UserRepository userRepository,
                                  DonorCaseRepository caseRepository,
                                  OrganAssessmentRepository assessmentRepository,
                                  ConsentRecordRepository consentRepository,
                                  VehicleRepository vehicleRepository,
                                  DriverProfileRepository driverRepository,
                                  TransportAssignmentRepository transportRepository,
                                  LocationUpdateRepository locationRepository,
                                  FundingCampaignRepository campaignRepository,
                                  FundingBudgetRepository budgetRepository,
                                  ContributionTransactionRepository transactionRepository,
                                  ReceiptRepository receiptRepository,
                                  PasswordEncoder passwordEncoder) {
        this.hospitalRepository = hospitalRepository;
        this.userRepository = userRepository;
        this.caseRepository = caseRepository;
        this.assessmentRepository = assessmentRepository;
        this.consentRepository = consentRepository;
        this.vehicleRepository = vehicleRepository;
        this.driverRepository = driverRepository;
        this.transportRepository = transportRepository;
        this.locationRepository = locationRepository;
        this.campaignRepository = campaignRepository;
        this.budgetRepository = budgetRepository;
        this.transactionRepository = transactionRepository;
        this.receiptRepository = receiptRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (hospitalRepository.count() > 0) {
            return; // Already initialized
        }

        // 1. Seed Hospitals
        Hospital nims = createHospital("HOSP-HYD-001", "Nizam's Institute of Medical Sciences (NIMS)", HospitalType.GOVERNMENT, "NOTHO-TG-2015-001", "Punjagutta Road, Hyderabad", "Hyderabad", "Telangana", "500082", 17.4225, 78.4518, "+91 40 2348 9000", "+91 40 2348 9234", "Dr. K. Srinivas", "nodal.nims@telangana.gov.in", true, true);
        Hospital apollo = createHospital("HOSP-HYD-002", "Apollo Hospitals Jubilee Hills", HospitalType.TRANSPLANT_CENTER, "NOTHO-TG-2016-012", "Road No. 72, Film Nagar, Jubilee Hills", "Hyderabad", "Telangana", "500033", 17.4156, 78.4124, "+91 40 2360 7777", "+91 40 2360 8888", "Dr. Ananya Rao", "transplant@apollohyderabad.com", true, true);
        Hospital yashoda = createHospital("HOSP-SEC-003", "Yashoda Hospitals Secunderabad", HospitalType.APEX_TRAUMA, "NOTHO-TG-2017-024", "Alexander Road, Secunderabad", "Hyderabad", "Telangana", "500003", 17.4399, 78.4983, "+91 40 4567 4567", "+91 40 4567 4500", "Dr. Rajeshwar Goud", "nodal@yashodahospitals.com", true, true);
        Hospital kims = createHospital("HOSP-HYD-004", "KIMS Hospitals Begumpet", HospitalType.TRANSPLANT_CENTER, "NOTHO-TG-2018-031", "1-8-31/1, Minister Road, Krishna Nagar Colony, Begumpet", "Hyderabad", "Telangana", "500003", 17.4435, 78.4812, "+91 40 4488 5000", "+91 40 4488 5100", "Dr. P. Venkat", "organs@kimshospitals.com", true, true);
        Hospital gandhi = createHospital("HOSP-SEC-005", "Gandhi Hospital & Medical College", HospitalType.GOVERNMENT, "NOTHO-TG-2014-002", "Musheerabad, Padmarao Nagar, Secunderabad", "Hyderabad", "Telangana", "500003", 17.4241, 78.5042, "+91 40 2750 5566", "+91 40 2750 5577", "Dr. M. Lalitha", "superintendent@gandhihospital.org", true, false);

        // 2. Seed Demo Users
        String encPwd = passwordEncoder.encode("Password@123");
        User coordinator = createUser("coordinator@lifelink.org", encPwd, "Dr. Sunita Deshmukh", "+91 98765 43210", Role.TRANSPLANT_COORDINATOR, nims.getId(), "Chief Nodal Transplant Coordinator", "TSMC-2012-45891");
        User icuDoc = createUser("icu.doctor@lifelink.org", encPwd, "Dr. Vikram Seth", "+91 98765 43211", Role.HOSPITAL_ICU_DOCTOR, nims.getId(), "Lead Critical Care Intensivist", "TSMC-2008-21943");
        User traffic = createUser("police.traffic@lifelink.org", encPwd, "ACP K. Ramesh Rao", "+91 98765 43212", Role.TRAFFIC_POLICE_COORDINATOR, null, "Assistant Commissioner of Police (Traffic Coordination)", null);
        User driver = createUser("driver.fast@lifelink.org", encPwd, "Mohd. Shakeel Ahmed", "+91 98765 43213", Role.ORGAN_TRANSPORT_DRIVER, nims.getId(), "Senior Emergency ALS Pilot", null);
        User counselor = createUser("counselor@lifelink.org", encPwd, "Priya Nair", "+91 98765 43214", Role.BEREAVEMENT_COUNSELOR, nims.getId(), "Senior Medical Social Worker & Family Counselor", null);
        User finance = createUser("finance@lifelink.org", encPwd, "Arvind Swamy", "+91 98765 43215", Role.FINANCE_REVIEWER, null, "Chartered Logistics Auditor", null);
        User donor = createUser("donor.family@lifelink.org", encPwd, "Ramesh Chandra", "+91 98765 43216", Role.PUBLIC_CONTRIBUTOR, null, "Family Representative", null);

        // 3. Seed Vehicles & Driver
        Vehicle v1 = new Vehicle();
        v1.setRegistrationNumber("TS09-EX-1008");
        v1.setVehicleType(VehicleType.ADVANCED_LIFE_SUPPORT_AMBULANCE);
        v1.setMakeModel("Force Traveller T1 3350 ALS");
        v1.setHospitalId(nims.getId());
        v1.setHasPerfusionBoxDock(true);
        v1.setHasGpsTelemetry(true);
        v1.setIsActive(true);
        vehicleRepository.save(v1);

        DriverProfile dp = new DriverProfile();
        dp.setUserId(driver.getId());
        dp.setDrivingLicenseNumber("TS0920150034291");
        dp.setLicenseExpiryDate(LocalDate.now().plusYears(4));
        dp.setBadgeNumber("HYD-POL-EMG-089");
        dp.setYearsExperience(12);
        dp.setEmergencyDrivingCertified(true);
        dp.setOnDuty(true);
        dp.setCurrentLatitude(17.4225);
        dp.setCurrentLongitude(78.4518);
        driverRepository.save(dp);

        // 4. Seed Active Donor Case
        DonorCase dc = new DonorCase();
        dc.setCaseNumber("CASE-2026-001");
        dc.setReferringHospitalId(nims.getId());
        dc.setReferredByUserId(icuDoc.getId());
        dc.setCoordinatorUserId(coordinator.getId());
        dc.setPatientUhid("NIMS-2026-ICU-8841");
        dc.setPatientAge(34);
        dc.setPatientGender("MALE");
        dc.setBloodGroup("O_POSITIVE");
        dc.setCauseOfAdmission("Severe Traumatic Brain Injury secondary to RTA");
        dc.setGlasgowComaScale(3);
        dc.setBrainDeathSuspectedAt(LocalDateTime.now().minusHours(18));
        dc.setPriority(CasePriority.STAT_CRITICAL);
        dc.setWorkflowStatus(WorkflowStatus.IN_TRANSIT_TO_RECIPIENT_CENTER);
        dc.setIsMedicoLegalCase(true);
        dc.setPoliceStationJurisdiction("Panjagutta Police Station, Hyderabad");
        dc.setMlcNumber("MLC-PJ-2026-042");
        dc.setCoordinatorNotes("Family consented for Heart, Liver, and Both Kidneys. Form 8 and 10 certified by 4 medical board doctors. Police NOC verified.");
        DonorCase savedCase = caseRepository.save(dc);

        // Organ Assessments
        OrganAssessment heart = createAssessment(savedCase.getId(), OrganType.HEART, AssessmentStatus.VIABLE, icuDoc.getId(), "Normal ECHO, EF 62%, Coronary angiography clear", true, 4);
        OrganAssessment liver = createAssessment(savedCase.getId(), OrganType.LIVER, AssessmentStatus.VIABLE, icuDoc.getId(), "LFT within normal limits, macroscopic look healthy", true, 10);
        OrganAssessment kidneyL = createAssessment(savedCase.getId(), OrganType.KIDNEY_LEFT, AssessmentStatus.VIABLE, icuDoc.getId(), "Creatinine 0.9 mg/dL, ultrasound normal", false, 24);
        OrganAssessment kidneyR = createAssessment(savedCase.getId(), OrganType.KIDNEY_RIGHT, AssessmentStatus.VIABLE, icuDoc.getId(), "Creatinine 0.9 mg/dL, ultrasound normal", false, 24);

        // Consent
        ConsentRecord cr = new ConsentRecord();
        cr.setCaseId(savedCase.getId());
        cr.setStatus(ConsentStatus.COMPLETED);
        cr.setLegalHeirName("Anitha Kumari");
        cr.setLegalHeirRelation("SPOUSE");
        cr.setLegalHeirContact("+91 98480 22334");
        cr.setFirstWitnessName("Rajesh Kumar (Brother)");
        cr.setSecondWitnessName("S. Prabhakar (Uncle)");
        cr.setCounselorUserId(counselor.getId());
        cr.setCounselingSummary("Family counseled over two sessions. Both witnesses signed Form 6 voluntarily with zero coercion.");
        cr.setConsentTimestamp(LocalDateTime.now().minusHours(8));
        consentRepository.save(cr);

        // Transport Assignment
        TransportAssignment ta = new TransportAssignment();
        ta.setTrackingNumber("TRP-2026-001");
        ta.setCaseId(savedCase.getId());
        ta.setOrganAssessmentId(heart.getId());
        ta.setSourceHospitalId(nims.getId());
        ta.setDestinationHospitalId(apollo.getId());
        ta.setVehicleId(v1.getId());
        ta.setDriverUserId(driver.getId());
        ta.setTrafficCoordinatorUserId(traffic.getId());
        ta.setStatus(TransportStatus.GREEN_CORRIDOR_ACTIVE);
        ta.setEstimatedDepartureTime(LocalDateTime.now().minusMinutes(25));
        ta.setActualDepartureTime(LocalDateTime.now().minusMinutes(20));
        ta.setEstimatedArrivalTime(LocalDateTime.now().plusMinutes(12));
        ta.setGreenCorridorRequested(true);
        ta.setGreenCorridorActive(true);
        ta.setEstimatedDistanceKm(12.4);
        ta.setEstimatedDurationMinutes(18);
        ta.setColdBoxTemperatureMinCelsius(2.0);
        ta.setColdBoxTemperatureMaxCelsius(4.0);
        ta.setLastReportedTemperatureCelsius(3.2);
        TransportAssignment savedTransport = transportRepository.save(ta);

        // Telemetry GPS points
        createLocation(savedTransport.getId(), 17.4225, 78.4518, 0.0, 3.1, 98, LocalDateTime.now().minusMinutes(20));
        createLocation(savedTransport.getId(), 17.4210, 78.4450, 48.5, 3.2, 97, LocalDateTime.now().minusMinutes(15));
        createLocation(savedTransport.getId(), 17.4180, 78.4320, 62.0, 3.2, 97, LocalDateTime.now().minusMinutes(10));
        createLocation(savedTransport.getId(), 17.4165, 78.4210, 58.4, 3.3, 96, LocalDateTime.now().minusMinutes(5));
        createLocation(savedTransport.getId(), 17.4158, 78.4150, 42.0, 3.2, 96, LocalDateTime.now().minusMinutes(1));

        // 5. Seed Funding Campaigns & Budgets
        FundingCampaign fc = new FundingCampaign();
        fc.setCampaignCode("CMP-2026-001");
        fc.setTitle("Rapid Perfusion Box & ALS Green Corridor Logistics: NIMS to Apollo");
        fc.setPurpose(CampaignPurpose.ORGAN_COLD_BOX_PURCHASE);
        fc.setCaseId(savedCase.getId());
        fc.setTransportAssignmentId(savedTransport.getId());
        fc.setTargetAmountInr(new BigDecimal("85000.00"));
        fc.setCollectedAmountInr(new BigDecimal("52500.00"));
        fc.setStatus(CampaignStatus.ACTIVE);
        fc.setDescription("Logistical funding for sub-zero temperature preservation equipment, emergency driver deployment, and dedicated traffic signal pilot escort between NIMS Punjagutta and Apollo Jubilee Hills.");
        fc.setCreatedByUserId(coordinator.getId());
        fc.setApprovedByUserId(finance.getId());
        FundingCampaign savedCampaign = campaignRepository.save(fc);

        createBudget(savedCampaign.getId(), "Temperature-Monitored Cold Transport Box Calibration", new BigDecimal("35000.00"), new BigDecimal("35000.00"), "Dual-sensor sterile preservation chamber");
        createBudget(savedCampaign.getId(), "Traffic Pilot Police Escort & Green Corridor Mobilization", new BigDecimal("25000.00"), new BigDecimal("17500.00"), "Statutory logistics administrative support fee");
        createBudget(savedCampaign.getId(), "Emergency ALS Ambulance Fuel & Rapid Route Tolls", new BigDecimal("25000.00"), BigDecimal.ZERO, "Dedicated ambulance standby & inter-hospital transit fuel");

        // Contribution & Receipt
        ContributionTransaction txn = new ContributionTransaction();
        txn.setTransactionReference("TXN-2026-088194");
        txn.setCampaignId(savedCampaign.getId());
        txn.setContributorUserId(donor.getId());
        txn.setContributorName("Ramesh Chandra");
        txn.setContributorEmail("donor.family@lifelink.org");
        txn.setContributorPhone("+91 98765 43216");
        txn.setPanNumber("ABCDE1234F");
        txn.setAmountInr(new BigDecimal("25000.00"));
        txn.setPaymentMethod("UPI");
        txn.setGatewayOrderId("order_ll_2026_demo");
        txn.setGatewayPaymentId("pay_ll_live_9921");
        txn.setGatewaySignature("sig_verified_demo_mock_ok");
        txn.setStatus(PaymentStatus.SUCCESS);
        txn.setIs80gClaimed(true);
        ContributionTransaction savedTxn = transactionRepository.save(txn);

        Receipt r = new Receipt();
        r.setReceiptNumber("REC-2026-000101");
        r.setTransactionId(savedTxn.getId());
        r.setReceiptDate(LocalDate.now());
        r.setContributorName("Ramesh Chandra");
        r.setContributorPan("ABCDE1234F");
        r.setAmountInr(new BigDecimal("25000.00"));
        r.setTaxExemptionSection("SECTION_80G");
        r.setDigitalSignatureHash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        r.setIsVerified(true);
        receiptRepository.save(r);
    }

    private Hospital createHospital(String code, String name, HospitalType type, String reg, String address, String city, String state, String pin, Double lat, Double lng, String phone, String helpline, String nodalName, String nodalEmail, Boolean isRet, Boolean isTrp) {
        Hospital h = new Hospital();
        h.setHospitalCode(code);
        h.setName(name);
        h.setHospitalType(type);
        h.setNothoRegistrationNumber(reg);
        h.setAddressLine(address);
        h.setCity(city);
        h.setState(state);
        h.setPincode(pin);
        h.setLatitude(lat);
        h.setLongitude(lng);
        h.setEmergencyPhone(phone);
        h.setOrganTransplantHelpline(helpline);
        h.setNodalOfficerName(nodalName);
        h.setNodalOfficerEmail(nodalEmail);
        h.setIsRetrievalCenter(isRet);
        h.setIsTransplantCenter(isTrp);
        h.setIsActive(true);
        return hospitalRepository.save(h);
    }

    private User createUser(String email, String pwd, String name, String phone, Role role, Long hospId, String desig, String lic) {
        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(pwd);
        u.setFullName(name);
        u.setPhone(phone);
        u.setRole(role);
        u.setHospitalId(hospId);
        u.setDesignation(desig);
        u.setMedicalLicenseNumber(lic);
        u.setIsVerified(true);
        u.setIsActive(true);
        return userRepository.save(u);
    }

    private OrganAssessment createAssessment(Long caseId, OrganType type, AssessmentStatus status, Long docId, String notes, Boolean critical, Integer hours) {
        OrganAssessment oa = new OrganAssessment();
        oa.setCaseId(caseId);
        oa.setOrganType(type);
        oa.setStatus(status);
        oa.setAssessingPhysicianId(docId);
        oa.setClinicalNotes(notes);
        oa.setIsIschemiaTimeCritical(critical);
        oa.setMaxColdIschemiaHours(hours);
        oa.setRetrievalScheduledAt(LocalDateTime.now().minusHours(1));
        return assessmentRepository.save(oa);
    }

    private void createLocation(Long transportId, Double lat, Double lng, Double speed, Double temp, Integer battery, LocalDateTime time) {
        LocationUpdate lu = new LocationUpdate();
        lu.setTransportAssignmentId(transportId);
        lu.setLatitude(lat);
        lu.setLongitude(lng);
        lu.setSpeedKmh(speed);
        lu.setHeadingDegrees(45.0);
        lu.setColdBoxTempCelsius(temp);
        lu.setBatteryLevelPercent(battery);
        lu.setRecordedAt(time);
        locationRepository.save(lu);
    }

    private void createBudget(Long campaignId, String cat, BigDecimal allocated, BigDecimal spent, String just) {
        FundingBudget b = new FundingBudget();
        b.setCampaignId(campaignId);
        b.setCategoryName(cat);
        b.setAllocatedAmountInr(allocated);
        b.setSpentAmountInr(spent);
        b.setJustification(just);
        budgetRepository.save(b);
    }
}
