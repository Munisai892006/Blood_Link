package com.lifelink.repository;

import com.lifelink.entity.CorridorAuthorization;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CorridorAuthorizationRepository extends JpaRepository<CorridorAuthorization, Long> {

    List<CorridorAuthorization> findByTransportAssignmentId(Long transportAssignmentId);
    Optional<CorridorAuthorization> findTopByTransportAssignmentIdOrderByCreatedAtDesc(Long transportAssignmentId);
}
