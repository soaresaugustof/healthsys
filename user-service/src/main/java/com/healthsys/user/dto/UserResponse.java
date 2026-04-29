package com.healthsys.user.dto;

import com.healthsys.user.model.Perfil;
import com.healthsys.user.model.User;

public record UserResponse(Long id, String nome, String email, Perfil perfil) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getNome(), user.getEmail(), user.getPerfil());
    }
}
