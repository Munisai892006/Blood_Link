package com.lifelink.repository;

import com.lifelink.entity.Vehicle;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    Optional<Vehicle> findByRegistrationNumber(String registrationNumber);
    List<Vehicle> findByIsActiveTrue();
    List<Vehicle> findByHospitalId(Long hospitalId);
}
