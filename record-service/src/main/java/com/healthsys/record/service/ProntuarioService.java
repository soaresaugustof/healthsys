package com.healthsys.record.service;

import com.healthsys.record.dto.ProntuarioDetailResponse;
import com.healthsys.record.messaging.InternacaoEventProducer;
import com.healthsys.record.model.Prontuario;
import com.healthsys.record.model.ProntuarioStatus;
import com.healthsys.record.repository.ConsultaRepository;
import com.healthsys.record.repository.ProntuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProntuarioService {

    @Autowired
    private ProntuarioRepository prontuarioRepository;

    @Autowired
    private ConsultaRepository consultaRepository;

    @Autowired
    private InternacaoEventProducer internacaoEventProducer;

    public List<Prontuario> findAll() {
        return prontuarioRepository.findAllByOrderByDataInternacaoDesc();
    }

    public ProntuarioDetailResponse findById(Long id) {
        Prontuario p = prontuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));
        return new ProntuarioDetailResponse(p, consultaRepository.findByPatientIdOrderByDataDesc(p.getPatientId()));
    }

    public List<Prontuario> findByStatus(ProntuarioStatus status) {
        return prontuarioRepository.findByStatusOrderByDataInternacaoDesc(status);
    }

    public Prontuario create(Prontuario prontuario) {
        prontuario.setDataInternacao(LocalDateTime.now());
        prontuario.setStatus(ProntuarioStatus.AGUARDANDO_LEITO);
        Prontuario saved = prontuarioRepository.save(prontuario);
        internacaoEventProducer.sendInternacaoCreated(saved);
        return saved;
    }

    public Prontuario internar(Long id, String leitoId) {
        Prontuario p = prontuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));
        p.setStatus(ProntuarioStatus.ATIVO);
        p.setLeitoId(leitoId);
        Prontuario saved = prontuarioRepository.save(p);
        internacaoEventProducer.sendLeitoAlocado(saved);
        return saved;
    }

    public Prontuario darAlta(Long id) {
        Prontuario p = prontuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));
        p.setStatus(ProntuarioStatus.ALTA);
        p.setDataAlta(LocalDateTime.now());
        return prontuarioRepository.save(p);
    }
}
