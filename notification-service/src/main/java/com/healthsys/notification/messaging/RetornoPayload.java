package com.healthsys.notification.messaging;

import lombok.Data;

@Data
public class RetornoPayload {
    private Long id;
    private String patientName;
    private String especialidade;
    private String prazo;
}
