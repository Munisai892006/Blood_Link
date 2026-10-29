package com.lifelink.dto;

public class ApproveExpenseRequest {
    private Boolean approved;
    private String auditNotes;

    public ApproveExpenseRequest() {}

    public Boolean getApproved() { return approved; }
    public void setApproved(Boolean approved) { this.approved = approved; }

    public String getAuditNotes() { return auditNotes; }
    public void setAuditNotes(String auditNotes) { this.auditNotes = auditNotes; }
}
