package com.healthsys.triage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum NivelRisco {
    VERMELHO("Vermelho"),
    LARANJA("Laranja"),
    AMARELO("Amarelo"),
    VERDE("Verde"),
    AZUL("Azul");

    private final String label;

    NivelRisco(String label) { this.label = label; }

    @JsonValue
    public String getLabel() { return label; }

    @JsonCreator
    public static NivelRisco fromValue(String value) {
        for (NivelRisco n : values()) {
            if (n.label.equalsIgnoreCase(value) || n.name().equalsIgnoreCase(value)) return n;
        }
        throw new IllegalArgumentException("Nível de risco inválido: " + value);
    }

    @Override
    public String toString() { return label; }
}
