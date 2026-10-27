package com.lifelink.repository;

import com.lifelink.entity.TransportStatusHistory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransportStatusHistoryRepository extends JpaRepository<TransportStatusHistory, Long> {

    List<TransportStatusHistory> findByTransportAssignmentIdOrderByChangedAtAsc(Long transportAssignmentId);
}
