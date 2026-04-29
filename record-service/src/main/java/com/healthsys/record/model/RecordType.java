package com.healthsys.record.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RecordType {
    CONSULTA("Consulta"),
    EXAME("Exame"),
    INTERNACAO("Internação"),
    ALTA("Alta"),
    PRESCRICAO("Prescrição"),
    CIRURGIA("Cirurgia");

    private final String label;

    RecordType(String label) { this.label = label; }

    @JsonValue
    public String getLabel() { return label; }

    @JsonCreator
    public static RecordType fromValue(String value) {
        for (RecordType r : values()) {
            if (r.label.equalsIgnoreCase(value) || r.name().equalsIgnoreCase(value)) return r;
        }
        throw new IllegalArgumentException("Tipo de prontuário inválido: " + value);
    }

    @Override
    public String toString() { return label; }
}
