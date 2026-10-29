package com.lifelink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_certifications")
public class MedicalCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false)
    private Long caseId;

    @Column(name = "declaration_number", nullable = false)
    private Integer declarationNumber; // 1 or 2 (Form 8 or Form 10)

    @Column(name = "examined_at", nullable = false)
    private LocalDateTime examinedAt;

    @Column(name = "doctor_one_id", nullable = false)
    private Long doctorOneId;

    @Column(name = "doctor_two_id", nullable = false)
    private Long doctorTwoId;

    @Column(name = "doctor_three_id", nullable = false)
    private Long doctorThreeId;

    @Column(name = "doctor_four_id", nullable = false)
    private Long doctorFourId;

    @Column(name = "apnea_test_performed")
    private Boolean apneaTestPerformed = true;

    @Column(name = "apnea_test_pco2_target_reached")
    private Boolean apneaTestPco2TargetReached = true;

    @Column(name = "all_brainstem_reflexes_absent")
    private Boolean allBrainstemReflexesAbsent = true;

    @Column(name = "certification_completed")
    private Boolean certificationCompleted = false;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

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

    public MedicalCertification() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public Integer getDeclarationNumber() { return declarationNumber; }
    public void setDeclarationNumber(Integer declarationNumber) { this.declarationNumber = declarationNumber; }

    public LocalDateTime getExaminedAt() { return examinedAt; }
    public void setExaminedAt(LocalDateTime examinedAt) { this.examinedAt = examinedAt; }

    public Long getDoctorOneId() { return doctorOneId; }
    public void setDoctorOneId(Long doctorOneId) { this.doctorOneId = doctorOneId; }

    public Long getDoctorTwoId() { return doctorTwoId; }
    public void setDoctorTwoId(Long doctorTwoId) { this.doctorTwoId = doctorTwoId; }

    public Long getDoctorThreeId() { return doctorThreeId; }
    public void setDoctorThreeId(Long doctorThreeId) { this.doctorThreeId = doctorThreeId; }

    public Long getDoctorFourId() { return doctorFourId; }
    public void setDoctorFourId(Long doctorFourId) { this.doctorFourId = doctorFourId; }

    public Boolean getApneaTestPerformed() { return apneaTestPerformed; }
    public void setApneaTestPerformed(Boolean apneaTestPerformed) { this.apneaTestPerformed = apneaTestPerformed; }

    public Boolean getApneaTestPco2TargetReached() { return apneaTestPco2TargetReached; }
    public void setApneaTestPco2TargetReached(Boolean apneaTestPco2TargetReached) { this.apneaTestPco2TargetReached = apneaTestPco2TargetReached; }

    public Boolean getAllBrainstemReflexesAbsent() { return allBrainstemReflexesAbsent; }
    public void setAllBrainstemReflexesAbsent(Boolean allBrainstemReflexesAbsent) { this.allBrainstemReflexesAbsent = allBrainstemReflexesAbsent; }

    public Boolean getCertificationCompleted() { return certificationCompleted; }
    public void setCertificationCompleted(Boolean certificationCompleted) { this.certificationCompleted = certificationCompleted; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
