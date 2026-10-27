package com.lifelink.repository;

import com.lifelink.entity.ConsentRecord;
import com.lifelink.enums.ConsentStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, Long> {

    Optional<ConsentRecord> findByCaseId(Long caseId);
    List<ConsentRecord> findByStatus(ConsentStatus status);
}
