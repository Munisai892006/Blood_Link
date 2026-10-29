package com.lifelink.dto;

import com.lifelink.enums.WorkflowStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateWorkflowStatusRequest {
    @NotNull(message = "Workflow status is required")
    private WorkflowStatus workflowStatus;
    private String notes;

    public UpdateWorkflowStatusRequest() {}

    public WorkflowStatus getWorkflowStatus() { return workflowStatus; }
    public void setWorkflowStatus(WorkflowStatus workflowStatus) { this.workflowStatus = workflowStatus; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
