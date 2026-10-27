package com.lifelink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "corridor_authorizations")
public class CorridorAuthorization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transport_assignment_id", nullable = false)
    private Long transportAssignmentId;

    @Column(name = "jurisdiction_police_division", nullable = false, length = 128)
    private String jurisdictionPoliceDivision;

    @Column(name = "authorizing_officer_name", nullable = false, length = 128)
    private String authorizingOfficerName;

    @Column(name = "authorizing_officer_rank", length = 64)
    private String authorizingOfficerRank;

    @Column(name = "officer_contact_phone", nullable = false, length = 32)
    private String officerContactPhone;

    @Column(name = "corridor_route_description", columnDefinition = "TEXT")
    private String corridorRouteDescription;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "AUTHORIZED";

    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public CorridorAuthorization() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTransportAssignmentId() { return transportAssignmentId; }
    public void setTransportAssignmentId(Long transportAssignmentId) { this.transportAssignmentId = transportAssignmentId; }

    public String getJurisdictionPoliceDivision() { return jurisdictionPoliceDivision; }
    public void setJurisdictionPoliceDivision(String jurisdictionPoliceDivision) { this.jurisdictionPoliceDivision = jurisdictionPoliceDivision; }

    public String getAuthorizingOfficerName() { return authorizingOfficerName; }
    public void setAuthorizingOfficerName(String authorizingOfficerName) { this.authorizingOfficerName = authorizingOfficerName; }

    public String getAuthorizingOfficerRank() { return authorizingOfficerRank; }
    public void setAuthorizingOfficerRank(String authorizingOfficerRank) { this.authorizingOfficerRank = authorizingOfficerRank; }

    public String getOfficerContactPhone() { return officerContactPhone; }
    public void setOfficerContactPhone(String officerContactPhone) { this.officerContactPhone = officerContactPhone; }

    public String getCorridorRouteDescription() { return corridorRouteDescription; }
    public void setCorridorRouteDescription(String corridorRouteDescription) { this.corridorRouteDescription = corridorRouteDescription; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getApprovedByUserId() { return approvedByUserId; }
    public void setApprovedByUserId(Long approvedByUserId) { this.approvedByUserId = approvedByUserId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
