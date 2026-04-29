package com.healthsys.patient.controller;

import com.healthsys.patient.model.Patient;
import com.healthsys.patient.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
}
