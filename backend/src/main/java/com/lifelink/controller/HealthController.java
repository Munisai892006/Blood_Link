package com.lifelink.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "module", "LifeLink Organ Donation & Medical Logistics Platform",
                "version", "3.0.0",
                "timestamp", System.currentTimeMillis()
        ));
    }
}
