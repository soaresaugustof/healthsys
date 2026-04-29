package com.healthsys.triage.controller;

import com.healthsys.triage.model.Triage;
import com.healthsys.triage.service.TriageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/triage")
public class TriageController {

    @Autowired
    private TriageService triageService;

    @GetMapping
    public List<Triage> getAll() {
        return triageService.findAll();
    }

    @PostMapping
    public Triage create(@RequestBody Triage triage) {
        return triageService.create(triage);
    }

    @PatchMapping("/{id}/call")
    public Triage callPatient(@PathVariable Long id) {
        return triageService.callPatient(id);
    }

    @PatchMapping("/{id}/finish")
    public Triage finalizeTriage(@PathVariable Long id) {
        return triageService.finalizeTriage(id);
    }
}
