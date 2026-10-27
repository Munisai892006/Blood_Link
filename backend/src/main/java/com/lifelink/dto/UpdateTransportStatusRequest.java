package com.lifelink.dto;

import com.lifelink.enums.TransportStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateTransportStatusRequest {
    @NotNull(message = "Transport status is required")
    private TransportStatus status;
    private String reasonNotes;
    private Double latitude;
    private Double longitude;
    private String handoverSignedBy;

    public UpdateTransportStatusRequest() {}

    public TransportStatus getStatus() { return status; }
    public void setStatus(TransportStatus status) { this.status = status; }

    public String getReasonNotes() { return reasonNotes; }
    public void setReasonNotes(String reasonNotes) { this.reasonNotes = reasonNotes; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getHandoverSignedBy() { return handoverSignedBy; }
    public void setHandoverSignedBy(String handoverSignedBy) { this.handoverSignedBy = handoverSignedBy; }
}
