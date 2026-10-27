package com.lifelink.repository;

import com.lifelink.entity.FundingCampaign;
import com.lifelink.enums.CampaignStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FundingCampaignRepository extends JpaRepository<FundingCampaign, Long> {

    Optional<FundingCampaign> findByCampaignCode(String campaignCode);
    List<FundingCampaign> findByStatus(CampaignStatus status);
    List<FundingCampaign> findAllByOrderByCreatedAtDesc();
}
