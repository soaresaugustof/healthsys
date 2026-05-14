package com.healthsys.triage.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "triagens")
public class Triage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientId;
    private String patientName;
    private String queixaPrincipal;

    private String medicoId;
    private String medicoNome;

    @Enumerated(EnumType.STRING)
    private NivelRisco nivelRisco;

    @Enumerated(EnumType.STRING)
    private TriageStatus status;

    private LocalDateTime data;
    private LocalDateTime chamadoEm;

    @Embedded
    private Vitals vitals;
}
