package com.healthsys.notification.messaging;

import com.healthsys.notification.service.NotificationService;
import tools.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class ExameEventConsumer {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ObjectMapper objectMapper;

    @KafkaListener(topics = "exame-events", groupId = "notification-service")
    public void consume(ConsumerRecord<String, String> record) {
        String key = record.key();
        if (key == null || !key.startsWith("exame.criado")) return;

        try {
            ExamePayload exame = objectMapper.readValue(record.value(), ExamePayload.class);
            notificationService.createForExame(
                    exame.getId(),
                    exame.getPatientName(),
                    exame.getTipoExame()
            );
        } catch (Exception e) {
            System.err.println("[notification-service] Erro ao processar exame event: " + e.getMessage());
        }
    }
}
