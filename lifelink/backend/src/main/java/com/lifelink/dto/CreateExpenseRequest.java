package com.lifelink.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateExpenseRequest {
    @NotNull(message = "Campaign ID is required")
    private Long campaignId;

    private Long budgetId;

    @NotBlank(message = "Vendor name is required")
    private String vendorName;

    private String invoiceNumber;
    private LocalDate invoiceDate;

    @NotNull(message = "Amount is required")
    private BigDecimal amountInr;

    private String justification;
    private String invoiceDocumentPath;

    public CreateExpenseRequest() {}

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }

    public Long getBudgetId() { return budgetId; }
    public void setBudgetId(Long budgetId) { this.budgetId = budgetId; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }

    public BigDecimal getAmountInr() { return amountInr; }
    public void setAmountInr(BigDecimal amountInr) { this.amountInr = amountInr; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }

    public String getInvoiceDocumentPath() { return invoiceDocumentPath; }
    public void setInvoiceDocumentPath(String invoiceDocumentPath) { this.invoiceDocumentPath = invoiceDocumentPath; }
}
