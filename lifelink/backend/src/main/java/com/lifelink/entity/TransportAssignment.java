package com.lifelink.entity;

import com.lifelink.enums.TransportStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transport_assignments")
public class TransportAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 32)
    private String trackingNumber;

    @Column(name = "case_id", nullable = false)
    private Long caseId;

    @Column(name = "organ_assessment_id", nullable = false)
    private Long organAssessmentId;

    @Column(name = "source_hospital_id", nullable = false)
    private Long sourceHospitalId;

    @Column(name = "destination_hospital_id", nullable = false)
    private Long destinationHospitalId;

    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "driver_user_id")
    private Long driverUserId;

    @Column(name = "traffic_coordinator_user_id")
    private Long trafficCoordinatorUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private TransportStatus status = TransportStatus.ASSIGNED;

    @Column(name = "estimated_departure_time")
    private LocalDateTime estimatedDepartureTime;

    @Column(name = "actual_departure_time")
    private LocalDateTime actualDepartureTime;

    @Column(name = "estimated_arrival_time")
    private LocalDateTime estimatedArrivalTime;

    @Column(name = "actual_arrival_time")
    private LocalDateTime actualArrivalTime;

    @Column(name = "green_corridor_requested")
    private Boolean greenCorridorRequested = true;

    @Column(name = "green_corridor_active")
    private Boolean greenCorridorActive = false;

    @Column(name = "estimated_distance_km")
    private Double estimatedDistanceKm;

    @Column(name = "estimated_duration_minutes")
    private Integer estimatedDurationMinutes;

    @Column(name = "cold_box_temperature_min_celsius")
    private Double coldBoxTemperatureMinCelsius = 2.0;

    @Column(name = "cold_box_temperature_max_celsius")
    private Double coldBoxTemperatureMaxCelsius = 6.0;

    @Column(name = "last_reported_temperature_celsius")
    private Double lastReportedTemperatureCelsius;

    @Column(name = "handover_signed_by", length = 128)
    private String handoverSignedBy;

    @Column(name = "handover_notes", columnDefinition = "TEXT")
    private String handoverNotes;

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

    public TransportAssignment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public Long getOrganAssessmentId() { return organAssessmentId; }
    public void setOrganAssessmentId(Long organAssessmentId) { this.organAssessmentId = organAssessmentId; }

    public Long getSourceHospitalId() { return sourceHospitalId; }
    public void setSourceHospitalId(Long sourceHospitalId) { this.sourceHospitalId = sourceHospitalId; }

    public Long getDestinationHospitalId() { return destinationHospitalId; }
    public void setDestinationHospitalId(Long destinationHospitalId) { this.destinationHospitalId = destinationHospitalId; }

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public Long getDriverUserId() { return driverUserId; }
    public void setDriverUserId(Long driverUserId) { this.driverUserId = driverUserId; }

    public Long getTrafficCoordinatorUserId() { return trafficCoordinatorUserId; }
    public void setTrafficCoordinatorUserId(Long trafficCoordinatorUserId) { this.trafficCoordinatorUserId = trafficCoordinatorUserId; }

    public TransportStatus getStatus() { return status; }
    public void setStatus(TransportStatus status) { this.status = status; }

    public LocalDateTime getEstimatedDepartureTime() { return estimatedDepartureTime; }
    public void setEstimatedDepartureTime(LocalDateTime estimatedDepartureTime) { this.estimatedDepartureTime = estimatedDepartureTime; }

    public LocalDateTime getActualDepartureTime() { return actualDepartureTime; }
    public void setActualDepartureTime(LocalDateTime actualDepartureTime) { this.actualDepartureTime = actualDepartureTime; }

    public LocalDateTime getEstimatedArrivalTime() { return estimatedArrivalTime; }
    public void setEstimatedArrivalTime(LocalDateTime estimatedArrivalTime) { this.estimatedArrivalTime = estimatedArrivalTime; }

    public LocalDateTime getActualArrivalTime() { return actualArrivalTime; }
    public void setActualArrivalTime(LocalDateTime actualArrivalTime) { this.actualArrivalTime = actualArrivalTime; }

    public Boolean getGreenCorridorRequested() { return greenCorridorRequested; }
    public void setGreenCorridorRequested(Boolean greenCorridorRequested) { this.greenCorridorRequested = greenCorridorRequested; }

    public Boolean getGreenCorridorActive() { return greenCorridorActive; }
    public void setGreenCorridorActive(Boolean greenCorridorActive) { this.greenCorridorActive = greenCorridorActive; }

    public Double getEstimatedDistanceKm() { return estimatedDistanceKm; }
    public void setEstimatedDistanceKm(Double estimatedDistanceKm) { this.estimatedDistanceKm = estimatedDistanceKm; }

    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(Integer estimatedDurationMinutes) { this.estimatedDurationMinutes = estimatedDurationMinutes; }

    public Double getColdBoxTemperatureMinCelsius() { return coldBoxTemperatureMinCelsius; }
    public void setColdBoxTemperatureMinCelsius(Double coldBoxTemperatureMinCelsius) { this.coldBoxTemperatureMinCelsius = coldBoxTemperatureMinCelsius; }

    public Double getColdBoxTemperatureMaxCelsius() { return coldBoxTemperatureMaxCelsius; }
    public void setColdBoxTemperatureMaxCelsius(Double coldBoxTemperatureMaxCelsius) { this.coldBoxTemperatureMaxCelsius = coldBoxTemperatureMaxCelsius; }

    public Double getLastReportedTemperatureCelsius() { return lastReportedTemperatureCelsius; }
    public void setLastReportedTemperatureCelsius(Double lastReportedTemperatureCelsius) { this.lastReportedTemperatureCelsius = lastReportedTemperatureCelsius; }

    public String getHandoverSignedBy() { return handoverSignedBy; }
    public void setHandoverSignedBy(String handoverSignedBy) { this.handoverSignedBy = handoverSignedBy; }

    public String getHandoverNotes() { return handoverNotes; }
    public void setHandoverNotes(String handoverNotes) { this.handoverNotes = handoverNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
