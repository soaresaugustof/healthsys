package com.healthsys.notification.messaging;

import lombok.Data;

@Data
public class InternacaoPayload {
    private Long id;
    private String patientName;
    private String medicoResponsavel;
    private String motivoInternacao;
}
