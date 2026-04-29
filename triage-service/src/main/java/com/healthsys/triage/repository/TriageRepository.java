package com.healthsys.triage.repository;

import com.healthsys.triage.model.Triage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TriageRepository extends JpaRepository<Triage, Long> {
}
