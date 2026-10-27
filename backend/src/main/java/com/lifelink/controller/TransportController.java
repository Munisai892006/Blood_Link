package com.lifelink.controller;

import com.lifelink.dto.*;
import com.lifelink.entity.*;
import com.lifelink.security.UserPrincipal;
import com.lifelink.service.TransportService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/transports", "/api/lifelink/transports"})
public class TransportController {

    private final TransportService transportService;

    public TransportController(TransportService transportService) {
        this.transportService = transportService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TransportAssignment>>> getAllTransports() {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getAllTransports()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<TransportAssignment>>> getActiveTransports() {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getAllTransports()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TransportAssignment>> getTransportById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getTransportById(id)));
    }

    @GetMapping("/public/track/{trackingNumber}")
    public ResponseEntity<ApiResponse<TransportAssignment>> trackPublic(@PathVariable String trackingNumber) {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getTransportByTrackingNumber(trackingNumber)));
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<ApiResponse<List<TransportAssignment>>> getDriverTransports(@PathVariable Long driverId) {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getTransportsByDriver(driverId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TransportAssignment>> createTransport(@Valid @RequestBody CreateTransportRequest request,
                                                                            @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        TransportAssignment created = transportService.createTransport(request, userId);
        return ResponseEntity.ok(ApiResponse.ok("Transport assignment initiated", created));
    }

    @PostMapping("/{id}/location")
    public ResponseEntity<ApiResponse<LocationUpdate>> updateLocation(@PathVariable Long id,
                                                                      @Valid @RequestBody UpdateLocationRequest request) {
        LocationUpdate update = transportService.recordLocation(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Location telemetry updated", update));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<TransportAssignment>> updateStatus(@PathVariable Long id,
                                                                         @Valid @RequestBody UpdateTransportStatusRequest request,
                                                                         @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        TransportAssignment updated = transportService.updateTransportStatus(id, request, userId);
        return ResponseEntity.ok(ApiResponse.ok("Transport status updated", updated));
    }

    @GetMapping("/{id}/telemetry")
    public ResponseEntity<ApiResponse<List<LocationUpdate>>> getTelemetry(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getLocationHistory(id)));
    }

    @GetMapping("/{id}/status-history")
    public ResponseEntity<ApiResponse<List<TransportStatusHistory>>> getStatusHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(transportService.getStatusHistory(id)));
    }
}
