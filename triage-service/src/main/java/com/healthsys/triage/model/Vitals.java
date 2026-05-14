package com.healthsys.triage.model;

import jakarta.persistence.Embeddable;
import lombok.Data;

@Data
@Embeddable
public class Vitals {
    private String temp;
    private String heartRate;
    private String saturation;
    private String pressure;
    private String respiratoryRate;
    private String glucose;
    private String painScale;
    private String consciousnessLevel;
    private String weight;
    private String height;
}
