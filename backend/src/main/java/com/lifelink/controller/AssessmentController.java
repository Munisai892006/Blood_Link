package com.lifelink.controller;

import com.lifelink.dto.ApiResponse;
import com.lifelink.dto.OrganAssessmentDto;
import com.lifelink.entity.OrganAssessment;
import com.lifelink.security.UserPrincipal;
import com.lifelink.service.AssessmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api", "/api/lifelink"})
public class AssessmentController {

    private final AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @GetMapping("/cases/{caseId}/assessments")
    public ResponseEntity<ApiResponse<List<OrganAssessment>>> getAssessments(@PathVariable Long caseId) {
        return ResponseEntity.ok(ApiResponse.ok(assessmentService.getAssessmentsByCaseId(caseId)));
    }

    @GetMapping("/assessments/{id}")
    public ResponseEntity<ApiResponse<OrganAssessment>> getAssessmentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(assessmentService.getAssessmentById(id)));
    }

    @PutMapping("/assessments/{id}")
    public ResponseEntity<ApiResponse<OrganAssessment>> updateAssessment(@PathVariable Long id,
                                                                         @RequestBody OrganAssessmentDto dto,
                                                                         @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        OrganAssessment updated = assessmentService.updateAssessment(id, dto, userId);
        return ResponseEntity.ok(ApiResponse.ok("Organ assessment updated", updated));
    }
}
