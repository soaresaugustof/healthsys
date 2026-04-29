package com.healthsys.record.controller;

import com.healthsys.record.model.MedicalRecord;
import com.healthsys.record.repository.MedicalRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    @Autowired
    private MedicalRecordRepository medicalRecordRepository;

    @GetMapping
    public List<MedicalRecord> getAll() {
        return medicalRecordRepository.findAll();
    }

    @PostMapping
    public MedicalRecord create(@RequestBody MedicalRecord record) {
        return medicalRecordRepository.save(record);
    }
}
