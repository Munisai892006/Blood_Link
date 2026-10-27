package com.lifelink.entity;

import com.lifelink.enums.HospitalType;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospitals")
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hospital_code", nullable = false, unique = true, length = 32)
    private String hospitalCode;

    @Column(name = "name", nullable = false, length = 191)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "hospital_type", nullable = false, length = 32)
    private HospitalType hospitalType = HospitalType.GENERAL_HOSPITAL;

    @Column(name = "notho_registration_number", length = 64)
    private String nothoRegistrationNumber;

    @Column(name = "address_line", nullable = false, columnDefinition = "TEXT")
    private String addressLine;

    @Column(name = "city", nullable = false, length = 64)
    private String city;

    @Column(name = "state", nullable = false, length = 64)
    private String state;

    @Column(name = "pincode", nullable = false, length = 16)
    private String pincode;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "emergency_phone", nullable = false, length = 32)
    private String emergencyPhone;

    @Column(name = "organ_transplant_helpline", length = 32)
    private String organTransplantHelpline;

    @Column(name = "nodal_officer_name", length = 128)
    private String nodalOfficerName;

    @Column(name = "nodal_officer_email", length = 128)
    private String nodalOfficerEmail;

    @Column(name = "is_retrieval_center")
    private Boolean isRetrievalCenter = false;

    @Column(name = "is_transplant_center")
    private Boolean isTransplantCenter = false;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 32)
    private com.lifelink.enums.VerificationStatus verificationStatus = com.lifelink.enums.VerificationStatus.VERIFIED;

    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;

    @Column(name = "verified_by_user_id")
    private Long verifiedByUserId;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "total_beds")
    private Integer totalBeds = 500;

    @Column(name = "icu_beds_available")
    private Integer icuBedsAvailable = 25;

    @Column(name = "organ_transplant_icu_beds")
    private Integer organTransplantIcuBeds = 8;

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

    public Hospital() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getHospitalCode() { return hospitalCode; }
    public void setHospitalCode(String hospitalCode) { this.hospitalCode = hospitalCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public HospitalType getHospitalType() { return hospitalType; }
    public void setHospitalType(HospitalType hospitalType) { this.hospitalType = hospitalType; }

    public String getNothoRegistrationNumber() { return nothoRegistrationNumber; }
    public void setNothoRegistrationNumber(String nothoRegistrationNumber) { this.nothoRegistrationNumber = nothoRegistrationNumber; }

    public String getAddressLine() { return addressLine; }
    public void setAddressLine(String addressLine) { this.addressLine = addressLine; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getEmergencyPhone() { return emergencyPhone; }
    public void setEmergencyPhone(String emergencyPhone) { this.emergencyPhone = emergencyPhone; }

    public String getOrganTransplantHelpline() { return organTransplantHelpline; }
    public void setOrganTransplantHelpline(String organTransplantHelpline) { this.organTransplantHelpline = organTransplantHelpline; }

    public String getNodalOfficerName() { return nodalOfficerName; }
    public void setNodalOfficerName(String nodalOfficerName) { this.nodalOfficerName = nodalOfficerName; }

    public String getNodalOfficerEmail() { return nodalOfficerEmail; }
    public void setNodalOfficerEmail(String nodalOfficerEmail) { this.nodalOfficerEmail = nodalOfficerEmail; }

    public Boolean getIsRetrievalCenter() { return isRetrievalCenter; }
    public void setIsRetrievalCenter(Boolean isRetrievalCenter) { this.isRetrievalCenter = isRetrievalCenter; }

    public Boolean getIsTransplantCenter() { return isTransplantCenter; }
    public void setIsTransplantCenter(Boolean isTransplantCenter) { this.isTransplantCenter = isTransplantCenter; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public com.lifelink.enums.VerificationStatus getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(com.lifelink.enums.VerificationStatus verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getVerificationNotes() { return verificationNotes; }
    public void setVerificationNotes(String verificationNotes) { this.verificationNotes = verificationNotes; }

    public Long getVerifiedByUserId() { return verifiedByUserId; }
    public void setVerifiedByUserId(Long verifiedByUserId) { this.verifiedByUserId = verifiedByUserId; }

    public LocalDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }

    public Integer getTotalBeds() { return totalBeds; }
    public void setTotalBeds(Integer totalBeds) { this.totalBeds = totalBeds; }

    public Integer getIcuBedsAvailable() { return icuBedsAvailable; }
    public void setIcuBedsAvailable(Integer icuBedsAvailable) { this.icuBedsAvailable = icuBedsAvailable; }

    public Integer getOrganTransplantIcuBeds() { return organTransplantIcuBeds; }
    public void setOrganTransplantIcuBeds(Integer organTransplantIcuBeds) { this.organTransplantIcuBeds = organTransplantIcuBeds; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
