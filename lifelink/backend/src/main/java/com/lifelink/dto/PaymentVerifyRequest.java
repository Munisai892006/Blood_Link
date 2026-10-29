package com.lifelink.dto;

import jakarta.validation.constraints.NotBlank;

public class PaymentVerifyRequest {
    @NotBlank(message = "Transaction reference is required")
    private String transactionReference;

    private String gatewayOrderId;
    private String gatewayPaymentId;
    private String gatewaySignature;

    public PaymentVerifyRequest() {}

    public String getTransactionReference() { return transactionReference; }
    public void setTransactionReference(String transactionReference) { this.transactionReference = transactionReference; }

    public String getGatewayOrderId() { return gatewayOrderId; }
    public void setGatewayOrderId(String gatewayOrderId) { this.gatewayOrderId = gatewayOrderId; }

    public String getGatewayPaymentId() { return gatewayPaymentId; }
    public void setGatewayPaymentId(String gatewayPaymentId) { this.gatewayPaymentId = gatewayPaymentId; }

    public String getGatewaySignature() { return gatewaySignature; }
    public void setGatewaySignature(String gatewaySignature) { this.gatewaySignature = gatewaySignature; }
}
