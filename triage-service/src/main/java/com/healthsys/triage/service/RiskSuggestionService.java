package com.healthsys.triage.service;

import com.healthsys.triage.model.NivelRisco;
import com.healthsys.triage.model.Vitals;
import org.springframework.stereotype.Service;

@Service
public class RiskSuggestionService {

    public NivelRisco suggest(Vitals vitals) {
        NivelRisco resultado = NivelRisco.AZUL;
        resultado = pior(resultado, avaliarTemperatura(vitals.getTemp()));
        resultado = pior(resultado, avaliarFreqCardiaca(vitals.getHeartRate()));
        resultado = pior(resultado, avaliarSaturacao(vitals.getSaturation()));
        resultado = pior(resultado, avaliarPressao(vitals.getPressure()));
        resultado = pior(resultado, avaliarFreqRespiratoria(vitals.getRespiratoryRate()));
        resultado = pior(resultado, avaliarGlicemia(vitals.getGlucose()));
        resultado = pior(resultado, avaliarDor(vitals.getPainScale()));
        resultado = pior(resultado, avaliarConsciencia(vitals.getConsciousnessLevel()));
        return resultado;
    }

    private NivelRisco avaliarTemperatura(Double valor) {
        if (valor == null) return NivelRisco.AZUL;
        if (valor > 41 || valor < 35) return NivelRisco.LARANJA;
        if (valor > 40 || valor < 36) return NivelRisco.AMARELO;
        if (valor >= 38)              return NivelRisco.VERDE;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarFreqCardiaca(Integer valor) {
        if (valor == null) return NivelRisco.AZUL;
        if (valor < 40 || valor > 150) return NivelRisco.VERMELHO;
        if (valor < 50 || valor > 130) return NivelRisco.LARANJA;
        if (valor < 60 || valor > 100) return NivelRisco.AMARELO;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarSaturacao(Integer valor) {
        if (valor == null) return NivelRisco.AZUL;
        if (valor < 90) return NivelRisco.VERMELHO;
        if (valor < 95) return NivelRisco.LARANJA;
        if (valor < 98) return NivelRisco.AMARELO;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarPressao(String valor) {
        if (valor == null || valor.isBlank()) return NivelRisco.AZUL;
        String[] partes = valor.split("[/x]");
        if (partes.length == 0) return NivelRisco.AZUL;
        int sistolica = Integer.parseInt(partes[0].trim());
        if (sistolica < 80 || sistolica > 200)  return NivelRisco.VERMELHO;
        if (sistolica < 90 || sistolica > 180)  return NivelRisco.LARANJA;
        if (sistolica < 100 || sistolica > 140) return NivelRisco.AMARELO;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarFreqRespiratoria(Integer valor) {
        if (valor == null) return NivelRisco.AZUL;
        if (valor < 8 || valor > 30)  return NivelRisco.VERMELHO;
        if (valor < 12 || valor > 25) return NivelRisco.LARANJA;
        if (valor > 20)               return NivelRisco.AMARELO;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarGlicemia(Double valor) {
        if (valor == null) return NivelRisco.AZUL;
        if (valor < 50 || valor > 400) return NivelRisco.VERMELHO;
        if (valor < 70 || valor > 250) return NivelRisco.LARANJA;
        if (valor > 180)               return NivelRisco.AMARELO;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarDor(Integer valor) {
        if (valor == null) return NivelRisco.AZUL;
        if (valor >= 9) return NivelRisco.LARANJA;
        if (valor >= 7) return NivelRisco.AMARELO;
        if (valor >= 4) return NivelRisco.VERDE;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarConsciencia(String valor) {
        if (valor == null || valor.isBlank()) return NivelRisco.AZUL;
        return switch (valor) {
            case "Irresponsivo" -> NivelRisco.VERMELHO;
            case "Dor"          -> NivelRisco.LARANJA;
            case "Voz"          -> NivelRisco.AMARELO;
            default             -> NivelRisco.AZUL;
        };
    }

    private NivelRisco pior(NivelRisco atual, NivelRisco candidato) {
        return candidato.ordinal() < atual.ordinal() ? candidato : atual;
    }
}
