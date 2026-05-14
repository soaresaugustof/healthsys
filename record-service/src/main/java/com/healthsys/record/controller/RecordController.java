package com.healthsys.record.controller;

import com.healthsys.record.dto.ProntuarioDetailResponse;
import com.healthsys.record.model.Consulta;
import com.healthsys.record.model.Exame;
import com.healthsys.record.model.Prontuario;
import com.healthsys.record.model.Retorno;
import com.healthsys.record.service.ConsultaService;
import com.healthsys.record.service.ExameService;
import com.healthsys.record.service.ProntuarioService;
import com.healthsys.record.service.RetornoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    @Autowired
    private ConsultaService consultaService;

    @Autowired
    private ProntuarioService prontuarioService;

    @Autowired
    private RetornoService retornoService;

    @Autowired
    private ExameService exameService;

    // ── Consultas ────────────────────────────────────────────────

    @GetMapping
    public List<Consulta> getAllConsultas() {
        return consultaService.findAll();
    }

    @GetMapping("/patient/{patientId}")
    public List<Consulta> getConsultasByPatient(@PathVariable String patientId) {
        return consultaService.findByPatientId(patientId);
    }

    @PostMapping
    public Consulta createConsulta(@RequestBody Consulta consulta) {
        return consultaService.create(consulta);
    }

    // ── Prontuários (Internações) ─────────────────────────────────

    @GetMapping("/prontuarios")
    public List<Prontuario> getAllProntuarios() {
        return prontuarioService.findAll();
    }

    @GetMapping("/prontuarios/{id}")
    public ProntuarioDetailResponse getProntuario(@PathVariable Long id) {
        return prontuarioService.findById(id);
    }

    @PostMapping("/internacao")
    public Prontuario createInternacao(@RequestBody Prontuario prontuario) {
        return prontuarioService.create(prontuario);
    }

    @PatchMapping("/prontuarios/{id}/alta")
    public Prontuario darAlta(@PathVariable Long id) {
        return prontuarioService.darAlta(id);
    }

    @GetMapping("/internacoes/aguardando")
    public List<Prontuario> getPendingInternacoes() {
        return prontuarioService.findByStatus("AGUARDANDO_LEITO");
    }

    @PatchMapping("/internacoes/{id}/internar")
    public Prontuario internar(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return prontuarioService.internar(id, body.get("leitoId"));
    }

    // ── Retornos ──────────────────────────────────────────────────

    @GetMapping("/retornos")
    public List<Retorno> getAllRetornos() {
        return retornoService.findAll();
    }

    @GetMapping("/retornos/pendentes")
    public List<Retorno> getPendentes() {
        return retornoService.findPendentes();
    }

    @PostMapping("/retornos")
    public Retorno createRetorno(@RequestBody Retorno retorno) {
        return retornoService.create(retorno);
    }

    @PatchMapping("/retornos/{id}/realizar")
    public Retorno realizar(@PathVariable Long id) {
        return retornoService.realizar(id);
    }

    @PatchMapping("/retornos/{id}/cancelar")
    public Retorno cancelar(@PathVariable Long id) {
        return retornoService.cancelar(id);
    }

    // ── Exames ───────────────────────────────────────────────────

    @GetMapping("/exames")
    public List<Exame> getAllExames() {
        return exameService.findAll();
    }

    @GetMapping("/exames/patient/{patientId}")
    public List<Exame> getExamesByPatient(@PathVariable String patientId) {
        return exameService.findByPatientId(patientId);
    }

    @PostMapping("/exames")
    public Exame createExame(@RequestBody Exame exame) {
        return exameService.create(exame);
    }

    @PatchMapping("/exames/{id}/status")
    public Exame updateExameStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return exameService.updateStatus(id, body.get("status"));
    }

    @PatchMapping("/exames/{id}/resultado")
    public Exame registrarResultado(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return exameService.registrarResultado(id, body.get("resultado"), body.get("tecnicoNome"));
    }
}
