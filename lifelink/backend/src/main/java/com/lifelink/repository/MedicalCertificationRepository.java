package com.lifelink.repository;

import com.lifelink.entity.MedicalCertification;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MedicalCertificationRepository extends JpaRepository<MedicalCertification, Long> {

    List<MedicalCertification> findByCaseId(Long caseId);
    Optional<MedicalCertification> findByCaseIdAndDeclarationNumber(Long caseId, Integer declarationNumber);
}
