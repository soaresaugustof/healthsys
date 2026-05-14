package com.healthsys.record.repository;

import com.healthsys.record.model.Exame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExameRepository extends JpaRepository<Exame, Long> {
    List<Exame> findAllByOrderByDataSolicitacaoDesc();
    List<Exame> findByPatientIdOrderByDataSolicitacaoDesc(String patientId);
}
