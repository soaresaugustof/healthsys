package com.healthsys.notification.messaging;

import com.healthsys.notification.service.NotificationService;
import tools.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class RetornoEventConsumer {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ObjectMapper objectMapper;

    @KafkaListener(topics = "retorno-events", groupId = "notification-service")
    public void consume(ConsumerRecord<String, String> record) {
        String key = record.key();
        if (key == null || !key.startsWith("retorno.created")) return;

        try {
            RetornoPayload retorno = objectMapper.readValue(record.value(), RetornoPayload.class);
            notificationService.createForRetorno(
                    retorno.getId(),
                    retorno.getPatientName(),
                    retorno.getEspecialidade(),
                    retorno.getPrazo()
            );
        } catch (Exception e) {
            System.err.println("[notification-service] Erro ao processar retorno event: " + e.getMessage());
        }
    }
}
