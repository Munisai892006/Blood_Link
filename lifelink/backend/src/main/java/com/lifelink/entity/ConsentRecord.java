package com.lifelink.entity;

import com.lifelink.enums.ConsentStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "consent_records")
public class ConsentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false)
    private Long caseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private ConsentStatus status = ConsentStatus.NOT_STARTED;

    @Column(name = "legal_heir_name", length = 128)
    private String legalHeirName;

    @Column(name = "legal_heir_relation", length = 64)
    private String legalHeirRelation;

    @Column(name = "legal_heir_contact", length = 32)
    private String legalHeirContact;

    @Column(name = "first_witness_name", length = 128)
    private String firstWitnessName;

    @Column(name = "second_witness_name", length = 128)
    private String secondWitnessName;

    @Column(name = "counselor_user_id")
    private Long counselorUserId;

    @Column(name = "counseling_summary", columnDefinition = "TEXT")
    private String counselingSummary;

    @Column(name = "consent_timestamp")
    private LocalDateTime consentTimestamp;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public ConsentRecord() {}

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
