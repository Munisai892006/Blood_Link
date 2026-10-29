package com.lifelink.controller;

import com.lifelink.dto.ApiResponse;
import com.lifelink.dto.CreateCaseRequest;
import com.lifelink.dto.UpdateWorkflowStatusRequest;
import com.lifelink.entity.DonorCase;
import com.lifelink.enums.WorkflowStatus;
import com.lifelink.security.UserPrincipal;
import com.lifelink.service.CaseService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/cases", "/api/lifelink/cases"})
public class CaseController {

    private final CaseService caseService;

    public CaseController(CaseService caseService) {
        this.caseService = caseService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DonorCase>>> getAllCases(@RequestParam(required = false) WorkflowStatus status) {
        List<DonorCase> cases = (status != null) 
                ? caseService.getCasesByStatus(status) 
                : caseService.getAllCases();
        return ResponseEntity.ok(ApiResponse.ok(cases));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DonorCase>> getCaseById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getCaseById(id)));
    }

    @GetMapping("/number/{caseNumber}")
    public ResponseEntity<ApiResponse<DonorCase>> getCaseByNumber(@PathVariable String caseNumber) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getCaseByCaseNumber(caseNumber)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DonorCase>> createCase(@Valid @RequestBody CreateCaseRequest request,
                                                             @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        DonorCase created = caseService.createCase(request, userId);
        return ResponseEntity.ok(ApiResponse.ok("Donor case created successfully", created));
    }

    @PatchMapping("/{id}/workflow")
    public ResponseEntity<ApiResponse<DonorCase>> updateWorkflow(@PathVariable Long id,
                                                                 @Valid @RequestBody UpdateWorkflowStatusRequest request,
                                                                 @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        DonorCase updated = caseService.updateWorkflowStatus(id, request, userId);
        return ResponseEntity.ok(ApiResponse.ok("Workflow status updated", updated));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DonorCase>> updateCase(@PathVariable Long id,
                                                             @RequestBody DonorCase donorCase,
                                                             @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        DonorCase updated = caseService.updateCaseDetails(id, donorCase, userId);
        return ResponseEntity.ok(ApiResponse.ok("Case details updated successfully", updated));
    }

    @PatchMapping("/{id}/assign-coordinator")
    public ResponseEntity<ApiResponse<DonorCase>> assignCoordinator(@PathVariable Long id,
                                                                     @RequestBody java.util.Map<String, String> payload,
                                                                     @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        Long coordId = Long.parseLong(payload.getOrDefault("coordinatorId", "1"));
        String notes = payload.getOrDefault("notes", "Assigned via coordination dashboard");
        DonorCase updated = caseService.assignCoordinator(id, coordId, notes, userId);
        return ResponseEntity.ok(ApiResponse.ok("Coordinator assigned to case", updated));
    }

    @GetMapping("/{id}/timeline")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> getCaseTimeline(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(caseService.getCaseTimeline(id)));
    }
}
