package com.lifelink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "location_updates")
public class LocationUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transport_assignment_id", nullable = false)
    private Long transportAssignmentId;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "speed_kmh")
    private Double speedKmh;

    @Column(name = "heading_degrees")
    private Double headingDegrees;

    @Column(name = "cold_box_temp_celsius")
    private Double coldBoxTempCelsius;

    @Column(name = "battery_level_percent")
    private Integer batteryLevelPercent;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) {
            recordedAt = LocalDateTime.now();
        }
    }

    public LocationUpdate() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTransportAssignmentId() { return transportAssignmentId; }
    public void setTransportAssignmentId(Long transportAssignmentId) { this.transportAssignmentId = transportAssignmentId; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getSpeedKmh() { return speedKmh; }
    public void setSpeedKmh(Double speedKmh) { this.speedKmh = speedKmh; }

    public Double getHeadingDegrees() { return headingDegrees; }
    public void setHeadingDegrees(Double headingDegrees) { this.headingDegrees = headingDegrees; }

    public Double getColdBoxTempCelsius() { return coldBoxTempCelsius; }
    public void setColdBoxTempCelsius(Double coldBoxTempCelsius) { this.coldBoxTempCelsius = coldBoxTempCelsius; }

    public Integer getBatteryLevelPercent() { return batteryLevelPercent; }
    public void setBatteryLevelPercent(Integer batteryLevelPercent) { this.batteryLevelPercent = batteryLevelPercent; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }
}
