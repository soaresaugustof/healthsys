package com.healthsys.user.config;

import com.healthsys.user.model.Perfil;
import com.healthsys.user.model.User;
import com.healthsys.user.repository.UserRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        if (userRepository.count() > 0) return;

        userRepository.save(createUser("Administrador",  "admin@healthsys.com",       "admin123",       Perfil.ADMIN));
        userRepository.save(createUser("Dr. João Silva", "medico@healthsys.com",      "medico123",      Perfil.MEDICO));
        userRepository.save(createUser("Enf. Ana Costa", "enfermeiro@healthsys.com", "enfermeiro123",  Perfil.ENFERMEIRO));
    }

    private User createUser(String nome, String email, String senha, Perfil perfil) {
        User u = new User();
        u.setNome(nome);
        u.setEmail(email);
        u.setSenha(passwordEncoder.encode(senha));
        u.setPerfil(perfil);
        return u;
    }
}
