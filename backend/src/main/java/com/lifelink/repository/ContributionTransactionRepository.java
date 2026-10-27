package com.lifelink.repository;

import com.lifelink.entity.ContributionTransaction;
import com.lifelink.enums.PaymentStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ContributionTransactionRepository extends JpaRepository<ContributionTransaction, Long> {

    Optional<ContributionTransaction> findByTransactionReference(String transactionReference);
    List<ContributionTransaction> findByCampaignId(Long campaignId);
    List<ContributionTransaction> findByContributorUserId(Long contributorUserId);
    List<ContributionTransaction> findByStatus(PaymentStatus status);
    List<ContributionTransaction> findAllByOrderByCreatedAtDesc();
}
