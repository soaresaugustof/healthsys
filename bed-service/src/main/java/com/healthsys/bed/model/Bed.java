package com.healthsys.bed.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "leitos")
public class Bed {
    @Id
    private String id;

    private String setor;

    @Enumerated(EnumType.STRING)
    private BedStatus status;

    private String pacienteId;
    private String pacienteNome;
    private String medicoId;
    private String medicoNome;
    private String prontuarioId;
}
