package com.healthsys.user.service;

import com.healthsys.user.model.Perfil;
import com.healthsys.user.model.User;
import com.healthsys.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> findAll() { return userRepository.findAll(); }

    public List<User> findByPerfil(Perfil perfil) { return userRepository.findByPerfil(perfil); }

    public List<User> findStaff() {
        return userRepository.findByPerfilIn(List.of(Perfil.MEDICO, Perfil.ENFERMEIRO));
    }

    public Optional<User> findById(Long id) { return userRepository.findById(id); }

    public Optional<User> findByEmail(String email) { return userRepository.findByEmail(email); }

    public User save(User user) {
        user.setSenha(passwordEncoder.encode(user.getSenha()));
        return userRepository.save(user);
    }

    public User update(Long id, Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
        if (body.containsKey("nome") && !body.get("nome").isBlank())
            user.setNome(body.get("nome"));
        if (body.containsKey("email") && !body.get("email").isBlank())
            user.setEmail(body.get("email"));
        if (body.containsKey("perfil") && !body.get("perfil").isBlank())
            user.setPerfil(Perfil.fromValue(body.get("perfil")));
        if (body.containsKey("senha") && !body.get("senha").isBlank())
            user.setSenha(passwordEncoder.encode(body.get("senha")));
        return userRepository.save(user);
    }

    public void deleteById(Long id) { userRepository.deleteById(id); }
}
