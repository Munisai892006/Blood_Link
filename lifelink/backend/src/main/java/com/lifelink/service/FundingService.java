package com.lifelink.service;

import com.lifelink.dto.*;
import com.lifelink.entity.*;
import com.lifelink.enums.CampaignStatus;
import com.lifelink.enums.ExpenseStatus;
import com.lifelink.enums.PaymentStatus;
import com.lifelink.exception.BadRequestException;
import com.lifelink.exception.ResourceNotFoundException;
import com.lifelink.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class FundingService {

    private final FundingCampaignRepository campaignRepository;
    private final FundingBudgetRepository budgetRepository;
    private final ContributionTransactionRepository transactionRepository;
    private final ExpenseRecordRepository expenseRepository;
    private final FinancialReconciliationRepository reconciliationRepository;
    private final ReceiptRepository receiptRepository;
    private final AuditLogRepository auditLogRepository;

    public FundingService(FundingCampaignRepository campaignRepository,
                          FundingBudgetRepository budgetRepository,
                          ContributionTransactionRepository transactionRepository,
                          ExpenseRecordRepository expenseRepository,
                          FinancialReconciliationRepository reconciliationRepository,
                          ReceiptRepository receiptRepository,
                          AuditLogRepository auditLogRepository) {
        this.campaignRepository = campaignRepository;
        this.budgetRepository = budgetRepository;
        this.transactionRepository = transactionRepository;
        this.expenseRepository = expenseRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.receiptRepository = receiptRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public List<FundingCampaign> getAllCampaigns() {
        return campaignRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<FundingCampaign> getActiveCampaigns() {
        return campaignRepository.findByStatus(CampaignStatus.ACTIVE);
    }

    public FundingCampaign getCampaignById(Long id) {
        return campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found with id: " + id));
    }

    public FundingCampaign getCampaignByCode(String code) {
        return campaignRepository.findByCampaignCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found with code: " + code));
    }

    public List<FundingBudget> getBudgetsForCampaign(Long campaignId) {
        return budgetRepository.findByCampaignId(campaignId);
    }

    public List<ContributionTransaction> getTransactionsForCampaign(Long campaignId) {
        return transactionRepository.findByCampaignId(campaignId);
    }

    public List<ExpenseRecord> getExpensesForCampaign(Long campaignId) {
        return expenseRepository.findByCampaignId(campaignId);
    }

    @Transactional
    public FundingCampaign createCampaign(CreateCampaignRequest request, Long userId) {
        String code = "CMP-" + LocalDateTime.now().getYear() + "-" + String.format("%04d", (campaignRepository.count() + 1));

        FundingCampaign campaign = new FundingCampaign();
        campaign.setCampaignCode(code);
        campaign.setTitle(request.getTitle());
        campaign.setPurpose(request.getPurpose());
        campaign.setCaseId(request.getCaseId());
        campaign.setTransportAssignmentId(request.getTransportAssignmentId());
        campaign.setTargetAmountInr(request.getTargetAmountInr());
        campaign.setCollectedAmountInr(BigDecimal.ZERO);
        campaign.setStatus(CampaignStatus.ACTIVE); // Auto-active for demonstration
        campaign.setDescription(request.getDescription());
        campaign.setCreatedByUserId(userId);
        campaign.setApprovedByUserId(userId);

        FundingCampaign saved = campaignRepository.save(campaign);

        if (request.getBudgetCategories() != null && !request.getBudgetCategories().isEmpty()) {
            for (BudgetCategoryItem item : request.getBudgetCategories()) {
                FundingBudget budget = new FundingBudget();
                budget.setCampaignId(saved.getId());
                budget.setCategoryName(item.getCategoryName());
                budget.setAllocatedAmountInr(item.getAllocatedAmountInr());
                budget.setSpentAmountInr(BigDecimal.ZERO);
                budget.setJustification(item.getJustification());
                budgetRepository.save(budget);
            }
        }

        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction("CREATE_FUNDING_CAMPAIGN");
        audit.setEntityType("FUNDING_CAMPAIGN");
        audit.setEntityId(saved.getId());
        audit.setDetails("Created logistics funding campaign " + code + " for target INR " + request.getTargetAmountInr());
        auditLogRepository.save(audit);

        return saved;
    }

    @Transactional
    public ContributionTransaction initiateContribution(ContributeRequest request, Long userId) {
        FundingCampaign campaign = getCampaignById(request.getCampaignId());

        String ref = "TXN-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        ContributionTransaction txn = new ContributionTransaction();
        txn.setTransactionReference(ref);
        txn.setCampaignId(campaign.getId());
        txn.setContributorUserId(userId);
        txn.setContributorName(request.getContributorName());
        txn.setContributorEmail(request.getContributorEmail());
        txn.setContributorPhone(request.getContributorPhone());
        txn.setPanNumber(request.getPanNumber());
        txn.setAmountInr(request.getAmountInr());
        txn.setPaymentMethod(request.getPaymentMethod());
        txn.setStatus(PaymentStatus.INITIATED);
        txn.setIs80gClaimed(request.getIs80gClaimed());
        txn.setGatewayOrderId("order_ll_" + System.currentTimeMillis());

        return transactionRepository.save(txn);
    }

    @Transactional
    public Receipt verifyPayment(PaymentVerifyRequest request) {
        ContributionTransaction txn = transactionRepository.findByTransactionReference(request.getTransactionReference())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + request.getTransactionReference()));

        if (txn.getStatus() == PaymentStatus.SUCCESS) {
            return receiptRepository.findByTransactionId(txn.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Receipt already issued for transaction"));
        }

        txn.setStatus(PaymentStatus.SUCCESS);
        txn.setGatewayPaymentId(request.getGatewayPaymentId() != null ? request.getGatewayPaymentId() : "pay_sim_" + System.currentTimeMillis());
        txn.setGatewaySignature(request.getGatewaySignature() != null ? request.getGatewaySignature() : "sig_verified_" + UUID.randomUUID().toString().substring(0, 8));
        transactionRepository.save(txn);

        // Update Campaign Collected Amount
        FundingCampaign campaign = getCampaignById(txn.getCampaignId());
        campaign.setCollectedAmountInr(campaign.getCollectedAmountInr().add(txn.getAmountInr()));
        if (campaign.getCollectedAmountInr().compareTo(campaign.getTargetAmountInr()) >= 0) {
            campaign.setStatus(CampaignStatus.FUNDED);
        }
        campaignRepository.save(campaign);

        // Generate SHA-256 Digital Hash for genuine receipt verification
        String rawData = txn.getTransactionReference() + "|" + txn.getAmountInr() + "|" + txn.getContributorName() + "|" + LocalDate.now();
        String sha256Hash = computeSha256(rawData);

        String receiptNumber = "REC-" + LocalDate.now().getYear() + "-" + String.format("%06d", (receiptRepository.count() + 1));

        Receipt receipt = new Receipt();
        receipt.setReceiptNumber(receiptNumber);
        receipt.setTransactionId(txn.getId());
        receipt.setReceiptDate(LocalDate.now());
        receipt.setContributorName(txn.getContributorName());
        receipt.setContributorPan(txn.getPanNumber());
        receipt.setAmountInr(txn.getAmountInr());
        receipt.setTaxExemptionSection("SECTION_80G");
        receipt.setDigitalSignatureHash(sha256Hash);
        receipt.setIsVerified(true);

        return receiptRepository.save(receipt);
    }

    public Receipt getReceiptByHash(String hash) {
        return receiptRepository.findByDigitalSignatureHash(hash)
                .orElseThrow(() -> new ResourceNotFoundException("No valid receipt found with hash: " + hash));
    }

    public Receipt getReceiptByNumber(String receiptNumber) {
        return receiptRepository.findByReceiptNumber(receiptNumber)
                .orElseThrow(() -> new ResourceNotFoundException("No valid receipt found with number: " + receiptNumber));
    }

    @Transactional
    public ExpenseRecord createExpense(CreateExpenseRequest request, Long userId) {
        String ref = "EXP-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        ExpenseRecord expense = new ExpenseRecord();
        expense.setCampaignId(request.getCampaignId());
        expense.setBudgetId(request.getBudgetId());
        expense.setExpenseReference(ref);
        expense.setVendorName(request.getVendorName());
        expense.setInvoiceNumber(request.getInvoiceNumber());
        expense.setInvoiceDate(request.getInvoiceDate() != null ? request.getInvoiceDate() : LocalDate.now());
        expense.setAmountInr(request.getAmountInr());
        expense.setStatus(ExpenseStatus.SUBMITTED);
        expense.setSubmittedByUserId(userId);
        expense.setJustification(request.getJustification());
        expense.setInvoiceDocumentPath(request.getInvoiceDocumentPath());

        return expenseRepository.save(expense);
    }

    @Transactional
    public ExpenseRecord approveExpense(Long expenseId, ApproveExpenseRequest request, Long userId) {
        ExpenseRecord expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + expenseId));

        expense.setStatus(request.getApproved() ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED);
        expense.setApprovedByUserId(userId);
        expense.setAuditNotes(request.getAuditNotes());
        if (request.getApproved()) {
            expense.setDisbursedAt(LocalDateTime.now());
            // Update spent in budget
            if (expense.getBudgetId() != null) {
                budgetRepository.findById(expense.getBudgetId()).ifPresent(b -> {
                    b.setSpentAmountInr(b.getSpentAmountInr().add(expense.getAmountInr()));
                    budgetRepository.save(b);
                });
            }
        }

        return expenseRepository.save(expense);
    }

    public List<FinancialReconciliation> getAllReconciliations() {
        return reconciliationRepository.findAllByOrderByCreatedAtDesc();
    }

    private String computeSha256(String base) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }
}
