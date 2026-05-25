import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Bed, Users, CheckCircle2, Wrench, X, ArrowLeft, Clock, Stethoscope, Pill, FileText, ClipboardList, BedDouble, AlertCircle, FlaskConical } from 'lucide-react';
import { Select } from '@/components/ui/FormFields';
import { motion, AnimatePresence } from 'motion/react';
import type { Leito, Prontuario, ProntuarioDetail, Exame } from '@/types/hospital';
import { bedsApi, recordsApi, examesApi } from '@/services/api';

const statusColors: Record<string, string> = {
  'Disponível': 'bg-emerald-500',
  'Ocupado':    'bg-blue-600',
  'Manutenção': 'bg-amber-500',
};

const statusText: Record<string, string> = {
  'Disponível': 'text-emerald-600',
  'Ocupado':    'text-blue-600',
  'Manutenção': 'text-amber-600',
};

type PrescricaoItem = {
  medicamento: string; concentracao?: string; formaFarmaceutica?: string;
  dose?: string; frequencia?: string; duracao?: string; instrucoes?: string;
};

type EncItem = { tipo: string; [key: string]: string };

function parsePrescricao(json?: string): PrescricaoItem[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function parseEnc(json?: string): EncItem[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

function fmt(dt?: string) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Prontuário full view ────────────────────────────────────────────────────

const urgExameColors: Record<string, string> = {
  'Normal':     'bg-blue-100 text-blue-700',
  'Urgente':    'bg-amber-100 text-amber-700',
  'Emergência': 'bg-rose-100 text-rose-700',
};

const statusExameColors: Record<string, string> = {
  'SOLICITADO':   'text-sky-600',
  'EM_ANDAMENTO': 'text-amber-600',
  'CONCLUIDO':    'text-emerald-600',
  'CANCELADO':    'text-slate-400',
};

const ProntuarioView = ({
  bed, detail, onBack, onAlta,
}: { bed: Leito; detail: ProntuarioDetail; onBack: () => void; onAlta: () => void }) => {
  const [givingAlta, setGivingAlta] = useState(false);
  const [exames, setExames]         = useState<Exame[]>([]);
  const { prontuario, consultas } = detail;

  useEffect(() => {
    if (prontuario.patientId) {
      examesApi.getByPatient(prontuario.patientId).then(setExames).catch(() => {});
    }
  }, [prontuario.patientId]);

  const handleAlta = async () => {
    setGivingAlta(true);
    try {
      await recordsApi.darAlta(prontuario.id);
      await bedsApi.update(bed.id, {
        status: 'Disponível', pacienteId: null, pacienteNome: null,
        medicoId: null, medicoNome: null, prontuarioId: null,
      } as any);
      onAlta();
    } finally { setGivingAlta(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 shadow-sm">
        <div className="flex items-center gap-4 py-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <BedDouble size={18} className="text-blue-600" />
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Leito {bed.id} — {bed.setor}
            </h1>
            <p className="text-xs text-slate-400">
              {prontuario.patientName} · Dr(a). {prontuario.medicoResponsavel} · Internado em {fmt(prontuario.dataInternacao)}
            </p>
          </div>
          <button
            onClick={handleAlta}
            disabled={givingAlta}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {givingAlta ? 'Processando...' : 'Dar Alta'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

        {/* Motivo */}
        {prontuario.motivoInternacao && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Motivo da Internação</p>
            <p className="text-sm text-slate-700">{prontuario.motivoInternacao}</p>
          </div>
        )}

        {/* Medicamentos em uso (de todas as prescrições) */}
        {(() => {
          const todos = consultas.flatMap(c => parsePrescricao(c.prescricao));
          if (todos.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Pill size={13} /> Medicamentos Prescritos
              </p>
              <div className="flex flex-wrap gap-2">
                {todos.map((m, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-3 py-1.5">
                    <strong>{m.medicamento}</strong>
                    {m.concentracao && ` ${m.concentracao}`}
                    {m.formaFarmaceutica && ` · ${m.formaFarmaceutica}`}
                    {m.frequencia && ` · ${m.frequencia}`}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Exames */}
        {exames.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FlaskConical size={13} /> Exames ({exames.length})
            </p>
            <div className="space-y-2">
              {exames.map(ex => (
                <div key={ex.id} className="border border-slate-100 rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{ex.tipoExame}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Dr(a). {ex.medicoNome} · {new Date(ex.dataSolicitacao).toLocaleDateString('pt-BR')}
                      </p>
                      {ex.resultado && (
                        <p className="text-xs text-emerald-700 mt-1.5 italic">"{ex.resultado}"</p>
                      )}
                      {ex.tecnicoNome && (
                        <p className="text-xs text-slate-400">Técnico: {ex.tecnicoNome}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgExameColors[ex.urgencia] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ex.urgencia}
                      </span>
                      <span className={`text-[10px] font-semibold ${statusExameColors[ex.status]}`}>
                        {ex.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline de consultas */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ClipboardList size={13} /> Consultas ({consultas.length})
          </p>
          {consultas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
              Nenhuma consulta registrada para este paciente.
            </div>
          ) : consultas.map(c => {
            const presc = parsePrescricao(c.prescricao);
            const encs  = parseEnc(c.encaminhamentos);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-400" />
                    <span className="text-xs text-slate-500">{fmt(c.data)}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-600">Dr(a). {c.medicoNome}</span>
                  </div>
                  {c.cid && (
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {c.cid}
                    </span>
                  )}
                </div>

                {c.hipoteseDiagnostica && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Hipótese Diagnóstica</p>
                    <p className="text-sm font-medium text-slate-800">{c.hipoteseDiagnostica}</p>
                  </div>
                )}

                {c.anamnese && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Anamnese</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{c.anamnese}</p>
                  </div>
                )}

                {c.conduta && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Conduta</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{c.conduta}</p>
                  </div>
                )}

                {presc.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Pill size={11} /> Prescrição
                    </p>
                    <div className="space-y-1">
                      {presc.map((m, i) => (
                        <div key={i} className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-1.5">
                          <strong>{m.medicamento}</strong>
                          {m.concentracao && ` ${m.concentracao}`}
                          {m.formaFarmaceutica && ` — ${m.formaFarmaceutica}`}
                          {(m.dose || m.frequencia) && (
                            <span className="text-slate-500"> · {[m.dose, m.frequencia, m.duracao].filter(Boolean).join(' · ')}</span>
                          )}
                          {m.instrucoes && <span className="text-slate-400 italic"> ({m.instrucoes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {encs.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Encaminhamentos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {encs.map((e, i) => (
                        <span key={i} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-100 rounded-lg px-2 py-1">
                          {e.tipo}{e.especialidade ? ` · ${e.especialidade}` : ''}{e.tipoExame ? ` · ${e.tipoExame}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Main page ───────────────────────────────────────────────────────────────

export const Monitoring = () => {
  const [leitos, setLeitos]                       = useState<Leito[]>([]);
  const [pendentes, setPendentes]                 = useState<Prontuario[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [prontuarioView, setProntuarioView]       = useState<{ bed: Leito; detail: ProntuarioDetail } | null>(null);
  const [loadingProntuario, setLoadingProntuario] = useState(false);

  // bed status modal (disponível / manutenção)
  const [selectedBed, setSelectedBed]             = useState<Leito | null>(null);
  const [saving, setSaving]                       = useState(false);

  // allocation modal (pending → bed)
  const [alocarPendente, setAlocarPendente]       = useState<Prontuario | null>(null);
  const [selLeitoId, setSelLeitoId]               = useState('');
  const [allocating, setAllocating]               = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [beds, pend] = await Promise.all([
        bedsApi.getAll(),
        recordsApi.getInternacoesPendentes(),
      ]);
      setLeitos(beds.sort((a, b) => a.setor.localeCompare(b.setor)));
      setPendentes(pend);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openBed = async (leito: Leito) => {
    if (leito.status === 'Ocupado' && leito.prontuarioId) {
      setLoadingProntuario(true);
      try {
        const detail = await recordsApi.getProntuarioDetail(leito.prontuarioId);
        setProntuarioView({ bed: leito, detail });
      } finally {
        setLoadingProntuario(false);
      }
    } else {
      setSelectedBed(leito);
    }
  };

  const handleStatusChange = async (status: Leito['status']) => {
    if (!selectedBed) return;
    setSaving(true);
    try {
      await bedsApi.update(selectedBed.id, {
        status, pacienteId: null, pacienteNome: null,
        medicoId: null, medicoNome: null, prontuarioId: null,
      } as any);
      setLeitos(prev => prev.map(l =>
        l.id === selectedBed.id ? { ...l, status, pacienteId: null, pacienteNome: null, medicoId: null, medicoNome: null, prontuarioId: null } : l
      ));
      setSelectedBed(null);
    } finally { setSaving(false); }
  };

  const handleConfirmAlocacao = async () => {
    if (!alocarPendente || !selLeitoId) return;
    const bed = leitos.find(l => l.id === selLeitoId);
    if (!bed) return;
    setAllocating(true);
    try {
      const updated = await recordsApi.internarPaciente(alocarPendente.id, selLeitoId);
      await bedsApi.update(selLeitoId, {
        status: 'Ocupado',
        pacienteId:   alocarPendente.patientId,
        pacienteNome: alocarPendente.patientName,
        medicoId:     updated.medicoResponsavel,
        medicoNome:   updated.medicoResponsavel,
        prontuarioId: String(updated.id),
      } as any);
      setLeitos(prev => prev.map(l =>
        l.id === selLeitoId ? {
          ...l, status: 'Ocupado',
          pacienteId: alocarPendente.patientId, pacienteNome: alocarPendente.patientName,
          medicoNome: alocarPendente.medicoResponsavel, prontuarioId: String(updated.id),
        } : l
      ));
      setPendentes(prev => prev.filter(p => String(p.id) !== String(alocarPendente.id)));
      setAlocarPendente(null);
      setSelLeitoId('');
    } finally { setAllocating(false); }
  };

  const stats = {
    total:       leitos.length,
    ocupados:    leitos.filter(l => l.status === 'Ocupado').length,
    disponiveis: leitos.filter(l => l.status === 'Disponível').length,
    manutencao:  leitos.filter(l => l.status === 'Manutenção').length,
  };

  const setores = Array.from(new Set(leitos.map(l => l.setor)));
  const disponiveisParaAlocar = leitos.filter(l => l.status === 'Disponível');

  if (prontuarioView) {
    return (
      <ProntuarioView
        bed={prontuarioView.bed}
        detail={prontuarioView.detail}
        onBack={() => setProntuarioView(null)}
        onAlta={() => {
          setLeitos(prev => prev.map(l =>
            l.id === prontuarioView.bed.id
              ? { ...l, status: 'Disponível', pacienteId: null, pacienteNome: null, medicoId: null, medicoNome: null, prontuarioId: null }
              : l
          ));
          setProntuarioView(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 p-10">
      <div>
        <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Monitoramento de Leitos</h1>
        <p className="text-[#64748b]">Ocupação hospitalar e status das unidades em tempo real.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',       value: stats.total,       icon: Bed,          color: 'text-slate-500' },
          { label: 'Ocupados',    value: stats.ocupados,    icon: Users,        color: 'text-blue-600' },
          { label: 'Disponíveis', value: stats.disponiveis, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Manutenção',  value: stats.manutencao,  icon: Wrench,       color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className={`flex items-center gap-2 mb-2 ${s.color}`}>
              <s.icon size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Aguardando internação */}
      {pendentes.length > 0 && (
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide">
              Aguardando Leito ({pendentes.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {pendentes.map(p => (
              <div key={p.id} className="border border-amber-100 bg-amber-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold text-slate-900">{p.patientName}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Stethoscope size={11} /> Dr(a). {p.medicoResponsavel}
                </p>
                {p.motivoInternacao && (
                  <p className="text-xs text-slate-500 italic line-clamp-2">"{p.motivoInternacao}"</p>
                )}
                <button
                  onClick={() => { setAlocarPendente(p); setSelLeitoId(''); }}
                  disabled={disponiveisParaAlocar.length === 0}
                  className="w-full mt-1 px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-40"
                >
                  {disponiveisParaAlocar.length === 0 ? 'Sem leitos disponíveis' : 'Alocar Leito'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading spinner for prontuário */}
      {loadingProntuario && (
        <div className="text-center py-4 text-slate-400 text-sm flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          Carregando prontuário...
        </div>
      )}

      {/* Beds grid */}
      <div className="space-y-8">
        {loading ? (
          <p className="text-center py-12 text-slate-500">Carregando leitos...</p>
        ) : setores.map(setor => (
          <div key={setor} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity size={20} className="text-blue-600" />
              {setor}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {leitos.filter(l => l.setor === setor).map(leito => (
                <motion.div
                  key={leito.id}
                  whileHover={{ y: -4 }}
                  onClick={() => openBed(leito)}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden cursor-pointer"
                >
                  <div className={`absolute top-0 left-0 w-full h-1 ${statusColors[leito.status]}`} />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-slate-900">{leito.id}</span>
                    <div className={`w-2 h-2 rounded-full ${statusColors[leito.status]}`} />
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${statusText[leito.status]}`}>
                    {leito.status}
                  </p>
                  {leito.status === 'Ocupado' && (
                    <div className="mt-1 space-y-0.5">
                      {leito.pacienteNome && (
                        <p className="text-[10px] text-slate-600 truncate font-medium">{leito.pacienteNome}</p>
                      )}
                      {leito.medicoNome && (
                        <p className="text-[10px] text-slate-400 truncate">Dr(a). {leito.medicoNome}</p>
                      )}
                      {leito.prontuarioId && (
                        <p className="text-[10px] text-blue-500 flex items-center gap-0.5 mt-1">
                          <FileText size={9} /> Ver prontuário
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: status change for non-occupied beds */}
      <AnimatePresence>
        {selectedBed && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Leito {selectedBed.id}</h2>
                  <p className="text-sm text-slate-500">{selectedBed.setor}</p>
                </div>
                <button onClick={() => setSelectedBed(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-2">
                <p className="text-sm font-medium text-slate-600 mb-3">Alterar status</p>
                {(['Disponível', 'Manutenção'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={saving || selectedBed.status === status}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedBed.status === status
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    } disabled:opacity-50`}
                  >
                    <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                    <span className="font-medium text-sm">{status}</span>
                    {selectedBed.status === status && <CheckCircle2 size={16} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: alocar leito para internação pendente */}
      <AnimatePresence>
        {alocarPendente && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Alocar Leito</h2>
                  <p className="text-sm text-slate-500">{alocarPendente.patientName}</p>
                </div>
                <button onClick={() => setAlocarPendente(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {alocarPendente.motivoInternacao && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs text-amber-600 font-medium mb-1">Motivo da internação</p>
                    <p className="text-sm text-slate-700">{alocarPendente.motivoInternacao}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Médico Responsável</p>
                  <p className="text-sm font-medium text-slate-800">Dr(a). {alocarPendente.medicoResponsavel}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Selecione o leito disponível</label>
                  <Select
                    value={selLeitoId}
                    onChange={e => setSelLeitoId(e.target.value)}
                  >
                    <option value="">Selecione um leito...</option>
                    {disponiveisParaAlocar.map(l => (
                      <option key={l.id} value={l.id}>{l.id} — {l.setor}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setAlocarPendente(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmAlocacao}
                    disabled={!selLeitoId || allocating}
                    className="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {allocating ? 'Internando...' : 'Confirmar Internação'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
