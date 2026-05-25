package com.healthsys.record.messaging;

import com.healthsys.record.model.Prontuario;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class InternacaoEventProducer {

    private static final String TOPIC = "internacao-events";

    private final KafkaTemplate<Object, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public InternacaoEventProducer(KafkaTemplate<Object, Object> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void sendLeitoAlocado(Prontuario prontuario) {
        try {
            String payload = objectMapper.writeValueAsString(prontuario);
            kafkaTemplate.send(TOPIC, "leito.alocado:" + prontuario.getId(), payload)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            System.err.println("[record-service] Kafka leito.alocado send failed: " + ex.getMessage());
                        }
                    });
        } catch (Exception e) {
            System.err.println("[record-service] Kafka leito.alocado serialization failed: " + e.getMessage());
        }
    }

    public void sendInternacaoCreated(Prontuario prontuario) {
        try {
            String payload = objectMapper.writeValueAsString(prontuario);
            kafkaTemplate.send(TOPIC, "internacao.created:" + prontuario.getId(), payload)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            System.err.println("[record-service] Kafka internacao send failed: " + ex.getMessage());
                        }
                    });
        } catch (Exception e) {
            System.err.println("[record-service] Kafka internacao serialization failed: " + e.getMessage());
        }
    }
}
