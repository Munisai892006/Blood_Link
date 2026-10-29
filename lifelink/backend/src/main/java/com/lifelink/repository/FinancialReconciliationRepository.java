package com.lifelink.repository;

import com.lifelink.entity.FinancialReconciliation;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FinancialReconciliationRepository extends JpaRepository<FinancialReconciliation, Long> {

    Optional<FinancialReconciliation> findByReconciliationPeriod(String reconciliationPeriod);
    List<FinancialReconciliation> findAllByOrderByCreatedAtDesc();
}
