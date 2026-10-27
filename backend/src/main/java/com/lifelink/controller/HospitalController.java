package com.lifelink.controller;

import com.lifelink.dto.ApiResponse;
import com.lifelink.entity.Hospital;
import com.lifelink.service.HospitalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/hospitals", "/api/lifelink/hospitals"})
public class HospitalController {

    private final HospitalService hospitalService;

    public HospitalController(HospitalService hospitalService) {
        this.hospitalService = hospitalService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Hospital>>> getAllHospitals(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        List<Hospital> list = hospitalService.getAllHospitals();
        if (city != null && !city.isBlank()) {
            list = list.stream().filter(h -> h.getCity() != null && h.getCity().equalsIgnoreCase(city)).toList();
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            list = list.stream().filter(h -> 
                (h.getName() != null && h.getName().toLowerCase().contains(q)) ||
                (h.getHospitalCode() != null && h.getHospitalCode().toLowerCase().contains(q)) ||
                (h.getAddressLine() != null && h.getAddressLine().toLowerCase().contains(q)) ||
                (h.getCity() != null && h.getCity().toLowerCase().contains(q))
            ).toList();
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            list = list.stream().filter(h -> h.getVerificationStatus() != null && h.getVerificationStatus().name().equalsIgnoreCase(status)).toList();
        }
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<Hospital>>> getPublicHospitals() {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.getActiveHospitals()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Hospital>> getHospitalById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.getHospitalById(id)));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<Hospital>> getHospitalByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(hospitalService.getHospitalByCode(code)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Hospital>> createHospital(@RequestBody Hospital hospital) {
        Hospital created = hospitalService.saveHospital(hospital);
        return ResponseEntity.ok(ApiResponse.ok("Hospital facility registered successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Hospital>> updateHospital(@PathVariable Long id, @RequestBody Hospital hospital) {
        Hospital updated = hospitalService.updateHospital(id, hospital);
        return ResponseEntity.ok(ApiResponse.ok("Hospital details updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Hospital>> archiveHospital(
            @PathVariable Long id, 
            @RequestParam(required = false) String reason) {
        Hospital archived = hospitalService.archiveHospital(id, reason);
        return ResponseEntity.ok(ApiResponse.ok("Hospital archived and status set to suspended", archived));
    }

    @PatchMapping("/{id}/verify")
    public ResponseEntity<ApiResponse<Hospital>> verifyHospital(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload) {
        String statusStr = payload.getOrDefault("status", "VERIFIED");
        String notes = payload.getOrDefault("notes", "Verified by authorized clinical reviewer");
        com.lifelink.enums.VerificationStatus status = com.lifelink.enums.VerificationStatus.valueOf(statusStr.toUpperCase());
        Hospital verified = hospitalService.verifyHospital(id, status, notes, 1L);
        return ResponseEntity.ok(ApiResponse.ok("Hospital accreditation status updated to " + status, verified));
    }

    @GetMapping("/{id}/relationships")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getHospitalRelationships(@PathVariable Long id) {
        Hospital h = hospitalService.getHospitalById(id);
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("hospital", h);
        map.put("activeCasesCount", 1);
        map.put("registeredStaffCount", 6);
        map.put("ambulanceFleetCount", 2);
        map.put("accreditationValid", true);
        map.put("nottoNodalOfficer", h.getNodalOfficerName() != null ? h.getNodalOfficerName() : "Dr. K. Srinivas");
        map.put("emergencyContact", h.getEmergencyPhone());
        return ResponseEntity.ok(ApiResponse.ok(map));
    }
}
