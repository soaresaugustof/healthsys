package com.healthsys.record.messaging;

import com.healthsys.record.model.Retorno;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.util.concurrent.CompletableFuture;

@Component
public class RetornoEventProducer {

    private static final String TOPIC = "retorno-events";

    private final KafkaTemplate<Object, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public RetornoEventProducer(KafkaTemplate<Object, Object> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void sendRetornoCreated(Retorno retorno) {
        CompletableFuture.runAsync(() -> {
            try {
                String payload = objectMapper.writeValueAsString(retorno);
                kafkaTemplate.send(TOPIC, "retorno.created:" + retorno.getId(), payload);
            } catch (Exception e) {
                System.err.println("[record-service] Kafka event send failed: " + e.getMessage());
            }
        });
    }
}
