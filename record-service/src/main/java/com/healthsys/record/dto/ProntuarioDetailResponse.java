package com.healthsys.record.dto;

import com.healthsys.record.model.Consulta;
import com.healthsys.record.model.Prontuario;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class ProntuarioDetailResponse {
    private Prontuario prontuario;
    private List<Consulta> consultas;
}
