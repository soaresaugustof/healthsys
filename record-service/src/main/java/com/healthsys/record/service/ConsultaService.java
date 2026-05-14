package com.healthsys.record.service;

import com.healthsys.record.model.Consulta;
import com.healthsys.record.repository.ConsultaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ConsultaService {

    @Autowired
    private ConsultaRepository repository;

    public List<Consulta> findAll() {
        return repository.findAllByOrderByDataDesc();
    }

    public List<Consulta> findByPatientId(String patientId) {
        return repository.findByPatientIdOrderByDataDesc(patientId);
    }

    public Consulta create(Consulta consulta) {
        consulta.setData(LocalDateTime.now());
        return repository.save(consulta);
    }
}
