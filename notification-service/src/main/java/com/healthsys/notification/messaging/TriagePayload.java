package com.healthsys.notification.messaging;

import lombok.Data;

@Data
public class TriagePayload {
    private Long id;
    private String patientName;
    private String nivelRisco;
}
