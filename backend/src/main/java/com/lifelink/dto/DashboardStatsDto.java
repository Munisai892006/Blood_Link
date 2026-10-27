package com.lifelink.dto;

import java.math.BigDecimal;

public class DashboardStatsDto {
    private long totalCases;
    private long activeCases;
    private long completedTransplants;
    private long organsInTransit;
    private long activeCorridors;
    private BigDecimal totalFundingRaisedInr = BigDecimal.ZERO;
    private BigDecimal totalExpensesInr = BigDecimal.ZERO;
    private long availableVehicles;
    private long registeredHospitals;

    public DashboardStatsDto() {}

    public long getTotalCases() { return totalCases; }
    public void setTotalCases(long totalCases) { this.totalCases = totalCases; }

    public long getActiveCases() { return activeCases; }
    public void setActiveCases(long activeCases) { this.activeCases = activeCases; }

    public long getCompletedTransplants() { return completedTransplants; }
    public void setCompletedTransplants(long completedTransplants) { this.completedTransplants = completedTransplants; }

    public long getOrgansInTransit() { return organsInTransit; }
    public void setOrgansInTransit(long organsInTransit) { this.organsInTransit = organsInTransit; }

    public long getActiveCorridors() { return activeCorridors; }
    public void setActiveCorridors(long activeCorridors) { this.activeCorridors = activeCorridors; }

    public BigDecimal getTotalFundingRaisedInr() { return totalFundingRaisedInr; }
    public void setTotalFundingRaisedInr(BigDecimal totalFundingRaisedInr) { this.totalFundingRaisedInr = totalFundingRaisedInr; }

    public BigDecimal getTotalExpensesInr() { return totalExpensesInr; }
    public void setTotalExpensesInr(BigDecimal totalExpensesInr) { this.totalExpensesInr = totalExpensesInr; }

    public long getAvailableVehicles() { return availableVehicles; }
    public void setAvailableVehicles(long availableVehicles) { this.availableVehicles = availableVehicles; }

    public long getRegisteredHospitals() { return registeredHospitals; }
    public void setRegisteredHospitals(long registeredHospitals) { this.registeredHospitals = registeredHospitals; }
}
