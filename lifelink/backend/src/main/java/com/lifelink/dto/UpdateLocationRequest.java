package com.lifelink.dto;

import jakarta.validation.constraints.NotNull;

public class UpdateLocationRequest {
    @NotNull(message = "Latitude is required")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    private Double longitude;

    private Double speedKmh;
    private Double headingDegrees;
    private Double coldBoxTempCelsius;
    private Integer batteryLevelPercent;

    public UpdateLocationRequest() {}

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
}
