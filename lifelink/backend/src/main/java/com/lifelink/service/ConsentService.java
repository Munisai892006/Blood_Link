package com.lifelink.service;

import com.lifelink.dto.ConsentRecordDto;
import com.lifelink.entity.AuditLog;
import com.lifelink.entity.ConsentRecord;
import com.lifelink.exception.ResourceNotFoundException;
import com.lifelink.repository.AuditLogRepository;
import com.lifelink.repository.ConsentRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ConsentService {

    private final ConsentRecordRepository consentRepository;
    private final AuditLogRepository auditLogRepository;

    public ConsentService(ConsentRecordRepository consentRepository, AuditLogRepository auditLogRepository) {
        this.consentRepository = consentRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public ConsentRecord getConsentByCaseId(Long caseId) {
        return consentRepository.findByCaseId(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Consent record not found for case id: " + caseId));
    }

    @Transactional
    public ConsentRecord updateConsent(Long caseId, ConsentRecordDto dto, Long userId) {
        ConsentRecord record = consentRepository.findByCaseId(caseId)
                .orElseGet(() -> {
                    ConsentRecord newRec = new ConsentRecord();
                    newRec.setCaseId(caseId);
                    return newRec;
                });

        if (dto.getStatus() != null) record.setStatus(dto.getStatus());
        if (dto.getLegalHeirName() != null) record.setLegalHeirName(dto.getLegalHeirName());
        if (dto.getLegalHeirRelation() != null) record.setLegalHeirRelation(dto.getLegalHeirRelation());
        if (dto.getLegalHeirContact() != null) record.setLegalHeirContact(dto.getLegalHeirContact());
        if (dto.getFirstWitnessName() != null) record.setFirstWitnessName(dto.getFirstWitnessName());
        if (dto.getSecondWitnessName() != null) record.setSecondWitnessName(dto.getSecondWitnessName());
        if (dto.getCounselingSummary() != null) record.setCounselingSummary(dto.getCounselingSummary());

        record.setCounselorUserId(userId);
        if (record.getConsentTimestamp() == null) {
            record.setConsentTimestamp(LocalDateTime.now());
        }

        ConsentRecord saved = consentRepository.save(record);

        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction("UPDATE_CONSENT_RECORD");
        audit.setEntityType("CONSENT_RECORD");
        audit.setEntityId(saved.getId());
        audit.setDetails("Updated consent status to " + saved.getStatus() + " by heir " + saved.getLegalHeirName());
        auditLogRepository.save(audit);

        return saved;
    }
}
