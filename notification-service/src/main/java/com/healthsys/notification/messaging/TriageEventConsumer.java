package com.healthsys.notification.messaging;

import com.healthsys.notification.service.NotificationService;
import tools.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class TriageEventConsumer {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ObjectMapper objectMapper;

    @KafkaListener(topics = "triage-events", groupId = "notification-service")
    public void consume(ConsumerRecord<String, String> record) {
        String key = record.key();
        if (key == null || !key.startsWith("triage.created")) return;

        try {
            TriagePayload triage = objectMapper.readValue(record.value(), TriagePayload.class);
            notificationService.create("TRIAGE_CREATED", triage.getId(),
                    triage.getPatientName(), triage.getNivelRisco());
        } catch (Exception e) {
            System.err.println("[notification-service] Erro ao processar evento: " + e.getMessage());
        }
    }
}
