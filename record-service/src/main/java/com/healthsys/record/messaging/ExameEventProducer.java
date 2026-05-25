package com.healthsys.record.messaging;

import com.healthsys.record.model.Exame;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class ExameEventProducer {

    private static final String TOPIC = "exame-events";

    private final KafkaTemplate<Object, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public ExameEventProducer(KafkaTemplate<Object, Object> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void sendExameSolicitado(Exame exame) {
        try {
            String payload = objectMapper.writeValueAsString(exame);
            kafkaTemplate.send(TOPIC, "exame.criado:" + exame.getId(), payload)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            System.err.println("[record-service] Kafka exame send failed: " + ex.getMessage());
                        }
                    });
        } catch (Exception e) {
            System.err.println("[record-service] Kafka exame serialization failed: " + e.getMessage());
        }
    }
}
