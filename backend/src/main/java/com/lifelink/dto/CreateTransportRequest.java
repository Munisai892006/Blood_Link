package com.lifelink.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class CreateTransportRequest {
    @NotNull(message = "Case ID is required")
    private Long caseId;

    @NotNull(message = "Organ Assessment ID is required")
    private Long organAssessmentId;

    @NotNull(message = "Source Hospital ID is required")
    private Long sourceHospitalId;

    @NotNull(message = "Destination Hospital ID is required")
    private Long destinationHospitalId;

    private Long vehicleId;
    private Long driverUserId;
    private Boolean greenCorridorRequested = true;
    private Double estimatedDistanceKm;
    private Integer estimatedDurationMinutes;
    private LocalDateTime estimatedDepartureTime;

    public CreateTransportRequest() {}

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

    public Boolean getGreenCorridorRequested() { return greenCorridorRequested; }
    public void setGreenCorridorRequested(Boolean greenCorridorRequested) { this.greenCorridorRequested = greenCorridorRequested; }

    public Double getEstimatedDistanceKm() { return estimatedDistanceKm; }
    public void setEstimatedDistanceKm(Double estimatedDistanceKm) { this.estimatedDistanceKm = estimatedDistanceKm; }

    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(Integer estimatedDurationMinutes) { this.estimatedDurationMinutes = estimatedDurationMinutes; }

    public LocalDateTime getEstimatedDepartureTime() { return estimatedDepartureTime; }
    public void setEstimatedDepartureTime(LocalDateTime estimatedDepartureTime) { this.estimatedDepartureTime = estimatedDepartureTime; }
}
