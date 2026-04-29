package com.healthsys.bed.controller;

import com.healthsys.bed.model.Bed;
import com.healthsys.bed.repository.BedRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/beds")
public class BedController {

    @Autowired
    private BedRepository bedRepository;

    @GetMapping
    public List<Bed> getAll() {
        return bedRepository.findAll();
    }

    @PutMapping("/{id}")
    public Bed update(@PathVariable String id, @RequestBody Bed body) {
        Bed bed = bedRepository.findById(id).orElseThrow();
        bed.setStatus(body.getStatus());
        bed.setPacienteId(body.getPacienteId());
        return bedRepository.save(bed);
    }
}
