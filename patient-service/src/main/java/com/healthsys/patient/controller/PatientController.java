package com.healthsys.patient.controller;

import com.healthsys.patient.model.Patient;
import com.healthsys.patient.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    @Autowired
    private PatientRepository patientRepository;

    @GetMapping
    public List<Patient> getAll() {
        return patientRepository.findAll();
    }

    @PostMapping
    public Patient create(@RequestBody Patient patient) {
        return patientRepository.save(patient);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patient> update(@PathVariable Long id, @RequestBody Patient body) {
        return patientRepository.findById(id).map(p -> {
            p.setNome(body.getNome());
            p.setDataNascimento(body.getDataNascimento());
            p.setSexo(body.getSexo());
            p.setTelefone(body.getTelefone());
            p.setEmail(body.getEmail());
            p.setCep(body.getCep());
            p.setLogradouro(body.getLogradouro());
            p.setNumero(body.getNumero());
            p.setComplemento(body.getComplemento());
            p.setBairro(body.getBairro());
            p.setCidade(body.getCidade());
            p.setEstado(body.getEstado());
            return ResponseEntity.ok(patientRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }
}
