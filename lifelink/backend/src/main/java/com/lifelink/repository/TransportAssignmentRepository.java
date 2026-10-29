package com.lifelink.repository;

import com.lifelink.entity.TransportAssignment;
import com.lifelink.enums.TransportStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransportAssignmentRepository extends JpaRepository<TransportAssignment, Long> {

    Optional<TransportAssignment> findByTrackingNumber(String trackingNumber);
    List<TransportAssignment> findByCaseId(Long caseId);
    List<TransportAssignment> findByStatus(TransportStatus status);
    List<TransportAssignment> findByDriverUserId(Long driverUserId);
    List<TransportAssignment> findAllByOrderByCreatedAtDesc();
}
