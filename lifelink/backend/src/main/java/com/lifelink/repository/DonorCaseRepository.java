package com.lifelink.repository;

import com.lifelink.entity.DonorCase;
import com.lifelink.enums.WorkflowStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DonorCaseRepository extends JpaRepository<DonorCase, Long> {

    Optional<DonorCase> findByCaseNumber(String caseNumber);
    List<DonorCase> findByWorkflowStatus(WorkflowStatus workflowStatus);
    List<DonorCase> findByReferringHospitalId(Long referringHospitalId);
    List<DonorCase> findAllByOrderByCreatedAtDesc();
    long countByWorkflowStatus(WorkflowStatus workflowStatus);
}
