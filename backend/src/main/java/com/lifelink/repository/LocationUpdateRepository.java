package com.lifelink.repository;

import com.lifelink.entity.LocationUpdate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LocationUpdateRepository extends JpaRepository<LocationUpdate, Long> {

    List<LocationUpdate> findByTransportAssignmentIdOrderByRecordedAtDesc(Long transportAssignmentId);
    Optional<LocationUpdate> findTopByTransportAssignmentIdOrderByRecordedAtDesc(Long transportAssignmentId);
}
