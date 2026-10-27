package com.lifelink.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class ContributeRequest {
    @NotNull(message = "Campaign ID is required")
    private Long campaignId;

    @NotBlank(message = "Contributor name is required")
    private String contributorName;

    @NotBlank(message = "Contributor email is required")
    @Email(message = "Valid email is required")
    private String contributorEmail;

    private String contributorPhone;
    private String panNumber;

    @NotNull(message = "Contribution amount is required")
    private BigDecimal amountInr;

    @NotBlank(message = "Payment method is required")
    private String paymentMethod; // UPI, NET_BANKING, DEBIT_CARD, CREDIT_CARD

    private Boolean is80gClaimed = false;

    public ContributeRequest() {}

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }

    public String getContributorName() { return contributorName; }
    public void setContributorName(String contributorName) { this.contributorName = contributorName; }

    public String getContributorEmail() { return contributorEmail; }
    public void setContributorEmail(String contributorEmail) { this.contributorEmail = contributorEmail; }

    public String getContributorPhone() { return contributorPhone; }
    public void setContributorPhone(String contributorPhone) { this.contributorPhone = contributorPhone; }

    public String getPanNumber() { return panNumber; }
    public void setPanNumber(String panNumber) { this.panNumber = panNumber; }

    public BigDecimal getAmountInr() { return amountInr; }
    public void setAmountInr(BigDecimal amountInr) { this.amountInr = amountInr; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public Boolean getIs80gClaimed() { return is80gClaimed; }
    public void setIs80gClaimed(Boolean is80gClaimed) { this.is80gClaimed = is80gClaimed; }
}
