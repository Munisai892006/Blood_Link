package com.lifelink;

import com.lifelink.dto.CreateTransportRequest;
import com.lifelink.dto.UpdateLocationRequest;
import com.lifelink.dto.UpdateTransportStatusRequest;
import com.lifelink.entity.LocationUpdate;
import com.lifelink.entity.TransportAssignment;
import com.lifelink.enums.TransportStatus;
import com.lifelink.service.TransportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
class TransportServiceTest {

    @Autowired
    private TransportService transportService;

    @Test
    void testCreateTransportAndRecordTelemetry() {
        CreateTransportRequest req = new CreateTransportRequest();
        req.setCaseId(1L);
        req.setOrganAssessmentId(1L);
        req.setSourceHospitalId(1L);
        req.setDestinationHospitalId(2L);
        req.setVehicleId(1L);
        req.setDriverUserId(4L);
        req.setGreenCorridorRequested(true);
        req.setEstimatedDistanceKm(15.2);
        req.setEstimatedDurationMinutes(22);
        req.setEstimatedDepartureTime(LocalDateTime.now().plusMinutes(10));

        TransportAssignment transport = transportService.createTransport(req, 1L);
        assertNotNull(transport);
        assertTrue(transport.getTrackingNumber().startsWith("TRP-"));
        assertEquals(TransportStatus.ASSIGNED, transport.getStatus());

        // Post GPS location update
        UpdateLocationRequest locReq = new UpdateLocationRequest();
        locReq.setLatitude(17.4250);
        locReq.setLongitude(78.4480);
        locReq.setSpeedKmh(54.0);
        locReq.setHeadingDegrees(90.0);
        locReq.setColdBoxTempCelsius(3.4);
        locReq.setBatteryLevelPercent(95);

        LocationUpdate loc = transportService.recordLocation(transport.getId(), locReq);
        assertNotNull(loc);
        assertEquals(3.4, loc.getColdBoxTempCelsius());

        // Verify latest location
        LocationUpdate latest = transportService.getLatestLocation(transport.getId());
        assertNotNull(latest);
        assertEquals(17.4250, latest.getLatitude());

        // Transition status to GREEN_CORRIDOR_ACTIVE
        UpdateTransportStatusRequest statusReq = new UpdateTransportStatusRequest();
        statusReq.setStatus(TransportStatus.GREEN_CORRIDOR_ACTIVE);
        statusReq.setReasonNotes("Traffic police green corridor active from Panjagutta to Jubilee Hills");

        TransportAssignment updated = transportService.updateTransportStatus(transport.getId(), statusReq, 3L);
        assertEquals(TransportStatus.GREEN_CORRIDOR_ACTIVE, updated.getStatus());
        assertTrue(updated.getGreenCorridorActive());
    }
}
