package com.healthsys.notification.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "notificacoes")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tipo;

    @Column(name = "triage_id")
    private Long refId;

    private String patientName;
    private String nivelRisco;

    @Column(columnDefinition = "TEXT")
    private String mensagem;

    private boolean lida;
    private LocalDateTime criadaEm;

    private String destinatarioPerfil;
    private String destinatarioNome;
}
