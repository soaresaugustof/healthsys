package com.healthsys.record.service;

import com.healthsys.record.dto.ProntuarioDetailResponse;
import com.healthsys.record.model.Prontuario;
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

    public List<Prontuario> findAll() {
        return prontuarioRepository.findAllByOrderByDataInternacaoDesc();
    }

    public ProntuarioDetailResponse findById(Long id) {
        Prontuario p = prontuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));
        return new ProntuarioDetailResponse(p, consultaRepository.findByPatientIdOrderByDataDesc(p.getPatientId()));
    }

    public List<Prontuario> findByStatus(String status) {
        return prontuarioRepository.findByStatusOrderByDataInternacaoDesc(status);
    }

    public Prontuario create(Prontuario prontuario) {
        prontuario.setDataInternacao(LocalDateTime.now());
        prontuario.setStatus("AGUARDANDO_LEITO");
        return prontuarioRepository.save(prontuario);
    }

    public Prontuario internar(Long id, String leitoId) {
        Prontuario p = prontuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));
        p.setStatus("ATIVO");
        p.setLeitoId(leitoId);
        return prontuarioRepository.save(p);
    }

    public Prontuario darAlta(Long id) {
        Prontuario p = prontuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prontuário não encontrado"));
        p.setStatus("ALTA");
        p.setDataAlta(LocalDateTime.now());
        return prontuarioRepository.save(p);
    }
}
