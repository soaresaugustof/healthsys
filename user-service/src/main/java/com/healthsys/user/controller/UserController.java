package com.healthsys.user.controller;

import com.healthsys.user.dto.UserResponse;
import com.healthsys.user.model.User;
import com.healthsys.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public List<UserResponse> getAll() {
        return userService.findAll().stream().map(UserResponse::from).toList();
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

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { userService.deleteById(id); }
}
