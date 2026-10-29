package com.lifelink.dto;

import com.lifelink.enums.CasePriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class CreateCaseRequest {
    @NotNull(message = "Referring Hospital ID is required")
    private Long referringHospitalId;

    private String patientUhid;
    private Integer patientAge;
    private String patientGender;

    @NotBlank(message = "Blood group is required")
    private String bloodGroup;

    private String causeOfAdmission;
    private Integer glasgowComaScale;
    private LocalDateTime brainDeathSuspectedAt;
    private CasePriority priority = CasePriority.STANDARD;
    private Boolean isMedicoLegalCase = false;
    private String policeStationJurisdiction;
    private String mlcNumber;
    private String coordinatorNotes;

    public CreateCaseRequest() {}

    public Long getReferringHospitalId() { return referringHospitalId; }
    public void setReferringHospitalId(Long referringHospitalId) { this.referringHospitalId = referringHospitalId; }

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

    public Boolean getIsMedicoLegalCase() { return isMedicoLegalCase; }
    public void setIsMedicoLegalCase(Boolean isMedicoLegalCase) { this.isMedicoLegalCase = isMedicoLegalCase; }

    public String getPoliceStationJurisdiction() { return policeStationJurisdiction; }
    public void setPoliceStationJurisdiction(String policeStationJurisdiction) { this.policeStationJurisdiction = policeStationJurisdiction; }

    public String getMlcNumber() { return mlcNumber; }
    public void setMlcNumber(String mlcNumber) { this.mlcNumber = mlcNumber; }

    public String getCoordinatorNotes() { return coordinatorNotes; }
    public void setCoordinatorNotes(String coordinatorNotes) { this.coordinatorNotes = coordinatorNotes; }
}
