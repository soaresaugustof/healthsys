package com.healthsys.user.controller;

import com.healthsys.user.dto.UserResponse;
import com.healthsys.user.model.Perfil;
import com.healthsys.user.model.User;
import com.healthsys.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/staff")
    public List<UserResponse> getStaff() {
        return userService.findStaff().stream().map(UserResponse::from).toList();
    }

    @GetMapping
    public List<UserResponse> getAll(@RequestParam(required = false) Perfil perfil) {
        List<User> users = perfil != null ? userService.findByPerfil(perfil) : userService.findAll();
        return users.stream().map(UserResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable Long id) {
        return userService.findById(id)
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public UserResponse create(@RequestBody User user) {
        return UserResponse.from(userService.save(user));
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return UserResponse.from(userService.update(id, body));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { userService.deleteById(id); }
}
