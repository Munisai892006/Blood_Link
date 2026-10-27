package com.lifelink.repository;

import com.lifelink.entity.ExpenseRecord;
import com.lifelink.enums.ExpenseStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExpenseRecordRepository extends JpaRepository<ExpenseRecord, Long> {

    Optional<ExpenseRecord> findByExpenseReference(String expenseReference);
    List<ExpenseRecord> findByCampaignId(Long campaignId);
    List<ExpenseRecord> findByStatus(ExpenseStatus status);
    List<ExpenseRecord> findAllByOrderByCreatedAtDesc();
}
