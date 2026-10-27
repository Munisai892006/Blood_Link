package com.lifelink.service;

import com.lifelink.entity.Hospital;
import com.lifelink.enums.HospitalType;
import com.lifelink.exception.ResourceNotFoundException;
import com.lifelink.repository.HospitalRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HospitalService {

    private final HospitalRepository hospitalRepository;

    public HospitalService(HospitalRepository hospitalRepository) {
        this.hospitalRepository = hospitalRepository;
    }

    public List<Hospital> getAllHospitals() {
        return hospitalRepository.findAll();
    }

    public List<Hospital> getActiveHospitals() {
        return hospitalRepository.findByIsActiveTrue();
    }

    public Hospital getHospitalById(Long id) {
        return hospitalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found with id: " + id));
    }

    public Hospital getHospitalByCode(String code) {
        return hospitalRepository.findByHospitalCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Hospital not found with code: " + code));
    }

    public List<Hospital> getHospitalsByCity(String city) {
        return hospitalRepository.findByCityIgnoreCase(city);
    }

    public List<Hospital> getHospitalsByType(HospitalType type) {
        return hospitalRepository.findByHospitalType(type);
    }

    public Hospital saveHospital(Hospital hospital) {
        if (hospital.getHospitalCode() == null || hospital.getHospitalCode().isBlank()) {
            hospital.setHospitalCode("HOSP-REG-" + System.currentTimeMillis() % 100000);
        }
        if (hospital.getVerificationStatus() == null) {
            hospital.setVerificationStatus(com.lifelink.enums.VerificationStatus.VERIFIED);
        }
        return hospitalRepository.save(hospital);
    }

    public Hospital updateHospital(Long id, Hospital updated) {
        Hospital existing = getHospitalById(id);
        if (updated.getName() != null && !updated.getName().isBlank()) existing.setName(updated.getName());
        if (updated.getHospitalType() != null) existing.setHospitalType(updated.getHospitalType());
        if (updated.getNothoRegistrationNumber() != null) existing.setNothoRegistrationNumber(updated.getNothoRegistrationNumber());
        if (updated.getAddressLine() != null) existing.setAddressLine(updated.getAddressLine());
        if (updated.getCity() != null) existing.setCity(updated.getCity());
        if (updated.getState() != null) existing.setState(updated.getState());
        if (updated.getPincode() != null) existing.setPincode(updated.getPincode());
        if (updated.getLatitude() != null) existing.setLatitude(updated.getLatitude());
        if (updated.getLongitude() != null) existing.setLongitude(updated.getLongitude());
        if (updated.getEmergencyPhone() != null) existing.setEmergencyPhone(updated.getEmergencyPhone());
        if (updated.getOrganTransplantHelpline() != null) existing.setOrganTransplantHelpline(updated.getOrganTransplantHelpline());
        if (updated.getNodalOfficerName() != null) existing.setNodalOfficerName(updated.getNodalOfficerName());
        if (updated.getNodalOfficerEmail() != null) existing.setNodalOfficerEmail(updated.getNodalOfficerEmail());
        if (updated.getIsRetrievalCenter() != null) existing.setIsRetrievalCenter(updated.getIsRetrievalCenter());
        if (updated.getIsTransplantCenter() != null) existing.setIsTransplantCenter(updated.getIsTransplantCenter());
        if (updated.getTotalBeds() != null) existing.setTotalBeds(updated.getTotalBeds());
        if (updated.getIcuBedsAvailable() != null) existing.setIcuBedsAvailable(updated.getIcuBedsAvailable());
        if (updated.getOrganTransplantIcuBeds() != null) existing.setOrganTransplantIcuBeds(updated.getOrganTransplantIcuBeds());
        return hospitalRepository.save(existing);
    }

    public Hospital archiveHospital(Long id, String reason) {
        Hospital existing = getHospitalById(id);
        existing.setIsActive(false);
        existing.setVerificationStatus(com.lifelink.enums.VerificationStatus.SUSPENDED);
        existing.setVerificationNotes(reason != null ? reason : "Archived by administrator");
        return hospitalRepository.save(existing);
    }

    public Hospital verifyHospital(Long id, com.lifelink.enums.VerificationStatus status, String notes, Long reviewerId) {
        Hospital existing = getHospitalById(id);
        existing.setVerificationStatus(status);
        existing.setVerificationNotes(notes);
        existing.setVerifiedByUserId(reviewerId);
        existing.setVerifiedAt(java.time.LocalDateTime.now());
        if (status == com.lifelink.enums.VerificationStatus.REJECTED || status == com.lifelink.enums.VerificationStatus.SUSPENDED) {
            existing.setIsActive(false);
        } else if (status == com.lifelink.enums.VerificationStatus.VERIFIED) {
            existing.setIsActive(true);
        }
        return hospitalRepository.save(existing);
    }

    public void deleteHospital(Long id) {
        Hospital existing = getHospitalById(id);
        existing.setIsActive(false);
        existing.setVerificationStatus(com.lifelink.enums.VerificationStatus.SUSPENDED);
        hospitalRepository.save(existing);
    }
}
