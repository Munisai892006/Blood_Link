package com.lifelink.repository;

import com.lifelink.entity.TransportIncident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransportIncidentRepository extends JpaRepository<TransportIncident, Long> {

    List<TransportIncident> findByTransportAssignmentId(Long transportAssignmentId);
}
