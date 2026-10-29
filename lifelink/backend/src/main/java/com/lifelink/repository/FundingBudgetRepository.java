package com.lifelink.repository;

import com.lifelink.entity.FundingBudget;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FundingBudgetRepository extends JpaRepository<FundingBudget, Long> {

    List<FundingBudget> findByCampaignId(Long campaignId);
}
