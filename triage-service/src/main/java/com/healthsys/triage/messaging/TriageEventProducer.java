package com.healthsys.triage.messaging;

import com.healthsys.triage.model.Triage;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.util.concurrent.CompletableFuture;

@Component
public class TriageEventProducer {

    private static final String TOPIC = "triage-events";

    private final KafkaTemplate<Object, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public TriageEventProducer(KafkaTemplate<Object, Object> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void sendTriageCreated(Triage triage) {
        sendEvent("triage.created", triage);
    }

    public void sendPatientCalled(Triage triage) {
        sendEvent("patient.called", triage);
    }

    public void sendTriageFinalized(Triage triage) {
        sendEvent("triage.finalized", triage);
    }

    private void sendEvent(String eventType, Triage triage) {
        CompletableFuture.runAsync(() -> {
            try {
                String payload = objectMapper.writeValueAsString(triage);
                kafkaTemplate.send(TOPIC, eventType + ":" + triage.getId(), payload);
            } catch (Exception e) {
                System.err.println("[triage-service] Kafka event send failed: " + e.getMessage());
            }
        });
    }
}
