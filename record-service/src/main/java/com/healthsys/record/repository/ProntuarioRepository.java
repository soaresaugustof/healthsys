package com.healthsys.record.repository;

import com.healthsys.record.model.Prontuario;
import com.healthsys.record.model.ProntuarioStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProntuarioRepository extends JpaRepository<Prontuario, Long> {
    List<Prontuario> findAllByOrderByDataInternacaoDesc();
    List<Prontuario> findByStatusOrderByDataInternacaoDesc(ProntuarioStatus status);
}
