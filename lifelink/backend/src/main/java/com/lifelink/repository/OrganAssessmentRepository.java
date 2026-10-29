package com.lifelink.repository;

import com.lifelink.entity.OrganAssessment;
import com.lifelink.enums.AssessmentStatus;
import com.lifelink.enums.OrganType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrganAssessmentRepository extends JpaRepository<OrganAssessment, Long> {

    List<OrganAssessment> findByCaseId(Long caseId);
    List<OrganAssessment> findByStatus(AssessmentStatus status);
    List<OrganAssessment> findByOrganType(OrganType organType);
}
