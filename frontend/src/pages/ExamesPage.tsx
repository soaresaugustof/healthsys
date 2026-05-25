import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlaskConical, Search, User, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';
import { Select } from '@/components/ui/FormFields';
import { motion, AnimatePresence } from 'motion/react';
import { examesApi, usersApi, aiApi } from '@/services/api';
import type { Exame, StaffMember } from '@/types/hospital';

const urgColors: Record<string, string> = {
  'Normal':     'bg-blue-100 text-blue-700',
  'Urgente':    'bg-amber-100 text-amber-700',
  'Emergência': 'bg-rose-100 text-rose-700',
};

const statusColors: Record<string, string> = {
  'SOLICITADO':   'bg-sky-100 text-sky-700',
  'EM_ANDAMENTO': 'bg-amber-100 text-amber-700',
  'CONCLUIDO':    'bg-emerald-100 text-emerald-700',
  'CANCELADO':    'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
  SOLICITADO:   'Solicitado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO:    'Concluído',
  CANCELADO:    'Cancelado',
};

type ResultadoModal = { exame: Exame; resultado: string; tecnico: string };

export const ExamesPage = () => {
  const [exames, setExames]               = useState<Exame[]>([]);
  const [laboratoristas, setLaboratoristas] = useState<StaffMember[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilterStatus]   = useState('TODOS');
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [modal, setModal]                 = useState<ResultadoModal | null>(null);
  const [saving, setSaving]               = useState(false);
  const [aiLoading, setAiLoading]         = useState<string | null>(null);
  const [aiTarget, setAiTarget]           = useState<Exame | null>(null);
  const fileInputRef                       = useRef<HTMLInputElement>(null);

  const fetchExames = useCallback(() => {
    setLoading(true);
    examesApi.getAll()
      .then(setExames)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchExames(); }, [fetchExames]);

  useEffect(() => {
    usersApi.getAll()
      .then(users => setLaboratoristas(users.filter(u => u.perfil === 'Laboratorista')))
      .catch(() => {});
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const updated = await examesApi.updateStatus(id, status);
      setExames(prev => prev.map(e => String(e.id) === String(updated.id) ? updated : e));
    } catch {}
  };

  const handleRegistrarResultado = async () => {
    if (!modal || !modal.resultado.trim()) return;
    setSaving(true);
    try {
      const updated = await examesApi.registrarResultado(modal.exame.id, modal.resultado, modal.tecnico || undefined);
      setExames(prev => prev.map(e => String(e.id) === String(updated.id) ? updated : e));
      setModal(null);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleAiClick = (exame: Exame) => {
    setAiTarget(exame);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !aiTarget) return;
    // Limpa o input para permitir reenviar o mesmo arquivo
    e.target.value = '';
    setAiLoading(aiTarget.id);
    try {
      const result = await aiApi.classify(file);
      const top = Object.entries(result.detalhes)
        .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
        .slice(0, 5)
        .map(([label, pct]) => `  • ${label}: ${pct}`)
        .join('\n');
      const texto =
        `A análise via MedCare registrou a hipótese principal como ${result.diagnostico}. Exame pronto para retirada do paciente e retorno ao clínico. Abaixo mais detalhes:\n\nProbabilidade prevista: ${result.probabilidade}\n\nTop 5 probabilidades:\n${top}`;
      setModal({ exame: aiTarget, resultado: texto, tecnico: 'IA — medc' });
    } catch (err: any) {
      alert(`Erro na classificação: ${err?.message ?? 'Tente novamente.'}`);
    } finally {
      setAiLoading(null);
      setAiTarget(null);
    }
  };

  const filtered = exames.filter(e => {
    const matchSearch =
      e.patientName.toLowerCase().includes(search.toLowerCase()) ||
      e.tipoExame.toLowerCase().includes(search.toLowerCase()) ||
      e.medicoNome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'TODOS' || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    SOLICITADO:   exames.filter(e => e.status === 'SOLICITADO').length,
    EM_ANDAMENTO: exames.filter(e => e.status === 'EM_ANDAMENTO').length,
    CONCLUIDO:    exames.filter(e => e.status === 'CONCLUIDO').length,
    CANCELADO:    exames.filter(e => e.status === 'CANCELADO').length,
  };

  return (
    <div className="space-y-6 p-10">
      <div>
        <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Exames</h1>
        <p className="text-[#64748b]">Gerenciamento de exames solicitados pelos médicos.</p>
      </div>

      {/* Input oculto para upload de imagem de exame */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Solicitados',   value: counts.SOLICITADO,   color: 'text-sky-600',     bg: 'bg-sky-50' },
          { label: 'Em andamento',  value: counts.EM_ANDAMENTO, color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Concluídos',    value: counts.CONCLUIDO,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cancelados',    value: counts.CANCELADO,    color: 'text-slate-500',   bg: 'bg-slate-50' },
        ].map(s => (
          <div key={s.label} className={`p-4 ${s.bg} border border-slate-200 rounded-xl`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${s.color}`}>{s.label}</p>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por paciente, tipo de exame ou médico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['TODOS', 'SOLICITADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filterStatus === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s === 'TODOS' ? 'Todos' : STATUS_LABELS[s]}
              {s !== 'TODOS' && <span className="ml-1 opacity-70">({counts[s]})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center py-12 text-slate-500">Carregando exames...</p>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-xl">
          <FlaskConical size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">Nenhum exame encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(exame => {
            const isExpanded = expandedId === String(exame.id);
            return (
              <motion.div
                key={exame.id}
                layout
                className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Header do card */}
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : String(exame.id))}
                >
                  <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl shrink-0">
                    <FlaskConical size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                      <span className="text-sm font-bold text-slate-900">{exame.tipoExame}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${urgColors[exame.urgencia] ?? 'bg-slate-100 text-slate-600'}`}>
                        {exame.urgencia}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColors[exame.status]}`}>
                        {STATUS_LABELS[exame.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><User size={11} /> {exame.patientName}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> Dr(a). {exame.medicoNome}</span>
                      <span>{new Date(exame.dataSolicitacao).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Ações rápidas */}
                    {exame.status === 'SOLICITADO' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleUpdateStatus(exame.id, 'EM_ANDAMENTO'); }}
                        className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        Iniciar
                      </button>
                    )}
                    {exame.status === 'EM_ANDAMENTO' && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); handleAiClick(exame); }}
                          disabled={aiLoading === exame.id}
                          title="Classificar imagem com IA"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {aiLoading === exame.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <BrainCircuit size={12} />}
                          {aiLoading === exame.id ? 'Analisando...' : 'Analisar com IA'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setModal({ exame, resultado: '', tecnico: '' }); }}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          Registrar Resultado
                        </button>
                      </>
                    )}
                    {(exame.status === 'SOLICITADO' || exame.status === 'EM_ANDAMENTO') && (
                      <button
                        onClick={e => { e.stopPropagation(); handleUpdateStatus(exame.id, 'CANCELADO'); }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Cancelar"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Detalhes expandidos */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/50">
                        {exame.justificativa && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Justificativa Clínica</p>
                            <p className="text-sm text-slate-700">{exame.justificativa}</p>
                          </div>
                        )}
                        {exame.resultado ? (
                          <div>
                            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Resultado</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{exame.resultado}</p>
                            {exame.tecnicoNome && (
                              <p className="text-xs text-slate-400 mt-1">Responsável: {exame.tecnicoNome}</p>
                            )}
                            {exame.dataResultado && (
                              <p className="text-xs text-slate-400">
                                Concluído em {new Date(exame.dataResultado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            )}
                          </div>
                        ) : exame.status !== 'CANCELADO' ? (
                          <p className="text-xs text-slate-400 italic">Resultado ainda não registrado.</p>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal: registrar resultado */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Registrar Resultado</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {modal.exame.tipoExame} · {modal.exame.patientName}
                </p>
              </div>
              <div className="p-5 space-y-4">
                {modal.resultado.startsWith('[Análise por IA]') && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700">
                    <BrainCircuit size={13} />
                    Resultado gerado por IA — revise antes de confirmar.
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Resultado *</label>
                  <textarea
                    rows={5}
                    value={modal.resultado}
                    onChange={e => setModal(m => m ? { ...m, resultado: e.target.value } : m)}
                    placeholder="Descreva os achados do exame..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Laboratorista Responsável</label>
                  {laboratoristas.length > 0 ? (
                    <Select
                      value={modal.tecnico}
                      onChange={e => setModal(m => m ? { ...m, tecnico: e.target.value } : m)}
                    >
                      <option value="">Selecione o responsável...</option>
                      {laboratoristas.map(l => (
                        <option key={l.id} value={l.nome}>{l.nome}</option>
                      ))}
                    </Select>
                  ) : (
                    <p className="text-xs text-slate-400 italic px-1">Nenhum laboratorista cadastrado.</p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRegistrarResultado}
                    disabled={!modal.resultado.trim() || saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {saving ? 'Salvando...' : 'Confirmar Resultado'}
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
