package com.lifelink.controller;

import com.lifelink.dto.ApiResponse;
import com.lifelink.dto.ConsentRecordDto;
import com.lifelink.entity.ConsentRecord;
import com.lifelink.security.UserPrincipal;
import com.lifelink.service.ConsentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/cases/{caseId}/consent", "/api/lifelink/cases/{caseId}/consent"})
public class ConsentController {

    private final ConsentService consentService;

    public ConsentController(ConsentService consentService) {
        this.consentService = consentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ConsentRecord>> getConsent(@PathVariable Long caseId) {
        return ResponseEntity.ok(ApiResponse.ok(consentService.getConsentByCaseId(caseId)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ConsentRecord>> updateConsent(@PathVariable Long caseId,
                                                                    @RequestBody ConsentRecordDto dto,
                                                                    @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        ConsentRecord updated = consentService.updateConsent(caseId, dto, userId);
        return ResponseEntity.ok(ApiResponse.ok("Consent record updated", updated));
    }
}
