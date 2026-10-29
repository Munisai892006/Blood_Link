package com.lifelink.entity;

import com.lifelink.enums.CampaignPurpose;
import com.lifelink.enums.CampaignStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "funding_campaigns")
public class FundingCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_code", nullable = false, unique = true, length = 32)
    private String campaignCode;

    @Column(name = "title", nullable = false, length = 191)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 64)
    private CampaignPurpose purpose;

    @Column(name = "case_id")
    private Long caseId;

    @Column(name = "transport_assignment_id")
    private Long transportAssignmentId;

    @Column(name = "target_amount_inr", nullable = false, precision = 12, scale = 2)
    private BigDecimal targetAmountInr;

    @Column(name = "collected_amount_inr", precision = 12, scale = 2)
    private BigDecimal collectedAmountInr = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private CampaignStatus status = CampaignStatus.DRAFT;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

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

    public FundingCampaign() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCampaignCode() { return campaignCode; }
    public void setCampaignCode(String campaignCode) { this.campaignCode = campaignCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public CampaignPurpose getPurpose() { return purpose; }
    public void setPurpose(CampaignPurpose purpose) { this.purpose = purpose; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public Long getTransportAssignmentId() { return transportAssignmentId; }
    public void setTransportAssignmentId(Long transportAssignmentId) { this.transportAssignmentId = transportAssignmentId; }

    public BigDecimal getTargetAmountInr() { return targetAmountInr; }
    public void setTargetAmountInr(BigDecimal targetAmountInr) { this.targetAmountInr = targetAmountInr; }

    public BigDecimal getCollectedAmountInr() { return collectedAmountInr; }
    public void setCollectedAmountInr(BigDecimal collectedAmountInr) { this.collectedAmountInr = collectedAmountInr; }

    public CampaignStatus getStatus() { return status; }
    public void setStatus(CampaignStatus status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }

    public Long getApprovedByUserId() { return approvedByUserId; }
    public void setApprovedByUserId(Long approvedByUserId) { this.approvedByUserId = approvedByUserId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
