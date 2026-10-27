package com.lifelink.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lifelink.enums.Role;

public class UserSummaryDto {
    private String id;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private Long hospitalId;
    private String hospitalName;
    private String organizationId;
    private String organizationName;
    private String designation;
    private Boolean isVerified;
    private String avatarUrl;
    private String bloodGroup;
    private String addressLocality;

    public UserSummaryDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public void setId(Long id) { this.id = id != null ? String.valueOf(id) : null; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    @JsonProperty("full_name")
    public String getFullNameSnake() { return fullName; }

    @JsonProperty("full_name")
    public void setFullNameSnake(String fullName) {
        if (this.fullName == null) this.fullName = fullName;
    }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public void setRole(String roleStr) {
        if (roleStr == null || roleStr.isBlank()) {
            this.role = null;
        } else {
            try {
                this.role = Role.valueOf(roleStr);
            } catch (Exception e) {
                this.role = Role.PUBLIC_VISITOR;
            }
        }
    }

    public Long getHospitalId() { return hospitalId; }
    public void setHospitalId(Long hospitalId) { this.hospitalId = hospitalId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getOrganizationId() { return organizationId; }
    public void setOrganizationId(String organizationId) { this.organizationId = organizationId; }

    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean isVerified) { this.isVerified = isVerified; }

    @JsonProperty("avatar_url")
    public String getAvatarUrl() { return avatarUrl; }

    @JsonProperty("avatar_url")
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    @JsonProperty("blood_group")
    public String getBloodGroup() { return bloodGroup; }

    @JsonProperty("blood_group")
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    @JsonProperty("address_locality")
    public String getAddressLocality() { return addressLocality; }

    @JsonProperty("address_locality")
    public void setAddressLocality(String addressLocality) { this.addressLocality = addressLocality; }
}
