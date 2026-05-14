package com.healthsys.triage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum NivelRisco {
    VERMELHO("Vermelho", "Imediato",   0),
    LARANJA ("Laranja",  "10 minutos", 10),
    AMARELO ("Amarelo",  "60 minutos", 60),
    VERDE   ("Verde",    "2 horas",    120),
    AZUL    ("Azul",     "4 horas",    240);

    private final String label;
    private final String tempoAlvo;
    private final int    tempoAlvoMinutos;

    NivelRisco(String label, String tempoAlvo, int tempoAlvoMinutos) {
        this.label            = label;
        this.tempoAlvo        = tempoAlvo;
        this.tempoAlvoMinutos = tempoAlvoMinutos;
    }

    @JsonValue
    public String getLabel() { return label; }

    public String getTempoAlvo()       { return tempoAlvo; }
    public int    getTempoAlvoMinutos(){ return tempoAlvoMinutos; }

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
