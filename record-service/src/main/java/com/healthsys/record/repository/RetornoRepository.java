package com.healthsys.record.repository;

import com.healthsys.record.model.Retorno;
import com.healthsys.record.model.RetornoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RetornoRepository extends JpaRepository<Retorno, Long> {
    List<Retorno> findAllByOrderByDataCriacaoDesc();
    List<Retorno> findByStatusOrderByDataCriacaoDesc(RetornoStatus status);
}
