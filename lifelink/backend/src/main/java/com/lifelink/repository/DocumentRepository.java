package com.lifelink.repository;

import com.lifelink.entity.Document;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByCaseId(Long caseId);
    List<Document> findByCaseIdAndDocumentType(Long caseId, String documentType);
}
