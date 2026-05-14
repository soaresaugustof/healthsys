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

    private NivelRisco avaliarTemperatura(String valor) {
        if (valor == null || valor.isBlank()) return NivelRisco.AZUL;
        double temp = Double.parseDouble(valor);
        if (temp > 41 || temp < 35)        return NivelRisco.LARANJA;
        if (temp > 40 || temp < 36)        return NivelRisco.AMARELO;
        if (temp >= 38)                    return NivelRisco.VERDE;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarFreqCardiaca(String valor) {
        if (valor == null || valor.isBlank()) return NivelRisco.AZUL;
        int fc = Integer.parseInt(valor);
        if (fc < 40 || fc > 150)           return NivelRisco.VERMELHO;
        if (fc < 50 || fc > 130)           return NivelRisco.LARANJA;
        if (fc < 60 || fc > 100)           return NivelRisco.AMARELO;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarSaturacao(String valor) {
        if (valor == null || valor.isBlank()) return NivelRisco.AZUL;
        int sat = Integer.parseInt(valor);
        if (sat < 90)                      return NivelRisco.VERMELHO;
        if (sat < 95)                      return NivelRisco.LARANJA;
        if (sat < 98)                      return NivelRisco.AMARELO;
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

    private NivelRisco avaliarFreqRespiratoria(String valor) {
        if (valor == null || valor.isBlank()) return NivelRisco.AZUL;
        int fr = Integer.parseInt(valor);
        if (fr < 8 || fr > 30)   return NivelRisco.VERMELHO;
        if (fr < 12 || fr > 25)  return NivelRisco.LARANJA;
        if (fr > 20)             return NivelRisco.AMARELO;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarGlicemia(String valor) {
        if (valor == null || valor.isBlank()) return NivelRisco.AZUL;
        int glicemia = Integer.parseInt(valor);
        if (glicemia < 50 || glicemia > 400) return NivelRisco.VERMELHO;
        if (glicemia < 70 || glicemia > 250) return NivelRisco.LARANJA;
        if (glicemia > 180)                  return NivelRisco.AMARELO;
        return NivelRisco.AZUL;
    }

    private NivelRisco avaliarDor(String valor) {
        if (valor == null || valor.isBlank()) return NivelRisco.AZUL;
        int dor = Integer.parseInt(valor);
        if (dor >= 9) return NivelRisco.LARANJA;
        if (dor >= 7) return NivelRisco.AMARELO;
        if (dor >= 4) return NivelRisco.VERDE;
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

    // Retorna o nível mais grave entre dois
    private NivelRisco pior(NivelRisco atual, NivelRisco candidato) {
        return candidato.ordinal() < atual.ordinal() ? candidato : atual;
    }
}
