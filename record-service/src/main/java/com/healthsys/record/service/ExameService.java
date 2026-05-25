package com.healthsys.record.service;

import com.healthsys.record.messaging.ExameEventProducer;
import com.healthsys.record.model.Exame;
import com.healthsys.record.model.ExameStatus;
import com.healthsys.record.repository.ExameRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExameService {

    @Autowired
    private ExameRepository repository;

    @Autowired
    private ExameEventProducer exameEventProducer;

    public List<Exame> findAll() {
        return repository.findAllByOrderByDataSolicitacaoDesc();
    }

    public List<Exame> findByPatientId(String patientId) {
        return repository.findByPatientIdOrderByDataSolicitacaoDesc(patientId);
    }

    public Exame create(Exame exame) {
        exame.setDataSolicitacao(LocalDateTime.now());
        exame.setStatus(ExameStatus.SOLICITADO);
        Exame saved = repository.save(exame);
        exameEventProducer.sendExameSolicitado(saved);
        return saved;
    }

    public Exame updateStatus(Long id, String status) {
        Exame e = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exame não encontrado"));
        e.setStatus(ExameStatus.valueOf(status));
        return repository.save(e);
    }

    public Exame registrarResultado(Long id, String resultado, String tecnicoNome) {
        Exame e = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exame não encontrado"));
        e.setResultado(resultado);
        e.setTecnicoNome(tecnicoNome);
        e.setStatus(ExameStatus.CONCLUIDO);
        e.setDataResultado(LocalDateTime.now());
        return repository.save(e);
    }
}
