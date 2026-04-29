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
}
