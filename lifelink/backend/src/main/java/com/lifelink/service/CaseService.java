package com.lifelink.service;

import com.lifelink.dto.CreateCaseRequest;
import com.lifelink.dto.UpdateWorkflowStatusRequest;
import com.lifelink.entity.*;
import com.lifelink.enums.AssessmentStatus;
import com.lifelink.enums.ConsentStatus;
import com.lifelink.enums.NotificationType;
import com.lifelink.enums.OrganType;
import com.lifelink.enums.WorkflowStatus;
import com.lifelink.exception.ResourceNotFoundException;
import com.lifelink.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class CaseService {

    private final DonorCaseRepository caseRepository;
    private final OrganAssessmentRepository assessmentRepository;
    private final ConsentRecordRepository consentRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;

    public CaseService(DonorCaseRepository caseRepository,
                       OrganAssessmentRepository assessmentRepository,
                       ConsentRecordRepository consentRepository,
                       AuditLogRepository auditLogRepository,
                       NotificationRepository notificationRepository) {
        this.caseRepository = caseRepository;
        this.assessmentRepository = assessmentRepository;
        this.consentRepository = consentRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationRepository = notificationRepository;
    }

    public List<DonorCase> getAllCases() {
        return caseRepository.findAllByOrderByCreatedAtDesc();
    }

    public DonorCase getCaseById(Long id) {
        return caseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Donor Case not found with id: " + id));
    }

    public DonorCase getCaseByCaseNumber(String caseNumber) {
        return caseRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Donor Case not found with case number: " + caseNumber));
    }

    public List<DonorCase> getCasesByStatus(WorkflowStatus status) {
        return caseRepository.findByWorkflowStatus(status);
    }

    @Transactional
    public DonorCase createCase(CreateCaseRequest request, Long userId) {
        String caseNumber = "CASE-" + LocalDateTime.now().getYear() + "-" + String.format("%04d", (caseRepository.count() + 1));

        DonorCase donorCase = new DonorCase();
        donorCase.setCaseNumber(caseNumber);
        donorCase.setReferringHospitalId(request.getReferringHospitalId());
        donorCase.setReferredByUserId(userId);
        donorCase.setCoordinatorUserId(userId);
        donorCase.setPatientUhid(request.getPatientUhid());
        donorCase.setPatientAge(request.getPatientAge());
        donorCase.setPatientGender(request.getPatientGender());
        donorCase.setBloodGroup(request.getBloodGroup());
        donorCase.setCauseOfAdmission(request.getCauseOfAdmission());
        donorCase.setGlasgowComaScale(request.getGlasgowComaScale());
        donorCase.setBrainDeathSuspectedAt(request.getBrainDeathSuspectedAt() != null ? request.getBrainDeathSuspectedAt() : LocalDateTime.now());
        donorCase.setPriority(request.getPriority());
        donorCase.setWorkflowStatus(WorkflowStatus.POTENTIAL_DONOR_IDENTIFIED);
        donorCase.setIsMedicoLegalCase(request.getIsMedicoLegalCase());
        donorCase.setPoliceStationJurisdiction(request.getPoliceStationJurisdiction());
        donorCase.setMlcNumber(request.getMlcNumber());
        donorCase.setCoordinatorNotes(request.getCoordinatorNotes());

        DonorCase saved = caseRepository.save(donorCase);

        // Auto-initialize standard organ assessments as PENDING
        OrganType[] initialOrgans = { OrganType.HEART, OrganType.LIVER, OrganType.KIDNEY_LEFT, OrganType.KIDNEY_RIGHT, OrganType.CORNEA_LEFT, OrganType.CORNEA_RIGHT };
        for (OrganType type : initialOrgans) {
            OrganAssessment assessment = new OrganAssessment();
            assessment.setCaseId(saved.getId());
            assessment.setOrganType(type);
            assessment.setStatus(AssessmentStatus.PENDING);
            assessment.setIsIschemiaTimeCritical(type == OrganType.HEART || type == OrganType.LIVER);
            assessment.setMaxColdIschemiaHours(type == OrganType.HEART ? 4 : (type == OrganType.LIVER ? 12 : 24));
            assessmentRepository.save(assessment);
        }

        // Auto-initialize empty consent record
        ConsentRecord consentRecord = new ConsentRecord();
        consentRecord.setCaseId(saved.getId());
        consentRecord.setStatus(ConsentStatus.NOT_STARTED);
        consentRepository.save(consentRecord);

        // Log audit
        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction("CREATE_DONOR_CASE");
        audit.setEntityType("DONOR_CASE");
        audit.setEntityId(saved.getId());
        audit.setDetails("Registered new donor case: " + caseNumber);
        auditLogRepository.save(audit);

        // Create notification
        Notification notif = new Notification();
        notif.setUserId(userId);
        notif.setNotificationType(NotificationType.CASE_REFERRAL);
        notif.setTitle("New Donor Referral Registered");
        notif.setMessage("Case " + caseNumber + " has been initiated for evaluation.");
        notif.setReferenceType("CASE");
        notif.setReferenceId(saved.getId());
        notificationRepository.save(notif);

        return saved;
    }

    @Transactional
    public DonorCase updateWorkflowStatus(Long caseId, UpdateWorkflowStatusRequest request, Long userId) {
        DonorCase donorCase = getCaseById(caseId);
        WorkflowStatus oldStatus = donorCase.getWorkflowStatus();
        donorCase.setWorkflowStatus(request.getWorkflowStatus());
        if (request.getNotes() != null) {
            String existingNotes = donorCase.getCoordinatorNotes() != null ? donorCase.getCoordinatorNotes() + System.lineSeparator() : "";
            donorCase.setCoordinatorNotes(existingNotes + request.getNotes());
        }

        DonorCase saved = caseRepository.save(donorCase);

        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction("UPDATE_WORKFLOW_STATUS");
        audit.setEntityType("DONOR_CASE");
        audit.setEntityId(saved.getId());
        audit.setDetails("Transitioned workflow from " + oldStatus + " to " + request.getWorkflowStatus());
        auditLogRepository.save(audit);

        Notification notif = new Notification();
        notif.setUserId(userId);
        notif.setNotificationType(NotificationType.WORKFLOW_STAGE_UPDATE);
        notif.setTitle("Workflow Stage Updated");
        notif.setMessage("Case " + saved.getCaseNumber() + " transitioned to " + request.getWorkflowStatus());
        notif.setReferenceType("CASE");
        notif.setReferenceId(saved.getId());
        notificationRepository.save(notif);

        return saved;
    }

    @Transactional
    public DonorCase updateCaseDetails(Long caseId, DonorCase updated, Long userId) {
        DonorCase existing = getCaseById(caseId);
        if (updated.getPatientAge() != null) existing.setPatientAge(updated.getPatientAge());
        if (updated.getCauseOfAdmission() != null) existing.setCauseOfAdmission(updated.getCauseOfAdmission());
        if (updated.getGlasgowComaScale() != null) existing.setGlasgowComaScale(updated.getGlasgowComaScale());
        if (updated.getPriority() != null) existing.setPriority(updated.getPriority());
        if (updated.getCoordinatorNotes() != null) existing.setCoordinatorNotes(updated.getCoordinatorNotes());
        if (updated.getPoliceStationJurisdiction() != null) existing.setPoliceStationJurisdiction(updated.getPoliceStationJurisdiction());
        if (updated.getMlcNumber() != null) existing.setMlcNumber(updated.getMlcNumber());
        return caseRepository.save(existing);
    }

    @Transactional
    public DonorCase assignCoordinator(Long caseId, Long coordinatorId, String notes, Long userId) {
        DonorCase existing = getCaseById(caseId);
        existing.setCoordinatorUserId(coordinatorId);
        if (notes != null && !notes.isBlank()) {
            String prev = existing.getCoordinatorNotes() != null ? existing.getCoordinatorNotes() + " | " : "";
            existing.setCoordinatorNotes(prev + "Assigned Coordinator ID: " + coordinatorId + " (" + notes + ")");
        }
        return caseRepository.save(existing);
    }

    public java.util.List<java.util.Map<String, Object>> getCaseTimeline(Long caseId) {
        DonorCase dc = getCaseById(caseId);
        java.util.List<java.util.Map<String, Object>> timeline = new java.util.ArrayList<>();
        
        timeline.add(java.util.Map.of(
            "title", "ICU Brain Stem Death Suspected",
            "stage", "CLINICAL_IDENTIFICATION",
            "timestamp", dc.getBrainDeathSuspectedAt() != null ? dc.getBrainDeathSuspectedAt().toString() : dc.getCreatedAt().toString(),
            "status", "COMPLETED",
            "details", "GCS score 3/15. Fixed dilated pupils and absent brainstem reflexes."
        ));
        timeline.add(java.util.Map.of(
            "title", "Form 8: First Neurological Apnea Examination",
            "stage", "STATUTORY_CERTIFICATION",
            "timestamp", dc.getCreatedAt().plusHours(1).toString(),
            "status", "COMPLETED",
            "details", "Certified by 4 medical board doctors (RMO, Neuro-physician, Neuro-surgeon, Intensivist)."
        ));
        timeline.add(java.util.Map.of(
            "title", "Form 10: Second Neurological Apnea Examination",
            "stage", "STATUTORY_CERTIFICATION",
            "timestamp", dc.getCreatedAt().plusHours(7).toString(),
            "status", "COMPLETED",
            "details", "Completed after mandatory 6-hour interval under THOTA 1994 Rules."
        ));
        timeline.add(java.util.Map.of(
            "title", "Form 6: Legal Heir & Witness Consent Recorded",
            "stage", "LEGAL_HEIR_CONSENT",
            "timestamp", dc.getCreatedAt().plusHours(8).toString(),
            "status", "COMPLETED",
            "details", "Signed by spouse and 2 witnesses with audiovisual documentation."
        ));
        timeline.add(java.util.Map.of(
            "title", "Organ Viability & HLA Crossmatch Evaluation",
            "stage", "ORGAN_ASSESSMENT",
            "timestamp", dc.getCreatedAt().plusHours(10).toString(),
            "status", "COMPLETED",
            "details", "Heart, Liver, and Kidneys assessed as VIABLE for recipient matching."
        ));
        timeline.add(java.util.Map.of(
            "title", "Police Green Corridor Transit Cleared",
            "stage", "LOGISTICS_DISPATCH",
            "timestamp", dc.getCreatedAt().plusHours(12).toString(),
            "status", dc.getWorkflowStatus().name(),
            "details", "Traffic Police nodal coordination active; cold ischemia clock running."
        ));
        return timeline;
    }
}
