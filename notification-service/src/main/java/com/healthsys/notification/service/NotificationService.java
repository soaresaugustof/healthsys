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

    public List<Notification> findAll() {
        return repository.findAllByOrderByCriadaEmDesc();
    }

    public long countUnread() {
        return repository.countByLidaFalse();
    }

    public Notification create(String tipo, Long triageId, String patientName, String nivelRisco) {
        Notification n = new Notification();
        n.setTipo(tipo);
        n.setTriageId(triageId);
        n.setPatientName(patientName != null ? patientName : "Paciente #" + triageId);
        n.setNivelRisco(nivelRisco);
        n.setLida(false);
        n.setCriadaEm(LocalDateTime.now());
        return repository.save(n);
    }

    public Notification createForRetorno(Long retornoId, String patientName, String especialidade, String prazo) {
        Notification n = new Notification();
        n.setTipo("RETORNO_AGENDADO");
        n.setTriageId(retornoId);
        n.setPatientName(patientName != null ? patientName : "Paciente");
        n.setMensagem("Retorno: " + especialidade + " em " + prazo);
        n.setLida(false);
        n.setCriadaEm(LocalDateTime.now());
        return repository.save(n);
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
