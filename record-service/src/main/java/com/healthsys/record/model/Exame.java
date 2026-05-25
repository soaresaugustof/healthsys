package com.healthsys.record.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "exames")
public class Exame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientId;
    private String patientName;
    private String medicoNome;
    private String tipoExame;
    private String urgencia;

    @Column(columnDefinition = "TEXT")
    private String justificativa;

    @Enumerated(EnumType.STRING)
    private ExameStatus status;

    @Column(columnDefinition = "TEXT")
    private String resultado;

    private String tecnicoNome;
    private LocalDateTime dataSolicitacao;
    private LocalDateTime dataResultado;
}
