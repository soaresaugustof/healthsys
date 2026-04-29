package com.healthsys.triage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TriageStatus {
    PENDENTE("Pendente"),
    EM_ATENDIMENTO("Em Atendimento"),
    FINALIZADO("Finalizado");

    private final String label;

    TriageStatus(String label) { this.label = label; }

    @JsonValue
    public String getLabel() { return label; }

    @JsonCreator
    public static TriageStatus fromValue(String value) {
        for (TriageStatus s : values()) {
            if (s.label.equalsIgnoreCase(value) || s.name().equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Status inválido: " + value);
    }

    @Override
    public String toString() { return label; }
}
