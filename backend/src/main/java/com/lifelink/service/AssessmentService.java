package com.lifelink.service;

import com.lifelink.dto.OrganAssessmentDto;
import com.lifelink.entity.AuditLog;
import com.lifelink.entity.OrganAssessment;
import com.lifelink.exception.ResourceNotFoundException;
import com.lifelink.repository.AuditLogRepository;
import com.lifelink.repository.OrganAssessmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AssessmentService {

    private final OrganAssessmentRepository assessmentRepository;
    private final AuditLogRepository auditLogRepository;

    public AssessmentService(OrganAssessmentRepository assessmentRepository, AuditLogRepository auditLogRepository) {
        this.assessmentRepository = assessmentRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public List<OrganAssessment> getAssessmentsByCaseId(Long caseId) {
        return assessmentRepository.findByCaseId(caseId);
    }

    public OrganAssessment getAssessmentById(Long id) {
        return assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organ assessment not found with id: " + id));
    }

    @Transactional
    public OrganAssessment updateAssessment(Long id, OrganAssessmentDto dto, Long userId) {
        OrganAssessment assessment = getAssessmentById(id);

        if (dto.getStatus() != null) assessment.setStatus(dto.getStatus());
        if (dto.getClinicalNotes() != null) assessment.setClinicalNotes(dto.getClinicalNotes());
        if (dto.getIsIschemiaTimeCritical() != null) assessment.setIsIschemiaTimeCritical(dto.getIsIschemiaTimeCritical());
        if (dto.getMaxColdIschemiaHours() != null) assessment.setMaxColdIschemiaHours(dto.getMaxColdIschemiaHours());
        if (dto.getRetrievalScheduledAt() != null) assessment.setRetrievalScheduledAt(dto.getRetrievalScheduledAt());
        assessment.setAssessingPhysicianId(userId);

        OrganAssessment saved = assessmentRepository.save(assessment);

        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction("UPDATE_ORGAN_ASSESSMENT");
        audit.setEntityType("ORGAN_ASSESSMENT");
        audit.setEntityId(saved.getId());
        audit.setDetails("Updated " + saved.getOrganType() + " status to " + saved.getStatus());
        auditLogRepository.save(audit);

        return saved;
    }
}
