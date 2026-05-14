package com.healthsys.user.repository;

import com.healthsys.user.model.Perfil;
import com.healthsys.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByPerfil(Perfil perfil);
    List<User> findByPerfilIn(List<Perfil> perfis);
}
