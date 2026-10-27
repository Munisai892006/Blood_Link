package com.lifelink.entity;

import com.lifelink.enums.TransportStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transport_status_history")
public class TransportStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transport_assignment_id", nullable = false)
    private Long transportAssignmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 32)
    private TransportStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 32)
    private TransportStatus toStatus;

    @Column(name = "changed_by_user_id", nullable = false)
    private Long changedByUserId;

    @Column(name = "reason_notes", columnDefinition = "TEXT")
    private String reasonNotes;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    @PrePersist
    protected void onCreate() {
        if (changedAt == null) {
            changedAt = LocalDateTime.now();
        }
    }

    public TransportStatusHistory() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTransportAssignmentId() { return transportAssignmentId; }
    public void setTransportAssignmentId(Long transportAssignmentId) { this.transportAssignmentId = transportAssignmentId; }

    public TransportStatus getFromStatus() { return fromStatus; }
    public void setFromStatus(TransportStatus fromStatus) { this.fromStatus = fromStatus; }

    public TransportStatus getToStatus() { return toStatus; }
    public void setToStatus(TransportStatus toStatus) { this.toStatus = toStatus; }

    public Long getChangedByUserId() { return changedByUserId; }
    public void setChangedByUserId(Long changedByUserId) { this.changedByUserId = changedByUserId; }

    public String getReasonNotes() { return reasonNotes; }
    public void setReasonNotes(String reasonNotes) { this.reasonNotes = reasonNotes; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
