package com.healthsys.triage.controller;

import com.healthsys.triage.dto.AssignDoctorRequest;
import com.healthsys.triage.model.NivelRisco;
import com.healthsys.triage.model.Triage;
import com.healthsys.triage.model.Vitals;
import com.healthsys.triage.service.RiskSuggestionService;
import com.healthsys.triage.service.TriageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/triage")
public class TriageController {

    @Autowired
    private TriageService triageService;

    @Autowired
    private RiskSuggestionService riskSuggestionService;

    @GetMapping
    public List<Triage> getAll() {
        return triageService.findAll();
    }

    @PostMapping
    public Triage create(@RequestBody Triage triage) {
        return triageService.create(triage);
    }

    @PatchMapping("/{id}/assign")
    public Triage assignDoctor(@PathVariable Long id, @RequestBody AssignDoctorRequest request) {
        return triageService.assignDoctor(id, request.medicoId(), request.medicoNome());
    }

    @PatchMapping("/{id}/finish")
    public Triage finalizeTriage(@PathVariable Long id) {
        return triageService.finalizeTriage(id);
    }

    @PostMapping("/suggest-risk")
    public NivelRisco suggestRisk(@RequestBody Vitals vitals) {
        return riskSuggestionService.suggest(vitals);
    }
}
