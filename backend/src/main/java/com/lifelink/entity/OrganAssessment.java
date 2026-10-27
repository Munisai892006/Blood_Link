package com.lifelink.entity;

import com.lifelink.enums.AssessmentStatus;
import com.lifelink.enums.OrganType;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "organ_assessments")
public class OrganAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false)
    private Long caseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "organ_type", nullable = false, length = 32)
    private OrganType organType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private AssessmentStatus status = AssessmentStatus.PENDING;

    @Column(name = "assessing_physician_id")
    private Long assessingPhysicianId;

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    @Column(name = "is_ischemia_time_critical")
    private Boolean isIschemiaTimeCritical = true;

    @Column(name = "max_cold_ischemia_hours")
    private Integer maxColdIschemiaHours;

    @Column(name = "retrieval_scheduled_at")
    private LocalDateTime retrievalScheduledAt;

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

    public OrganAssessment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public OrganType getOrganType() { return organType; }
    public void setOrganType(OrganType organType) { this.organType = organType; }

    public AssessmentStatus getStatus() { return status; }
    public void setStatus(AssessmentStatus status) { this.status = status; }

    public Long getAssessingPhysicianId() { return assessingPhysicianId; }
    public void setAssessingPhysicianId(Long assessingPhysicianId) { this.assessingPhysicianId = assessingPhysicianId; }

    public String getClinicalNotes() { return clinicalNotes; }
    public void setClinicalNotes(String clinicalNotes) { this.clinicalNotes = clinicalNotes; }

    public Boolean getIsIschemiaTimeCritical() { return isIschemiaTimeCritical; }
    public void setIsIschemiaTimeCritical(Boolean isIschemiaTimeCritical) { this.isIschemiaTimeCritical = isIschemiaTimeCritical; }

    public Integer getMaxColdIschemiaHours() { return maxColdIschemiaHours; }
    public void setMaxColdIschemiaHours(Integer maxColdIschemiaHours) { this.maxColdIschemiaHours = maxColdIschemiaHours; }

    public LocalDateTime getRetrievalScheduledAt() { return retrievalScheduledAt; }
    public void setRetrievalScheduledAt(LocalDateTime retrievalScheduledAt) { this.retrievalScheduledAt = retrievalScheduledAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
