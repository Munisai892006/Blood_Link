package com.lifelink.dto;

import com.lifelink.enums.ConsentStatus;
import java.time.LocalDateTime;

public class ConsentRecordDto {
    private Long id;
    private Long caseId;
    private ConsentStatus status;
    private String legalHeirName;
    private String legalHeirRelation;
    private String legalHeirContact;
    private String firstWitnessName;
    private String secondWitnessName;
    private Long counselorUserId;
    private String counselingSummary;
    private LocalDateTime consentTimestamp;

    public ConsentRecordDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public ConsentStatus getStatus() { return status; }
    public void setStatus(ConsentStatus status) { this.status = status; }

    public String getLegalHeirName() { return legalHeirName; }
    public void setLegalHeirName(String legalHeirName) { this.legalHeirName = legalHeirName; }

    public String getLegalHeirRelation() { return legalHeirRelation; }
    public void setLegalHeirRelation(String legalHeirRelation) { this.legalHeirRelation = legalHeirRelation; }

    public String getLegalHeirContact() { return legalHeirContact; }
    public void setLegalHeirContact(String legalHeirContact) { this.legalHeirContact = legalHeirContact; }

    public String getFirstWitnessName() { return firstWitnessName; }
    public void setFirstWitnessName(String firstWitnessName) { this.firstWitnessName = firstWitnessName; }

    public String getSecondWitnessName() { return secondWitnessName; }
    public void setSecondWitnessName(String secondWitnessName) { this.secondWitnessName = secondWitnessName; }

    public Long getCounselorUserId() { return counselorUserId; }
    public void setCounselorUserId(Long counselorUserId) { this.counselorUserId = counselorUserId; }

    public String getCounselingSummary() { return counselingSummary; }
    public void setCounselingSummary(String counselingSummary) { this.counselingSummary = counselingSummary; }

    public LocalDateTime getConsentTimestamp() { return consentTimestamp; }
    public void setConsentTimestamp(LocalDateTime consentTimestamp) { this.consentTimestamp = consentTimestamp; }
}
