package com.lifelink.service;

import com.lifelink.dto.DashboardStatsDto;
import com.lifelink.enums.TransportStatus;
import com.lifelink.enums.WorkflowStatus;
import com.lifelink.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class ReportService {

    private final DonorCaseRepository caseRepository;
    private final TransportAssignmentRepository transportRepository;
    private final FundingCampaignRepository campaignRepository;
    private final ExpenseRecordRepository expenseRepository;
    private final VehicleRepository vehicleRepository;
    private final HospitalRepository hospitalRepository;

    public ReportService(DonorCaseRepository caseRepository,
                         TransportAssignmentRepository transportRepository,
                         FundingCampaignRepository campaignRepository,
                         ExpenseRecordRepository expenseRepository,
                         VehicleRepository vehicleRepository,
                         HospitalRepository hospitalRepository) {
        this.caseRepository = caseRepository;
        this.transportRepository = transportRepository;
        this.campaignRepository = campaignRepository;
        this.expenseRepository = expenseRepository;
        this.vehicleRepository = vehicleRepository;
        this.hospitalRepository = hospitalRepository;
    }

    public DashboardStatsDto getDashboardStats() {
        DashboardStatsDto dto = new DashboardStatsDto();

        dto.setTotalCases(caseRepository.count());
        dto.setActiveCases(caseRepository.countByWorkflowStatus(WorkflowStatus.POTENTIAL_DONOR_IDENTIFIED)
                + caseRepository.countByWorkflowStatus(WorkflowStatus.BRAIN_DEATH_FIRST_CERTIFICATION)
                + caseRepository.countByWorkflowStatus(WorkflowStatus.BRAIN_DEATH_SECOND_CERTIFICATION)
                + caseRepository.countByWorkflowStatus(WorkflowStatus.ORGAN_ALLOCATION_COORDINATED)
                + caseRepository.countByWorkflowStatus(WorkflowStatus.RETRIEVAL_COMMENCED));
        dto.setCompletedTransplants(caseRepository.countByWorkflowStatus(WorkflowStatus.CASE_COMPLETED));

        long inTransit = transportRepository.findByStatus(TransportStatus.IN_TRANSIT).size()
                + transportRepository.findByStatus(TransportStatus.GREEN_CORRIDOR_ACTIVE).size();
        dto.setOrgansInTransit(inTransit);
        dto.setActiveCorridors(transportRepository.findByStatus(TransportStatus.GREEN_CORRIDOR_ACTIVE).size());

        BigDecimal totalRaised = campaignRepository.findAll().stream()
                .map(c -> c.getCollectedAmountInr() != null ? c.getCollectedAmountInr() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setTotalFundingRaisedInr(totalRaised);

        BigDecimal totalSpent = expenseRepository.findAll().stream()
                .map(e -> e.getAmountInr() != null ? e.getAmountInr() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dto.setTotalExpensesInr(totalSpent);

        dto.setAvailableVehicles(vehicleRepository.findByIsActiveTrue().size());
        dto.setRegisteredHospitals(hospitalRepository.count());

        return dto;
    }
}
