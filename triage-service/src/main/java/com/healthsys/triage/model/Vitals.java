package com.healthsys.triage.model;

import jakarta.persistence.Embeddable;
import lombok.Data;

@Data
@Embeddable
public class Vitals {
    private Double  temp;
    private Integer heartRate;
    private Integer saturation;
    private String  pressure;           // "120/80" — valor composto, mantém String
    private Integer respiratoryRate;
    private Double  glucose;
    private Integer painScale;
    private String  consciousnessLevel; // texto livre (Alerta, Voz, Dor, Irresponsivo)
    private Double  weight;
    private Double  height;
}
