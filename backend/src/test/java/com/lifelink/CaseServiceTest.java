package com.lifelink;

import com.lifelink.dto.CreateCaseRequest;
import com.lifelink.dto.UpdateWorkflowStatusRequest;
import com.lifelink.entity.DonorCase;
import com.lifelink.entity.OrganAssessment;
import com.lifelink.enums.CasePriority;
import com.lifelink.enums.WorkflowStatus;
import com.lifelink.service.AssessmentService;
import com.lifelink.service.CaseService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
class CaseServiceTest {

    @Autowired
    private CaseService caseService;

    @Autowired
    private AssessmentService assessmentService;

    @Test
    void testCreateDonorCaseAndAutoAssessments() {
        CreateCaseRequest req = new CreateCaseRequest();
        req.setReferringHospitalId(1L);
        req.setPatientUhid("UHID-TEST-0099");
        req.setPatientAge(42);
        req.setPatientGender("FEMALE");
        req.setBloodGroup("B_POSITIVE");
        req.setCauseOfAdmission("Intracranial Hemorrhage");
        req.setGlasgowComaScale(3);
        req.setBrainDeathSuspectedAt(LocalDateTime.now().minusHours(4));
        req.setPriority(CasePriority.URGENT);
        req.setIsMedicoLegalCase(false);
        req.setCoordinatorNotes("Potential multi-organ donor evaluated in Neuro ICU");

        DonorCase created = caseService.createCase(req, 1L);
        assertNotNull(created);
        assertNotNull(created.getId());
        assertTrue(created.getCaseNumber().startsWith("CASE-"));
        assertEquals(WorkflowStatus.POTENTIAL_DONOR_IDENTIFIED, created.getWorkflowStatus());

        // Verify organ assessments were automatically initialized
        List<OrganAssessment> assessments = assessmentService.getAssessmentsByCaseId(created.getId());
        assertFalse(assessments.isEmpty());
        assertTrue(assessments.stream().anyMatch(a -> a.getOrganType().name().contains("HEART")));
        assertTrue(assessments.stream().anyMatch(a -> a.getOrganType().name().contains("LIVER")));
    }

    @Test
    void testWorkflowStatusTransition() {
        List<DonorCase> cases = caseService.getAllCases();
        assertFalse(cases.isEmpty());
        DonorCase target = cases.get(0);

        UpdateWorkflowStatusRequest req = new UpdateWorkflowStatusRequest();
        req.setWorkflowStatus(WorkflowStatus.BRAIN_DEATH_FIRST_CERTIFICATION);
        req.setNotes("First apnea test successfully documented by panel of 4 doctors");

        DonorCase updated = caseService.updateWorkflowStatus(target.getId(), req, 1L);
        assertEquals(WorkflowStatus.BRAIN_DEATH_FIRST_CERTIFICATION, updated.getWorkflowStatus());
        assertTrue(updated.getCoordinatorNotes().contains("First apnea test"));
    }
}
