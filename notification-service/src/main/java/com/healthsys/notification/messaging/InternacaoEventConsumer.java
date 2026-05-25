package com.healthsys.notification.messaging;

import com.healthsys.notification.service.NotificationService;
import tools.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class InternacaoEventConsumer {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ObjectMapper objectMapper;

    @KafkaListener(topics = "internacao-events", groupId = "notification-service")
    public void consume(ConsumerRecord<String, String> record) {
        String key = record.key();
        if (key == null) return;

        try {
            InternacaoPayload payload = objectMapper.readValue(record.value(), InternacaoPayload.class);

            if (key.startsWith("internacao.created")) {
                notificationService.createForInternacao(
                        payload.getId(),
                        payload.getPatientName(),
                        payload.getMedicoResponsavel()
                );
            } else if (key.startsWith("leito.alocado")) {
                notificationService.createForLeitoAlocado(
                        payload.getId(),
                        payload.getPatientName(),
                        payload.getMedicoResponsavel()
                );
            }
        } catch (Exception e) {
            System.err.println("[notification-service] Erro ao processar internacao event: " + e.getMessage());
        }
    }
}
