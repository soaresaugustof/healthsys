package com.healthsys.user.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Perfil {
    ADMIN("Admin"),
    MEDICO("Médico"),
    ENFERMEIRO("Enfermeiro");

    private final String label;

    Perfil(String label) { this.label = label; }

    @JsonValue
    public String getLabel() { return label; }

    @JsonCreator
    public static Perfil fromValue(String value) {
        for (Perfil p : values()) {
            if (p.label.equalsIgnoreCase(value) || p.name().equalsIgnoreCase(value)) return p;
        }
        throw new IllegalArgumentException("Perfil inválido: " + value);
    }

    @Override
    public String toString() { return label; }
}
