package com.healthsys.record.service;

import com.healthsys.record.messaging.RetornoEventProducer;
import com.healthsys.record.model.Retorno;
import com.healthsys.record.model.RetornoStatus;
import com.healthsys.record.repository.RetornoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RetornoService {

    @Autowired
    private RetornoRepository repository;

    @Autowired
    private RetornoEventProducer eventProducer;

    public List<Retorno> findAll() {
        return repository.findAllByOrderByDataCriacaoDesc();
    }

    public List<Retorno> findPendentes() {
        return repository.findByStatusOrderByDataCriacaoDesc(RetornoStatus.PENDENTE);
    }

    public Retorno create(Retorno retorno) {
        retorno.setStatus(RetornoStatus.PENDENTE);
        retorno.setDataCriacao(LocalDateTime.now());
        Retorno saved = repository.save(retorno);
        eventProducer.sendRetornoCreated(saved);
        return saved;
    }

    public Retorno realizar(Long id) {
        Retorno r = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Retorno não encontrado"));
        r.setStatus(RetornoStatus.REALIZADO);
        return repository.save(r);
    }

    public Retorno cancelar(Long id) {
        Retorno r = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Retorno não encontrado"));
        r.setStatus(RetornoStatus.CANCELADO);
        return repository.save(r);
    }
}
