package com.healthsys.triage.messaging;

import com.healthsys.triage.model.Triage;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class TriageEventProducer {

    private static final String TOPIC = "triage-events";

    private final KafkaTemplate<Object, Object> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TriageEventProducer(KafkaTemplate<Object, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
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
        try {
            String payload = objectMapper.writeValueAsString(triage);
            kafkaTemplate.send(TOPIC, eventType + ":" + triage.getId(), payload);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize triage event", e);
        }
    }
}
