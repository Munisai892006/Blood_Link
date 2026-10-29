package com.lifelink.repository;

import com.lifelink.entity.Hospital;
import com.lifelink.enums.HospitalType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    Optional<Hospital> findByHospitalCode(String hospitalCode);
    List<Hospital> findByIsActiveTrue();
    List<Hospital> findByCityIgnoreCase(String city);
    List<Hospital> findByHospitalType(HospitalType hospitalType);
    List<Hospital> findByIsRetrievalCenterTrue();
    List<Hospital> findByIsTransplantCenterTrue();
    List<Hospital> findByVerificationStatus(com.lifelink.enums.VerificationStatus verificationStatus);
    List<Hospital> findByNameContainingIgnoreCaseOrCityContainingIgnoreCase(String name, String city);
}
