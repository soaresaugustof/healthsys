import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Printer, FileText, BedDouble, Pill, Thermometer, Heart, Wind, Activity, Droplets, Brain, Stethoscope, FlaskConical, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Select } from '@/components/ui/FormFields';
import { Triagem, StaffMember, Retorno, Consulta } from '@/types/hospital';
import { triageApi, recordsApi, retornosApi, examesApi } from '@/services/api';

type CidResult = { code: string; name: string };

type PrescricaoItem = {
  medicamento: string;
  concentracao: string;
  formaFarmaceutica: string;
  dose: string;
  frequencia: string;
  duracao: string;
  instrucoes: string;
};

const emptyItem = (): PrescricaoItem => ({
  medicamento: '', concentracao: '', formaFarmaceutica: 'Comprimido',
  dose: '', frequencia: '', duracao: '', instrucoes: '',
});

const FORMAS = ['Comprimido', 'Cápsula', 'Solução oral', 'Suspensão', 'Injetável', 'Pomada', 'Creme', 'Colírio', 'Supositório', 'Inalação'];
const FREQUENCIAS = ['1x ao dia', '2x ao dia', '3x ao dia', '4x ao dia', 'A cada 6h', 'A cada 8h', 'A cada 12h', 'Se necessário', 'Uso contínuo'];

type Props = {
  triage: Triagem;
  me: StaffMember;
  onFinished: (updatedTriage: Triagem) => void;
  onBack: () => void;
  retornoOrigem?: Retorno;
};

