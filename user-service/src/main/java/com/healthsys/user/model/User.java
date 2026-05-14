package com.healthsys.user.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "usuarios")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(name = "perfil", columnDefinition = "varchar(50)")
    private Perfil perfil;

    private String email;
    private String senha;
}
