package com.healthsys.record.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "retornos")
public class Retorno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientId;
    private String patientName;
    private String medicoNome;
    private String prazo;
    private String especialidade;

    @Column(columnDefinition = "TEXT")
    private String orientacoes;

    @Enumerated(EnumType.STRING)
    private RetornoStatus status;

    private LocalDateTime dataCriacao;
}
