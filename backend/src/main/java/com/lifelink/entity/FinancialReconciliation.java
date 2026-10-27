package com.lifelink.entity;

import com.lifelink.enums.ReconciliationStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "financial_reconciliations")
public class FinancialReconciliation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reconciliation_period", nullable = false, length = 32)
    private String reconciliationPeriod;

    @Column(name = "total_contributions_inr", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalContributionsInr;

    @Column(name = "total_expenses_inr", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalExpensesInr;

    @Column(name = "escrow_balance_inr", nullable = false, precision = 14, scale = 2)
    private BigDecimal escrowBalanceInr;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private ReconciliationStatus status = ReconciliationStatus.OPEN;

    @Column(name = "reconciled_by_user_id")
    private Long reconciledByUserId;

    @Column(name = "audit_report_path", length = 255)
    private String auditReportPath;

    @Column(name = "audit_report_sha256", length = 64)
    private String auditReportSha256;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "reconciled_at")
    private LocalDateTime reconciledAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public FinancialReconciliation() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReconciliationPeriod() { return reconciliationPeriod; }
    public void setReconciliationPeriod(String reconciliationPeriod) { this.reconciliationPeriod = reconciliationPeriod; }

    public BigDecimal getTotalContributionsInr() { return totalContributionsInr; }
    public void setTotalContributionsInr(BigDecimal totalContributionsInr) { this.totalContributionsInr = totalContributionsInr; }

    public BigDecimal getTotalExpensesInr() { return totalExpensesInr; }
    public void setTotalExpensesInr(BigDecimal totalExpensesInr) { this.totalExpensesInr = totalExpensesInr; }

    public BigDecimal getEscrowBalanceInr() { return escrowBalanceInr; }
    public void setEscrowBalanceInr(BigDecimal escrowBalanceInr) { this.escrowBalanceInr = escrowBalanceInr; }

    public ReconciliationStatus getStatus() { return status; }
    public void setStatus(ReconciliationStatus status) { this.status = status; }

    public Long getReconciledByUserId() { return reconciledByUserId; }
    public void setReconciledByUserId(Long reconciledByUserId) { this.reconciledByUserId = reconciledByUserId; }

    public String getAuditReportPath() { return auditReportPath; }
    public void setAuditReportPath(String auditReportPath) { this.auditReportPath = auditReportPath; }

    public String getAuditReportSha256() { return auditReportSha256; }
    public void setAuditReportSha256(String auditReportSha256) { this.auditReportSha256 = auditReportSha256; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getReconciledAt() { return reconciledAt; }
    public void setReconciledAt(LocalDateTime reconciledAt) { this.reconciledAt = reconciledAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
