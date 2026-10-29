package com.lifelink.dto;

import java.math.BigDecimal;

public class BudgetCategoryItem {
    private String categoryName;
    private BigDecimal allocatedAmountInr;
    private String justification;

    public BudgetCategoryItem() {}

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public BigDecimal getAllocatedAmountInr() { return allocatedAmountInr; }
    public void setAllocatedAmountInr(BigDecimal allocatedAmountInr) { this.allocatedAmountInr = allocatedAmountInr; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }
}
