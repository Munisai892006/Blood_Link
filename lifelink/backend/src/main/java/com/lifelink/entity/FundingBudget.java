package com.lifelink.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "funding_budgets")
public class FundingBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(name = "category_name", nullable = false, length = 128)
    private String categoryName;

    @Column(name = "allocated_amount_inr", nullable = false, precision = 12, scale = 2)
    private BigDecimal allocatedAmountInr;

    @Column(name = "spent_amount_inr", precision = 12, scale = 2)
    private BigDecimal spentAmountInr = BigDecimal.ZERO;

    @Column(name = "justification", columnDefinition = "TEXT")
    private String justification;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public FundingBudget() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public BigDecimal getAllocatedAmountInr() { return allocatedAmountInr; }
    public void setAllocatedAmountInr(BigDecimal allocatedAmountInr) { this.allocatedAmountInr = allocatedAmountInr; }

    public BigDecimal getSpentAmountInr() { return spentAmountInr; }
    public void setSpentAmountInr(BigDecimal spentAmountInr) { this.spentAmountInr = spentAmountInr; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
