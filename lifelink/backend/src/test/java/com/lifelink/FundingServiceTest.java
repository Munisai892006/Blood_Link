package com.lifelink;

import com.lifelink.dto.*;
import com.lifelink.entity.*;
import com.lifelink.enums.CampaignPurpose;
import com.lifelink.enums.CampaignStatus;
import com.lifelink.enums.PaymentStatus;
import com.lifelink.service.FundingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
class FundingServiceTest {

    @Autowired
    private FundingService fundingService;

    @Test
    void testCreateCampaignContributeVerifyAndSha256Receipt() {
        // 1. Create Campaign
        CreateCampaignRequest campReq = new CreateCampaignRequest();
        campReq.setTitle("Emergency Perfusion Box Transport: Yashoda to KIMS");
        campReq.setPurpose(CampaignPurpose.PERFUSION_MACHINE_MOBILIZATION);
        campReq.setTargetAmountInr(new BigDecimal("50000.00"));
        campReq.setDescription("Logistics coordination for ex-vivo perfusion device mobilization");

        BudgetCategoryItem b1 = new BudgetCategoryItem();
        b1.setCategoryName("Perfusion Disposable Tubing & Cannula Kit");
        b1.setAllocatedAmountInr(new BigDecimal("30000.00"));
        b1.setJustification("Single-use sterile perfusion consumables");
        campReq.setBudgetCategories(List.of(b1));

        FundingCampaign campaign = fundingService.createCampaign(campReq, 1L);
        assertNotNull(campaign);
        assertTrue(campaign.getCampaignCode().startsWith("CMP-"));
        assertEquals(CampaignStatus.ACTIVE, campaign.getStatus());

        // 2. Initiate Contribution
        ContributeRequest contReq = new ContributeRequest();
        contReq.setCampaignId(campaign.getId());
        contReq.setContributorName("Dr. Sunita Sharma");
        contReq.setContributorEmail("sunita.sharma@example.com");
        contReq.setContributorPhone("+91 91234 56789");
        contReq.setPanNumber("ABCDE9876Z");
        contReq.setAmountInr(new BigDecimal("10000.00"));
        contReq.setPaymentMethod("UPI");
        contReq.setIs80gClaimed(true);

        ContributionTransaction txn = fundingService.initiateContribution(contReq, 7L);
        assertNotNull(txn);
        assertTrue(txn.getTransactionReference().startsWith("TXN-"));
        assertEquals(PaymentStatus.INITIATED, txn.getStatus());

        // 3. Verify Payment
        PaymentVerifyRequest verifyReq = new PaymentVerifyRequest();
        verifyReq.setTransactionReference(txn.getTransactionReference());
        verifyReq.setGatewayPaymentId("pay_test_online_8899");
        verifyReq.setGatewaySignature("sig_valid_hash_001");

        Receipt receipt = fundingService.verifyPayment(verifyReq);
        assertNotNull(receipt);
        assertTrue(receipt.getReceiptNumber().startsWith("REC-"));
        assertEquals(new BigDecimal("10000.00"), receipt.getAmountInr());
        assertEquals("SECTION_80G", receipt.getTaxExemptionSection());
        assertNotNull(receipt.getDigitalSignatureHash());
        assertEquals(64, receipt.getDigitalSignatureHash().length()); // SHA-256 hash length

        // 4. Verify Receipt via cryptographic hash lookup
        Receipt hashVerified = fundingService.getReceiptByHash(receipt.getDigitalSignatureHash());
        assertNotNull(hashVerified);
        assertEquals(receipt.getReceiptNumber(), hashVerified.getReceiptNumber());
    }
}
