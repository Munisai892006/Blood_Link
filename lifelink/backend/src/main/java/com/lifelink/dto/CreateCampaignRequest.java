package com.lifelink.dto;

import com.lifelink.enums.CampaignPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public class CreateCampaignRequest {
    @NotBlank(message = "Campaign title is required")
    private String title;

    @NotNull(message = "Campaign purpose is required")
    private CampaignPurpose purpose;

    private Long caseId;
    private Long transportAssignmentId;

    @NotNull(message = "Target amount is required")
    private BigDecimal targetAmountInr;

    private String description;
    private List<BudgetCategoryItem> budgetCategories;

    public CreateCampaignRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public CampaignPurpose getPurpose() { return purpose; }
    public void setPurpose(CampaignPurpose purpose) { this.purpose = purpose; }

    public Long getCaseId() { return caseId; }
    public void setCaseId(Long caseId) { this.caseId = caseId; }

    public Long getTransportAssignmentId() { return transportAssignmentId; }
    public void setTransportAssignmentId(Long transportAssignmentId) { this.transportAssignmentId = transportAssignmentId; }

    public BigDecimal getTargetAmountInr() { return targetAmountInr; }
    public void setTargetAmountInr(BigDecimal targetAmountInr) { this.targetAmountInr = targetAmountInr; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<BudgetCategoryItem> getBudgetCategories() { return budgetCategories; }
    public void setBudgetCategories(List<BudgetCategoryItem> budgetCategories) { this.budgetCategories = budgetCategories; }
}
