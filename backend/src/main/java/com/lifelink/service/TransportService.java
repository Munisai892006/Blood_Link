package com.lifelink.service;

import com.lifelink.dto.*;
import com.lifelink.entity.*;
import com.lifelink.enums.NotificationType;
import com.lifelink.enums.TransportStatus;
import com.lifelink.exception.ResourceNotFoundException;
import com.lifelink.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TransportService {

    private final TransportAssignmentRepository transportRepository;
    private final LocationUpdateRepository locationRepository;
    private final TransportStatusHistoryRepository statusHistoryRepository;
    private final CorridorAuthorizationRepository corridorRepository;
    private final TransportIncidentRepository incidentRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;

    public TransportService(TransportAssignmentRepository transportRepository,
                            LocationUpdateRepository locationRepository,
                            TransportStatusHistoryRepository statusHistoryRepository,
                            CorridorAuthorizationRepository corridorRepository,
                            TransportIncidentRepository incidentRepository,
                            AuditLogRepository auditLogRepository,
                            NotificationRepository notificationRepository) {
        this.transportRepository = transportRepository;
        this.locationRepository = locationRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.corridorRepository = corridorRepository;
        this.incidentRepository = incidentRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationRepository = notificationRepository;
    }

    public List<TransportAssignment> getAllTransports() {
        return transportRepository.findAllByOrderByCreatedAtDesc();
    }

    public TransportAssignment getTransportById(Long id) {
        return transportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transport assignment not found with id: " + id));
    }

    public TransportAssignment getTransportByTrackingNumber(String trackingNumber) {
        return transportRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Transport not found with tracking number: " + trackingNumber));
    }

    public List<TransportAssignment> getTransportsByDriver(Long driverId) {
        return transportRepository.findByDriverUserId(driverId);
    }

    public List<LocationUpdate> getLocationHistory(Long transportId) {
        return locationRepository.findByTransportAssignmentIdOrderByRecordedAtDesc(transportId);
    }

    public LocationUpdate getLatestLocation(Long transportId) {
        return locationRepository.findTopByTransportAssignmentIdOrderByRecordedAtDesc(transportId).orElse(null);
    }

    public List<TransportStatusHistory> getStatusHistory(Long transportId) {
        return statusHistoryRepository.findByTransportAssignmentIdOrderByChangedAtAsc(transportId);
    }

    @Transactional
    public TransportAssignment createTransport(CreateTransportRequest request, Long userId) {
        String trackingNumber = "TRP-" + LocalDateTime.now().getYear() + "-" + String.format("%04d", (transportRepository.count() + 1));

        TransportAssignment transport = new TransportAssignment();
        transport.setTrackingNumber(trackingNumber);
        transport.setCaseId(request.getCaseId());
        transport.setOrganAssessmentId(request.getOrganAssessmentId());
        transport.setSourceHospitalId(request.getSourceHospitalId());
        transport.setDestinationHospitalId(request.getDestinationHospitalId());
        transport.setVehicleId(request.getVehicleId());
        transport.setDriverUserId(request.getDriverUserId());
        transport.setTrafficCoordinatorUserId(userId);
        transport.setStatus(TransportStatus.ASSIGNED);
        transport.setGreenCorridorRequested(request.getGreenCorridorRequested());
        transport.setEstimatedDistanceKm(request.getEstimatedDistanceKm());
        transport.setEstimatedDurationMinutes(request.getEstimatedDurationMinutes());
        transport.setEstimatedDepartureTime(request.getEstimatedDepartureTime() != null ? request.getEstimatedDepartureTime() : LocalDateTime.now());

        TransportAssignment saved = transportRepository.save(transport);

        // Record initial status
        TransportStatusHistory history = new TransportStatusHistory();
        history.setTransportAssignmentId(saved.getId());
        history.setToStatus(TransportStatus.ASSIGNED);
        history.setChangedByUserId(userId);
        history.setReasonNotes("Transport assignment created and dispatched to logistics team");
        statusHistoryRepository.save(history);

        // Audit & Notification
        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction("CREATE_TRANSPORT_ASSIGNMENT");
        audit.setEntityType("TRANSPORT_ASSIGNMENT");
        audit.setEntityId(saved.getId());
        audit.setDetails("Created transport mission " + trackingNumber);
        auditLogRepository.save(audit);

        if (saved.getDriverUserId() != null) {
            Notification notif = new Notification();
            notif.setUserId(saved.getDriverUserId());
            notif.setNotificationType(NotificationType.TRANSPORT_ASSIGNED);
            notif.setTitle("New Transport Mission Assigned");
            notif.setMessage("You have been assigned mission " + trackingNumber);
            notif.setReferenceType("TRANSPORT");
            notif.setReferenceId(saved.getId());
            notificationRepository.save(notif);
        }

        return saved;
    }

    @Transactional
    public LocationUpdate recordLocation(Long transportId, UpdateLocationRequest request) {
        TransportAssignment transport = getTransportById(transportId);

        LocationUpdate location = new LocationUpdate();
        location.setTransportAssignmentId(transportId);
        location.setLatitude(request.getLatitude());
        location.setLongitude(request.getLongitude());
        location.setSpeedKmh(request.getSpeedKmh());
        location.setHeadingDegrees(request.getHeadingDegrees());
        location.setColdBoxTempCelsius(request.getColdBoxTempCelsius());
        location.setBatteryLevelPercent(request.getBatteryLevelPercent());
        location.setRecordedAt(LocalDateTime.now());

        LocationUpdate saved = locationRepository.save(location);

        if (request.getColdBoxTempCelsius() != null) {
            transport.setLastReportedTemperatureCelsius(request.getColdBoxTempCelsius());
            transportRepository.save(transport);
        }

        return saved;
    }

    @Transactional
    public TransportAssignment updateTransportStatus(Long transportId, UpdateTransportStatusRequest request, Long userId) {
        TransportAssignment transport = getTransportById(transportId);
        TransportStatus oldStatus = transport.getStatus();
        transport.setStatus(request.getStatus());

        if (request.getStatus() == TransportStatus.GREEN_CORRIDOR_ACTIVE) {
            transport.setGreenCorridorActive(true);
        } else if (request.getStatus() == TransportStatus.HANDOVER_COMPLETED) {
            transport.setActualArrivalTime(LocalDateTime.now());
            if (request.getHandoverSignedBy() != null) {
                transport.setHandoverSignedBy(request.getHandoverSignedBy());
            }
        }

        TransportAssignment saved = transportRepository.save(transport);

        TransportStatusHistory history = new TransportStatusHistory();
        history.setTransportAssignmentId(saved.getId());
        history.setFromStatus(oldStatus);
        history.setToStatus(request.getStatus());
        history.setChangedByUserId(userId);
        history.setReasonNotes(request.getReasonNotes());
        history.setLatitude(request.getLatitude());
        history.setLongitude(request.getLongitude());
        statusHistoryRepository.save(history);

        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction("UPDATE_TRANSPORT_STATUS");
        audit.setEntityType("TRANSPORT_ASSIGNMENT");
        audit.setEntityId(saved.getId());
        audit.setDetails("Transport " + saved.getTrackingNumber() + " transitioned to " + request.getStatus());
        auditLogRepository.save(audit);

        return saved;
    }
}
