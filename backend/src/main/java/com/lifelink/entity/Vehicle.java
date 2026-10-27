package com.lifelink.entity;

import com.lifelink.enums.VehicleType;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "registration_number", nullable = false, unique = true, length = 32)
    private String registrationNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 64)
    private VehicleType vehicleType;

    @Column(name = "make_model", length = 128)
    private String makeModel;

    @Column(name = "hospital_id")
    private Long hospitalId;

    @Column(name = "has_perfusion_box_dock")
    private Boolean hasPerfusionBoxDock = true;

    @Column(name = "has_gps_telemetry")
    private Boolean hasGpsTelemetry = true;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "current_status", length = 32)
    private String currentStatus = "AVAILABLE";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Vehicle() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }

    public VehicleType getVehicleType() { return vehicleType; }
    public void setVehicleType(VehicleType vehicleType) { this.vehicleType = vehicleType; }

    public String getMakeModel() { return makeModel; }
    public void setMakeModel(String makeModel) { this.makeModel = makeModel; }

    public Long getHospitalId() { return hospitalId; }
    public void setHospitalId(Long hospitalId) { this.hospitalId = hospitalId; }

    public Boolean getHasPerfusionBoxDock() { return hasPerfusionBoxDock; }
    public void setHasPerfusionBoxDock(Boolean hasPerfusionBoxDock) { this.hasPerfusionBoxDock = hasPerfusionBoxDock; }

    public Boolean getHasGpsTelemetry() { return hasGpsTelemetry; }
    public void setHasGpsTelemetry(Boolean hasGpsTelemetry) { this.hasGpsTelemetry = hasGpsTelemetry; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getCurrentStatus() { return currentStatus; }
    public void setCurrentStatus(String currentStatus) { this.currentStatus = currentStatus; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
