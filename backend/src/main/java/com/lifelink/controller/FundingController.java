package com.lifelink.controller;

import com.lifelink.dto.*;
import com.lifelink.entity.*;
import com.lifelink.security.UserPrincipal;
import com.lifelink.service.FundingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/funding", "/api/lifelink/funding"})
public class FundingController {

    private final FundingService fundingService;

    public FundingController(FundingService fundingService) {
        this.fundingService = fundingService;
    }

    @GetMapping("/campaigns")
    public ResponseEntity<ApiResponse<List<FundingCampaign>>> getAllCampaigns() {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getAllCampaigns()));
    }

    @GetMapping("/public/campaigns")
    public ResponseEntity<ApiResponse<List<FundingCampaign>>> getPublicCampaigns() {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getActiveCampaigns()));
    }

    @GetMapping("/campaigns/active")
    public ResponseEntity<ApiResponse<List<FundingCampaign>>> getActiveCampaigns() {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getActiveCampaigns()));
    }

    @GetMapping("/campaigns/{id}")
    public ResponseEntity<ApiResponse<FundingCampaign>> getCampaignById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getCampaignById(id)));
    }

    @GetMapping("/campaigns/{id}/budgets")
    public ResponseEntity<ApiResponse<List<FundingBudget>>> getBudgets(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getBudgetsForCampaign(id)));
    }

    @GetMapping("/campaigns/{id}/transactions")
    public ResponseEntity<ApiResponse<List<ContributionTransaction>>> getTransactions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getTransactionsForCampaign(id)));
    }

    @GetMapping("/campaigns/{id}/expenses")
    public ResponseEntity<ApiResponse<List<ExpenseRecord>>> getExpenses(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getExpensesForCampaign(id)));
    }

    @PostMapping("/campaigns")
    public ResponseEntity<ApiResponse<FundingCampaign>> createCampaign(@Valid @RequestBody CreateCampaignRequest request,
                                                                       @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        FundingCampaign created = fundingService.createCampaign(request, userId);
        return ResponseEntity.ok(ApiResponse.ok("Funding campaign created", created));
    }

    @PostMapping("/contribute")
    public ResponseEntity<ApiResponse<ContributionTransaction>> contribute(@Valid @RequestBody ContributeRequest request,
                                                                           @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : null;
        ContributionTransaction txn = fundingService.initiateContribution(request, userId);
        return ResponseEntity.ok(ApiResponse.ok("Contribution initiated", txn));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Receipt>> verifyPayment(@Valid @RequestBody PaymentVerifyRequest request) {
        Receipt receipt = fundingService.verifyPayment(request);
        return ResponseEntity.ok(ApiResponse.ok("Payment verified and genuine receipt issued", receipt));
    }

    @GetMapping("/receipts/{receiptNumber}")
    public ResponseEntity<ApiResponse<Receipt>> getReceiptByNumber(@PathVariable String receiptNumber) {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getReceiptByNumber(receiptNumber)));
    }

    @GetMapping("/receipts/verify-hash/{hash}")
    public ResponseEntity<ApiResponse<Receipt>> verifyReceiptHash(@PathVariable String hash) {
        return ResponseEntity.ok(ApiResponse.ok("Receipt verified mathematically with SHA-256 integrity hash", fundingService.getReceiptByHash(hash)));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ApiResponse<ExpenseRecord>> submitExpense(@Valid @RequestBody CreateExpenseRequest request,
                                                                    @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        ExpenseRecord expense = fundingService.createExpense(request, userId);
        return ResponseEntity.ok(ApiResponse.ok("Expense submitted for audit review", expense));
    }

    @PatchMapping("/expenses/{id}/audit")
    public ResponseEntity<ApiResponse<ExpenseRecord>> auditExpense(@PathVariable Long id,
                                                                   @RequestBody ApproveExpenseRequest request,
                                                                   @AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        ExpenseRecord updated = fundingService.approveExpense(id, request, userId);
        return ResponseEntity.ok(ApiResponse.ok("Expense audit completed", updated));
    }

    @GetMapping("/reconciliations")
    public ResponseEntity<ApiResponse<List<FinancialReconciliation>>> getReconciliations() {
        return ResponseEntity.ok(ApiResponse.ok(fundingService.getAllReconciliations()));
    }
}
