package com.lifelink.dto;

import com.lifelink.enums.AssessmentStatus;
import com.lifelink.enums.OrganType;
import java.time.LocalDateTime;

public class OrganAssessmentDto {
    private Long id;
    private Long caseId;
    private OrganType organType;
    private AssessmentStatus status;
    private Long assessingPhysicianId;
    private String clinicalNotes;
    private Boolean isIschemiaTimeCritical;
    private Integer maxColdIschemiaHours;
    private LocalDateTime retrievalScheduledAt;

    public OrganAssessmentDto() {}

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
}