export const AtendimentoPage = ({ triage, me, onFinished, onBack, retornoOrigem }: Props) => {
  const [anamnese, setAnamnese]     = useState('');
  const [exameFisico, setExameFisico] = useState('');
  const [hipotese, setHipotese]     = useState('');
  const [cid, setCid]               = useState('');
  const [conduta, setConduta]       = useState('');
  const [prescricao, setPrescricao] = useState<PrescricaoItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Patient history
  const [historico, setHistorico]                 = useState<Consulta[]>([]);
  const [examesHist, setExamesHist]               = useState<import('@/types/hospital').Exame[]>([]);
  const [historicoOpen, setHistoricoOpen]         = useState(false);
  const [historicoExpanded, setHistoricoExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!triage.patientId) return;
    recordsApi.getByPatient(triage.patientId).then(setHistorico).catch(() => {});
    examesApi.getByPatient(triage.patientId).then(setExamesHist).catch(() => {});
  }, [triage.patientId]);

  // Encaminhamentos
  const [encAtivos, setEncAtivos]           = useState<Set<string>>(new Set());
  const [motivoInternacao, setMotivoInternacao] = useState('');
  const [setorEnfermaria, setSetorEnfermaria]   = useState('');
  const [obsEnfermaria, setObsEnfermaria]       = useState('');
  const [tipoExame, setTipoExame]               = useState('');
  const [urgenciaExame, setUrgenciaExame]       = useState('Normal');
  const [justExame, setJustExame]               = useState('');
  const [prazoRetorno, setPrazoRetorno]         = useState('');
  const [espRetorno, setEspRetorno]             = useState('');
  const [orientRetorno, setOrientRetorno]       = useState('');

  const toggleEnc = (tipo: string) => setEncAtivos(prev => {
    const next = new Set(prev);
    next.has(tipo) ? next.delete(tipo) : next.add(tipo);
    return next;
  });

  // CID-10 autocomplete
  const [cidSuggestions, setCidSuggestions] = useState<CidResult[]>([]);
  const [cidLoading, setCidLoading]         = useState(false);
  const [showCidDropdown, setShowCidDropdown] = useState(false);
  const cidRef = useRef<HTMLDivElement>(null);

  const searchCid = useCallback(async (query: string) => {
    if (query.length < 2) { setCidSuggestions([]); return; }
    setCidLoading(true);
    try {
      const res = await fetch(
        `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(query)}&maxList=10`
      );
      const data = await res.json();
      setCidSuggestions((data[3] ?? []).map(([code, name]: [string, string]) => ({ code, name })));
    } catch {
      setCidSuggestions([]);
    } finally {
      setCidLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showCidDropdown) return;
    const timer = setTimeout(() => searchCid(cid), 300);
    return () => clearTimeout(timer);
  }, [cid, showCidDropdown, searchCid]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cidRef.current && !cidRef.current.contains(e.target as Node))
        setShowCidDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCidSelect = (result: CidResult) => {
    setCid(result.code);
    if (!hipotese) setHipotese(result.name);
    setShowCidDropdown(false);
    setCidSuggestions([]);
  };

  const addItem    = () => setPrescricao(p => [...p, emptyItem()]);
  const removeItem = (i: number) => setPrescricao(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof PrescricaoItem, value: string) =>
    setPrescricao(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handlePrint = () => {
    const patientName = triage.patientName ?? `Paciente #${triage.patientId}`;
    const date = new Date().toLocaleDateString('pt-BR');
    const items = prescricao.filter(p => p.medicamento.trim());

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Receita Médica</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #111; }
  .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #2563eb; margin: 0 0 4px; }
  .header p { font-size: 13px; color: #555; margin: 0; }
  .info { display: flex; justify-content: space-between; margin-bottom: 28px; font-size: 13px; }
  .info .block strong { display: block; font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 2px; }
  .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #2563eb; margin: 0 0 12px; letter-spacing: 0.06em; }
  .item { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
  .item-name { font-size: 15px; font-weight: bold; }
  .item-details { font-size: 13px; color: #444; margin-top: 4px; }
  .item-instructions { font-size: 13px; color: #555; margin-top: 6px; font-style: italic; }
  .signature { margin-top: 60px; text-align: center; }
  .signature .line { border-top: 1px solid #333; width: 260px; margin: 0 auto 6px; }
  .signature p { font-size: 13px; margin: 2px 0; }
  @media print { body { margin: 20px; } }
</style></head><body>
<div class="header">
  <h1>Receita Médica</h1>
  <p>HealthSys — Sistema de Gestão Hospitalar</p>
</div>
<div class="info">
  <div class="block"><strong>Paciente</strong>${patientName}</div>
  <div class="block"><strong>Médico responsável</strong>Dr(a). ${me.nome}</div>
  <div class="block"><strong>Data de emissão</strong>${date}</div>
</div>
${items.length > 0
  ? `<p class="section-title">Prescrições</p>${items.map((item, i) => `
<div class="item">
  <div class="item-name">${i + 1}. ${item.medicamento}${item.concentracao ? ` ${item.concentracao}` : ''} — ${item.formaFarmaceutica}</div>
  <div class="item-details">Dose: ${item.dose || '—'} | Frequência: ${item.frequencia || '—'} | Duração: ${item.duracao || '—'}</div>
  ${item.instrucoes ? `<div class="item-instructions">${item.instrucoes}</div>` : ''}
</div>`).join('')}`
  : '<p style="color:#888; font-style:italic;">Nenhuma prescrição registrada.</p>'}
<div class="signature">
  <div class="line"></div>
  <p>Dr(a). ${me.nome}</p>
  <p style="color:#888; font-size:12px;">Assinatura e carimbo do médico</p>
</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleFinish = async () => {
    if (submitting) return;
    if (encAtivos.has('internacao') && !motivoInternacao.trim()) {
      setError('Informe o motivo da internação.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const encList: object[] = [];
    if (encAtivos.has('internacao')) encList.push({ tipo: 'Internação', motivo: motivoInternacao });
    if (encAtivos.has('enfermaria')) encList.push({ tipo: 'Enfermaria', setor: setorEnfermaria, observacoes: obsEnfermaria });
    if (encAtivos.has('exame'))     encList.push({ tipo: 'Exame', tipoExame, urgencia: urgenciaExame, justificativa: justExame });
    if (encAtivos.has('retorno'))   encList.push({ tipo: 'Retorno', prazo: prazoRetorno, especialidade: espRetorno, orientacoes: orientRetorno });

    try {
      await recordsApi.create({
        patientId:           triage.patientId,
        patientName:         triage.patientName ?? `Paciente #${triage.patientId}`,
        medicoNome:          me.nome,
        anamnese,
        exameFisico,
        hipoteseDiagnostica: hipotese,
        cid,
        conduta,
        prescricao:          prescricao.length > 0 ? JSON.stringify(prescricao) : undefined,
        encaminhamentos:     encList.length > 0 ? JSON.stringify(encList) : undefined,
      });
      if (encAtivos.has('internacao')) {
        await recordsApi.createInternacao({
          patientId:         triage.patientId,
          patientName:       triage.patientName ?? `Paciente #${triage.patientId}`,
          medicoResponsavel: me.nome,
          motivoInternacao,
        });
      }
      if (encAtivos.has('retorno')) {
        await retornosApi.create({
          patientId:    triage.patientId,
          patientName:  triage.patientName ?? `Paciente #${triage.patientId}`,
          medicoNome:   me.nome,
          prazo:        prazoRetorno,
          especialidade: espRetorno,
          orientacoes:  orientRetorno || undefined,
        });
      }
      if (encAtivos.has('exame') && tipoExame.trim()) {
        await examesApi.create({
          patientId:    triage.patientId,
          patientName:  triage.patientName ?? `Paciente #${triage.patientId}`,
          medicoNome:   me.nome,
          tipoExame,
          urgencia:     urgenciaExame,
          justificativa: justExame || undefined,
        });
      }
      if (retornoOrigem) {
        await retornosApi.realizar(retornoOrigem.id);
        onBack();
      } else {
        const updated = await triageApi.finishTriage(triage.id);
        onFinished(updated);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao finalizar atendimento.');
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = triage.patientName ?? `Paciente #${triage.patientId}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-8 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <FileText size={18} className="text-blue-600" />
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Finalizar Atendimento</h1>
            <p className="text-xs text-slate-400">{patientName} · Dr(a). {me.nome}</p>
          </div>
        </div>
        {retornoOrigem && (
          <div className="pb-3">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CalendarClock size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-800">
                <span className="font-bold">Consulta de Retorno</span>
                {retornoOrigem.especialidade && <span> · {retornoOrigem.especialidade}</span>}
                {retornoOrigem.orientacoes && (
                  <span className="text-emerald-700"> — {retornoOrigem.orientacoes}</span>
                )}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="pb-3">
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Left: Clinical documentation */}
          <div className="space-y-6">

            {/* Vitals summary from triage */}
            {triage.vitals && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados da Triagem</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {triage.queixaPrincipal && (
                    <div className="w-full">
                      <span className="text-xs text-slate-400">Queixa: </span>
                      <span className="text-xs font-medium text-slate-700 italic">"{triage.queixaPrincipal}"</span>
                    </div>
                  )}
                  {triage.vitals.temp && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Thermometer size={12} className="text-rose-400" />
                      <span className="text-slate-400">Temp</span> <strong>{triage.vitals.temp}°C</strong>
                    </span>
                  )}
                  {triage.vitals.heartRate && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Heart size={12} className="text-rose-400" />
                      <span className="text-slate-400">FC</span> <strong>{triage.vitals.heartRate} bpm</strong>
                    </span>
                  )}
                  {triage.vitals.saturation && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Wind size={12} className="text-blue-400" />
                      <span className="text-slate-400">SpO₂</span> <strong>{triage.vitals.saturation}%</strong>
                    </span>
                  )}
                  {triage.vitals.pressure && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Activity size={12} className="text-emerald-500" />
                      <span className="text-slate-400">PA</span> <strong>{triage.vitals.pressure} mmHg</strong>
                    </span>
                  )}
                  {triage.vitals.respiratoryRate && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Wind size={12} className="text-violet-400" />
                      <span className="text-slate-400">FR</span> <strong>{triage.vitals.respiratoryRate} irpm</strong>
                    </span>
                  )}
                  {triage.vitals.glucose && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Droplets size={12} className="text-amber-400" />
                      <span className="text-slate-400">Gli</span> <strong>{triage.vitals.glucose} mg/dL</strong>
                    </span>
                  )}
                  {triage.vitals.painScale != null && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <span className="text-slate-400">Dor</span> <strong>{triage.vitals.painScale}/10</strong>
                    </span>
                  )}
                  {triage.vitals.consciousnessLevel && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Brain size={12} className="text-slate-400" />
                      <span className="text-slate-400">Consciência</span> <strong>{triage.vitals.consciousnessLevel}</strong>
                    </span>
                  )}
                  {triage.vitals.weight && triage.vitals.height && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <span className="text-slate-400">Peso/Alt</span>
                      <strong>{triage.vitals.weight} kg / {triage.vitals.height} cm</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Patient history */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setHistoricoOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wide">
                  <History size={15} className="text-slate-500" />
                  Histórico do Paciente
                  {(historico.length + examesHist.length) > 0 && (
                    <span className="ml-1 text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {historico.length + examesHist.length}
                    </span>
                  )}
                </span>
                {historicoOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {historicoOpen && (
                <div className="border-t border-slate-100 px-6 pb-5 pt-4 space-y-3 max-h-[480px] overflow-y-auto">
                  {/* Exames do paciente */}
                  {examesHist.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <FlaskConical size={11} /> Exames Solicitados ({examesHist.length})
                      </p>
                      {examesHist.map(ex => {
                        const urgColor = ex.urgencia === 'Emergência' ? 'text-rose-600 bg-rose-50 border-rose-100'
                          : ex.urgencia === 'Urgente' ? 'text-amber-600 bg-amber-50 border-amber-100'
                          : 'text-blue-600 bg-blue-50 border-blue-100';
                        const statusColor = ex.status === 'CONCLUIDO' ? 'text-emerald-600' : ex.status === 'EM_ANDAMENTO' ? 'text-amber-600' : ex.status === 'CANCELADO' ? 'text-slate-400' : 'text-blue-600';
                        return (
                          <div key={ex.id} className="border border-slate-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800">{ex.tipoExame}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {new Date(ex.dataSolicitacao).toLocaleDateString('pt-BR')} · Dr(a). {ex.medicoNome}
                              </p>
                              {ex.resultado && (
                                <p className="text-xs text-emerald-700 mt-1 italic">"{ex.resultado}"</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgColor}`}>{ex.urgencia}</span>
                              <span className={`text-[10px] font-semibold ${statusColor}`}>{ex.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Consultas anteriores */}
                  {historico.length > 0 && historico.map((c, idx) => {
                      const isOpen = historicoExpanded.has(idx);
                      const toggle = () => setHistoricoExpanded(prev => {
                        const next = new Set(prev);
                        isOpen ? next.delete(idx) : next.add(idx);
                        return next;
                      });
                      const dateStr = c.data ? new Date(c.data).toLocaleDateString('pt-BR') : '—';
                      let meds: { medicamento: string; dose?: string; frequencia?: string }[] = [];
                      try { if (c.prescricao) meds = JSON.parse(c.prescricao); } catch {}
                      return (
                        <div key={c.id} className="border border-slate-200 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={toggle}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                {dateStr} · Dr(a). {c.medicoNome}
                              </p>
                              {c.hipoteseDiagnostica && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                                  {c.hipoteseDiagnostica}{c.cid ? ` (${c.cid})` : ''}
                                </p>
                              )}
                            </div>
                            {isOpen ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 pt-3 bg-slate-50/50">
                              {c.anamnese && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Anamnese</p>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{c.anamnese}</p>
                                </div>
                              )}
                              {c.exameFisico && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Exame Físico</p>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{c.exameFisico}</p>
                                </div>
                              )}
                              {c.conduta && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Conduta</p>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{c.conduta}</p>
                                </div>
                              )}
                              {meds.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Prescrição</p>
                                  <ul className="space-y-0.5">
                                    {meds.map((m, mi) => (
                                      <li key={mi} className="text-xs text-slate-700 flex gap-1">
                                        <span className="text-slate-400">·</span>
                                        <span>
                                          <span className="font-medium">{m.medicamento}</span>
                                          {m.dose && <span className="text-slate-500"> — {m.dose}</span>}
                                          {m.frequencia && <span className="text-slate-400"> ({m.frequencia})</span>}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Documentação Clínica</h2>


              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Anamnese</label>
                <textarea
                  rows={4}
                  value={anamnese}
                  onChange={e => setAnamnese(e.target.value)}
                  placeholder="História da doença atual, queixas principais, antecedentes pessoais e familiares..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Exame Físico</label>
                <textarea
                  rows={4}
                  value={exameFisico}
                  onChange={e => setExameFisico(e.target.value)}
                  placeholder="Achados ao exame físico geral e segmentar, sinais vitais relevantes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-sm font-medium text-slate-700">Hipótese Diagnóstica</label>
                  <input
                    type="text"
                    value={hipotese}
                    onChange={e => setHipotese(e.target.value)}
                    placeholder="Ex.: Pneumonia bacteriana adquirida"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="space-y-1" ref={cidRef}>
                  <label className="text-sm font-medium text-slate-700">CID-10</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cid}
                      onChange={e => {
                        setCid(e.target.value.toUpperCase());
                        setShowCidDropdown(true);
                      }}
                      onFocus={() => cid.length >= 2 && setShowCidDropdown(true)}
                      placeholder="J18.9 ou termo"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    />
                    {cidLoading && (
                      <span className="absolute right-2 top-2.5 w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    )}
                    {showCidDropdown && (cidSuggestions.length > 0 || cidLoading) && (
                      <div className="absolute z-50 left-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {cidLoading && cidSuggestions.length === 0 ? (
                          <p className="text-xs text-slate-400 px-4 py-3">Buscando...</p>
                        ) : (
                          <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                            {cidSuggestions.map(r => (
                              <li key={r.code}>
                                <button
                                  type="button"
                                  onMouseDown={e => { e.preventDefault(); handleCidSelect(r); }}
                                  className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
                                >
                                  <span className="shrink-0 mt-0.5 text-[11px] font-bold font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                    {r.code}
                                  </span>
                                  <span className="text-xs text-slate-700 leading-snug">{r.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Conduta</label>
                <textarea
                  rows={3}
                  value={conduta}
                  onChange={e => setConduta(e.target.value)}
                  placeholder="Orientações, encaminhamentos, procedimentos indicados, observações finais..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Right: Prescriptions + Encaminhamentos */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Pill size={15} className="text-blue-600" />
                  Receita Médica
                </h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={13} />
                  Adicionar
                </button>
              </div>

              {prescricao.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Pill size={30} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma prescrição adicionada.</p>
                  <p className="text-xs mt-1">Clique em "Adicionar" para incluir medicamentos.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                  {prescricao.map((item, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Medicamento {i + 1}</span>
                        <button onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Nome do medicamento"
                        value={item.medicamento}
                        onChange={e => updateItem(i, 'medicamento', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Concentração (ex.: 500mg)"
                          value={item.concentracao}
                          onChange={e => updateItem(i, 'concentracao', e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <Select
                          value={item.formaFarmaceutica}
                          onChange={e => updateItem(i, 'formaFarmaceutica', e.target.value)}
                          className="py-1.5 w-auto min-w-[110px]"
                        >
                          {FORMAS.map(f => <option key={f}>{f}</option>)}
                        </Select>
                        <input
                          type="text"
                          placeholder="Dose (ex.: 1 comprimido)"
                          value={item.dose}
                          onChange={e => updateItem(i, 'dose', e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <Select
                          value={item.frequencia}
                          onChange={e => updateItem(i, 'frequencia', e.target.value)}
                          className="py-1.5 w-auto min-w-[130px]"
                        >
                          <option value="">Frequência...</option>
                          {FREQUENCIAS.map(f => <option key={f}>{f}</option>)}
                        </Select>
                      </div>
                      <input
                        type="text"
                        placeholder="Duração do tratamento (ex.: 7 dias)"
                        value={item.duracao}
                        onChange={e => updateItem(i, 'duracao', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Instruções adicionais (ex.: tomar em jejum)"
                        value={item.instrucoes}
                        onChange={e => updateItem(i, 'instrucoes', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Encaminhamentos */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Encaminhamentos</h2>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => toggleEnc('internacao')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${encAtivos.has('internacao') ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <BedDouble size={16} className={encAtivos.has('internacao') ? 'text-rose-500' : 'text-slate-400'} />
                  Internação
                  {encAtivos.has('internacao') && <CheckCircle2 size={14} className="ml-auto text-rose-500" />}
                </button>
                <button type="button" onClick={() => toggleEnc('enfermaria')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${encAtivos.has('enfermaria') ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <Stethoscope size={16} className={encAtivos.has('enfermaria') ? 'text-amber-500' : 'text-slate-400'} />
                  Enfermaria
                  {encAtivos.has('enfermaria') && <CheckCircle2 size={14} className="ml-auto text-amber-500" />}
                </button>
                <button type="button" onClick={() => toggleEnc('exame')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${encAtivos.has('exame') ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <FlaskConical size={16} className={encAtivos.has('exame') ? 'text-blue-500' : 'text-slate-400'} />
                  Exame
                  {encAtivos.has('exame') && <CheckCircle2 size={14} className="ml-auto text-blue-500" />}
                </button>
                <button type="button" onClick={() => toggleEnc('retorno')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${encAtivos.has('retorno') ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <CalendarClock size={16} className={encAtivos.has('retorno') ? 'text-emerald-500' : 'text-slate-400'} />
                  Retorno
                  {encAtivos.has('retorno') && <CheckCircle2 size={14} className="ml-auto text-emerald-500" />}
                </button>
              </div>

              {encAtivos.has('internacao') && (
                <div className="border border-rose-200 bg-rose-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-rose-700">Internação</p>
                  <textarea rows={2} value={motivoInternacao} onChange={e => setMotivoInternacao(e.target.value)}
                    placeholder="Motivo da internação..."
                    className="w-full px-3 py-2 border border-rose-200 bg-white rounded-lg focus:ring-2 focus:ring-rose-300 outline-none resize-none text-sm" />
                </div>
              )}

              {encAtivos.has('enfermaria') && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-amber-700">Enfermaria</p>
                  <input type="text" value={setorEnfermaria} onChange={e => setSetorEnfermaria(e.target.value)}
                    placeholder="Setor / Ala (ex.: Clínica Médica, Pediatria...)"
                    className="w-full px-3 py-2 border border-amber-200 bg-white rounded-lg focus:ring-2 focus:ring-amber-300 outline-none text-sm" />
                  <textarea rows={2} value={obsEnfermaria} onChange={e => setObsEnfermaria(e.target.value)}
                    placeholder="Observações para a enfermagem (medicação, cuidados especiais...)"
                    className="w-full px-3 py-2 border border-amber-200 bg-white rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-none text-sm" />
                </div>
              )}

              {encAtivos.has('exame') && (
                <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-blue-700">Exame</p>
                  <input type="text" value={tipoExame} onChange={e => setTipoExame(e.target.value)}
                    placeholder="Tipo de exame (ex.: Hemograma, Raio-X tórax, ECG...)"
                    className="w-full px-3 py-2 border border-blue-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-300 outline-none text-sm" />
                  <div className="flex gap-2">
                    {['Normal', 'Urgente', 'Emergência'].map(u => (
                      <button key={u} type="button" onClick={() => setUrgenciaExame(u)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${urgenciaExame === u ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                  <textarea rows={2} value={justExame} onChange={e => setJustExame(e.target.value)}
                    placeholder="Justificativa clínica..."
                    className="w-full px-3 py-2 border border-blue-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-300 outline-none resize-none text-sm" />
                </div>
              )}

              {encAtivos.has('retorno') && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-emerald-700">Retorno</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={prazoRetorno} onChange={e => setPrazoRetorno(e.target.value)}
                      placeholder="Prazo (ex.: 7 dias, 2 semanas)"
                      className="px-3 py-2 border border-emerald-200 bg-white rounded-lg focus:ring-2 focus:ring-emerald-300 outline-none text-sm" />
                    <input type="text" value={espRetorno} onChange={e => setEspRetorno(e.target.value)}
                      placeholder="Especialidade (ex.: Cardiologia)"
                      className="px-3 py-2 border border-emerald-200 bg-white rounded-lg focus:ring-2 focus:ring-emerald-300 outline-none text-sm" />
                  </div>
                  <textarea rows={2} value={orientRetorno} onChange={e => setOrientRetorno(e.target.value)}
                    placeholder="Orientações para o retorno..."
                    className="w-full px-3 py-2 border border-emerald-200 bg-white rounded-lg focus:ring-2 focus:ring-emerald-300 outline-none resize-none text-sm" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="mt-6 flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
          <button
            onClick={onBack}
            className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Printer size={15} />
              Imprimir Receita
            </button>
            <button
              onClick={handleFinish}
              disabled={submitting}
              className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50 ${encAtivos.has('internacao') ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {submitting ? 'Salvando...' : encAtivos.has('internacao') ? 'Registrar e Internar' : 'Finalizar Consulta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
