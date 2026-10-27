package com.lifelink.entity;

import com.lifelink.enums.CasePriority;
import com.lifelink.enums.WorkflowStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "donor_cases")
public class DonorCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_number", nullable = false, unique = true, length = 32)
    private String caseNumber;

    @Column(name = "referring_hospital_id", nullable = false)
    private Long referringHospitalId;

    @Column(name = "referred_by_user_id", nullable = false)
    private Long referredByUserId;

    @Column(name = "coordinator_user_id")
    private Long coordinatorUserId;

    @Column(name = "patient_uhid", length = 64)
    private String patientUhid;

    @Column(name = "patient_age")
    private Integer patientAge;

    @Column(name = "patient_gender", length = 16)
    private String patientGender;

    @Column(name = "blood_group", nullable = false, length = 32)
    private String bloodGroup;

    @Column(name = "cause_of_admission", columnDefinition = "TEXT")
    private String causeOfAdmission;

    @Column(name = "glasgow_coma_scale")
    private Integer glasgowComaScale;

    @Column(name = "brain_death_suspected_at")
    private LocalDateTime brainDeathSuspectedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 16)
    private CasePriority priority = CasePriority.STANDARD;

    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_status", nullable = false, length = 32)
    private WorkflowStatus workflowStatus = WorkflowStatus.POTENTIAL_DONOR_IDENTIFIED;

    @Column(name = "is_medico_legal_case")
    private Boolean isMedicoLegalCase = false;

    @Column(name = "police_station_jurisdiction", length = 128)
    private String policeStationJurisdiction;

    @Column(name = "mlc_number", length = 64)
    private String mlcNumber;

    @Column(name = "coordinator_notes", columnDefinition = "TEXT")
    private String coordinatorNotes;

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

    public DonorCase() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }

    public Long getReferringHospitalId() { return referringHospitalId; }
    public void setReferringHospitalId(Long referringHospitalId) { this.referringHospitalId = referringHospitalId; }

    public Long getReferredByUserId() { return referredByUserId; }
    public void setReferredByUserId(Long referredByUserId) { this.referredByUserId = referredByUserId; }

    public Long getCoordinatorUserId() { return coordinatorUserId; }
    public void setCoordinatorUserId(Long coordinatorUserId) { this.coordinatorUserId = coordinatorUserId; }

    public String getPatientUhid() { return patientUhid; }
    public void setPatientUhid(String patientUhid) { this.patientUhid = patientUhid; }

    public Integer getPatientAge() { return patientAge; }
    public void setPatientAge(Integer patientAge) { this.patientAge = patientAge; }

    public String getPatientGender() { return patientGender; }
    public void setPatientGender(String patientGender) { this.patientGender = patientGender; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getCauseOfAdmission() { return causeOfAdmission; }
    public void setCauseOfAdmission(String causeOfAdmission) { this.causeOfAdmission = causeOfAdmission; }

    public Integer getGlasgowComaScale() { return glasgowComaScale; }
    public void setGlasgowComaScale(Integer glasgowComaScale) { this.glasgowComaScale = glasgowComaScale; }

    public LocalDateTime getBrainDeathSuspectedAt() { return brainDeathSuspectedAt; }
    public void setBrainDeathSuspectedAt(LocalDateTime brainDeathSuspectedAt) { this.brainDeathSuspectedAt = brainDeathSuspectedAt; }

    public CasePriority getPriority() { return priority; }
    public void setPriority(CasePriority priority) { this.priority = priority; }

    public WorkflowStatus getWorkflowStatus() { return workflowStatus; }
    public void setWorkflowStatus(WorkflowStatus workflowStatus) { this.workflowStatus = workflowStatus; }

    public Boolean getIsMedicoLegalCase() { return isMedicoLegalCase; }
    public void setIsMedicoLegalCase(Boolean isMedicoLegalCase) { this.isMedicoLegalCase = isMedicoLegalCase; }

    public String getPoliceStationJurisdiction() { return policeStationJurisdiction; }
    public void setPoliceStationJurisdiction(String policeStationJurisdiction) { this.policeStationJurisdiction = policeStationJurisdiction; }

    public String getMlcNumber() { return mlcNumber; }
    public void setMlcNumber(String mlcNumber) { this.mlcNumber = mlcNumber; }

    public String getCoordinatorNotes() { return coordinatorNotes; }
    public void setCoordinatorNotes(String coordinatorNotes) { this.coordinatorNotes = coordinatorNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
