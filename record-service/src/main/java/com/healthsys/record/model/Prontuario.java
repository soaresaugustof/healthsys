package com.healthsys.record.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "internacoes")
public class Prontuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientId;
    private String patientName;
    private String medicoResponsavel;

    @Column(columnDefinition = "TEXT")
    private String motivoInternacao;

    private LocalDateTime dataInternacao;
    private LocalDateTime dataAlta;

    private String leitoId;

    @Enumerated(EnumType.STRING)
    private ProntuarioStatus status;
}
