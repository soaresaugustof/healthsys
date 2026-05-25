package com.healthsys.notification.service;

import com.healthsys.notification.model.Notification;
import com.healthsys.notification.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository repository;

    @Autowired
    private SseEmitterService sseEmitterService;

    public List<Notification> findAll() {
        return repository.findAllByOrderByCriadaEmDesc();
    }

    public long countUnread() {
        return repository.countByLidaFalse();
    }

    public Notification create(String tipo, Long refId, String patientName, String nivelRisco) {
        Notification n = new Notification();
        n.setTipo(tipo);
        n.setRefId(refId);
        n.setPatientName(patientName != null ? patientName : "Paciente #" + refId);
        n.setNivelRisco(nivelRisco);
        n.setLida(false);
        n.setCriadaEm(LocalDateTime.now());
        n.setDestinatarioPerfil("Médico");
        Notification saved = repository.save(n);
        sseEmitterService.broadcast(saved);
        return saved;
    }

    public Notification createForRetorno(Long retornoId, String patientName, String especialidade, String prazo) {
        Notification n = new Notification();
        n.setTipo("RETORNO_AGENDADO");
        n.setRefId(retornoId);
        n.setPatientName(patientName != null ? patientName : "Paciente");
        n.setMensagem("Retorno: " + especialidade + " em " + prazo);
        n.setLida(false);
        n.setCriadaEm(LocalDateTime.now());
        n.setDestinatarioPerfil("Médico");
        Notification saved = repository.save(n);
        sseEmitterService.broadcast(saved);
        return saved;
    }

    public Notification createForInternacao(Long prontuarioId, String patientName, String medicoResponsavel) {
        Notification n = new Notification();
        n.setTipo("INTERNACAO_SOLICITADA");
        n.setRefId(prontuarioId);
        n.setPatientName(patientName != null ? patientName : "Paciente");
        n.setMensagem("Internação solicitada por Dr(a). " + medicoResponsavel + " — aguardando leito");
        n.setLida(false);
        n.setCriadaEm(LocalDateTime.now());
        n.setDestinatarioPerfil("Enfermeiro");
        Notification saved = repository.save(n);
        sseEmitterService.broadcast(saved);
        return saved;
    }

    public Notification createForLeitoAlocado(Long prontuarioId, String patientName, String medicoResponsavel) {
        Notification n = new Notification();
        n.setTipo("LEITO_ALOCADO");
        n.setRefId(prontuarioId);
        n.setPatientName(patientName != null ? patientName : "Paciente");
        n.setMensagem("Leito alocado — paciente internado com sucesso");
        n.setLida(false);
        n.setCriadaEm(LocalDateTime.now());
        n.setDestinatarioPerfil("Médico");
        n.setDestinatarioNome(medicoResponsavel);
        Notification saved = repository.save(n);
        sseEmitterService.broadcast(saved);
        return saved;
    }

    public Notification createForExame(Long exameId, String patientName, String tipoExame) {
        Notification n = new Notification();
        n.setTipo("EXAME_SOLICITADO");
        n.setRefId(exameId);
        n.setPatientName(patientName != null ? patientName : "Paciente");
        n.setMensagem("Exame solicitado: " + (tipoExame != null ? tipoExame : "—"));
        n.setLida(false);
        n.setCriadaEm(LocalDateTime.now());
        n.setDestinatarioPerfil("Laboratorista");
        Notification saved = repository.save(n);
        sseEmitterService.broadcast(saved);
        return saved;
    }

    public void markRead(Long id) {
        repository.findById(id).ifPresent(n -> {
            n.setLida(true);
            repository.save(n);
        });
    }

    public void markAllRead() {
        List<Notification> all = repository.findAllByOrderByCriadaEmDesc();
        all.forEach(n -> n.setLida(true));
        repository.saveAll(all);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
