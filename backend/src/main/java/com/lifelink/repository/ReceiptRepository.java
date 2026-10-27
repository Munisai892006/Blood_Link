package com.lifelink.repository;

import com.lifelink.entity.Receipt;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Long> {

    Optional<Receipt> findByReceiptNumber(String receiptNumber);
    Optional<Receipt> findByTransactionId(Long transactionId);
    Optional<Receipt> findByDigitalSignatureHash(String digitalSignatureHash);
}
