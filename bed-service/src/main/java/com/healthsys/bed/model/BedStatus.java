package com.healthsys.bed.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum BedStatus {
    DISPONIVEL("Disponível"),
    OCUPADO("Ocupado"),
    MANUTENCAO("Manutenção");

    private final String label;

    BedStatus(String label) { this.label = label; }

    @JsonValue
    public String getLabel() { return label; }

    @JsonCreator
    public static BedStatus fromValue(String value) {
        for (BedStatus s : values()) {
            if (s.label.equalsIgnoreCase(value) || s.name().equalsIgnoreCase(value)) return s;
        }
        throw new IllegalArgumentException("Status de leito inválido: " + value);
    }

    @Override
    public String toString() { return label; }
}
