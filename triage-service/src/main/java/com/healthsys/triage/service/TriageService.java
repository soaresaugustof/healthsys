package com.healthsys.triage.service;

import com.healthsys.triage.messaging.TriageEventProducer;
import com.healthsys.triage.model.Triage;
import com.healthsys.triage.model.TriageStatus;
import com.healthsys.triage.repository.TriageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TriageService {

    @Autowired
    private TriageRepository triageRepository;

    @Autowired
    private TriageEventProducer eventProducer;

    public List<Triage> findAll() {
        return triageRepository.findAll();
    }

    public Triage create(Triage triage) {
        triage.setStatus(TriageStatus.PENDENTE);
        Triage saved = triageRepository.save(triage);
        eventProducer.sendTriageCreated(saved);
        return saved;
    }

    public Triage finalizeTriage(Long id) {
        Triage triage = triageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Triagem não encontrada"));
        triage.setStatus(TriageStatus.FINALIZADO);
        Triage saved = triageRepository.save(triage);
        eventProducer.sendTriageFinalized(saved);
        return saved;
    }

    public Triage callPatient(Long id) {
        Triage triage = triageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Triagem não encontrada"));
        triage.setStatus(TriageStatus.EM_ATENDIMENTO);
        triage.setChamadoEm(LocalDateTime.now());
        Triage saved = triageRepository.save(triage);
        eventProducer.sendPatientCalled(saved);
        return saved;
    }
}
