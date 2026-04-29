package com.healthsys.bed.config;

import com.healthsys.bed.model.Bed;
import com.healthsys.bed.model.BedStatus;
import com.healthsys.bed.repository.BedRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder {

    @Autowired
    private BedRepository bedRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void seedBeds() {
        if (bedRepository.count() > 0) return;

        bedRepository.saveAll(List.of(
            bed("A01", "UTI Adulto",     BedStatus.DISPONIVEL,  null),
            bed("A02", "UTI Adulto",     BedStatus.OCUPADO,     "João Souza"),
            bed("A03", "UTI Adulto",     BedStatus.OCUPADO,     "Ana Lima"),
            bed("A04", "UTI Adulto",     BedStatus.MANUTENCAO,  null),
            bed("A05", "UTI Adulto",     BedStatus.DISPONIVEL,  null),
            bed("B01", "UTI Neonatal",   BedStatus.DISPONIVEL,  null),
            bed("B02", "UTI Neonatal",   BedStatus.OCUPADO,     "Recém-nascido Silva"),
            bed("B03", "UTI Neonatal",   BedStatus.DISPONIVEL,  null),
            bed("C01", "Clínica Médica", BedStatus.DISPONIVEL,  null),
            bed("C02", "Clínica Médica", BedStatus.OCUPADO,     "Maria Costa"),
            bed("C03", "Clínica Médica", BedStatus.OCUPADO,     "Carlos Mendes"),
            bed("C04", "Clínica Médica", BedStatus.DISPONIVEL,  null),
            bed("C05", "Clínica Médica", BedStatus.MANUTENCAO,  null),
            bed("C06", "Clínica Médica", BedStatus.DISPONIVEL,  null),
            bed("E01", "Emergência",     BedStatus.OCUPADO,     "Pedro Alves"),
            bed("E02", "Emergência",     BedStatus.DISPONIVEL,  null),
            bed("E03", "Emergência",     BedStatus.OCUPADO,     "Lucia Ferreira"),
            bed("E04", "Emergência",     BedStatus.DISPONIVEL,  null)
        ));
    }

    private Bed bed(String id, String setor, BedStatus status, String pacienteId) {
        Bed b = new Bed();
        b.setId(id);
        b.setSetor(setor);
        b.setStatus(status);
        b.setPacienteId(pacienteId);
        return b;
    }
}
