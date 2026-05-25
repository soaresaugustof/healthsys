package com.healthsys.notification.messaging;

import lombok.Data;

@Data
public class ExamePayload {
    private Long id;
    private String patientName;
    private String tipoExame;
}
