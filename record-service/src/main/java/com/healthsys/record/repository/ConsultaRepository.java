package com.healthsys.record.repository;

import com.healthsys.record.model.Consulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConsultaRepository extends JpaRepository<Consulta, Long> {
    List<Consulta> findByPatientIdOrderByDataDesc(String patientId);
    List<Consulta> findAllByOrderByDataDesc();
}
