import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Clock, User, BedDouble, ChevronRight, X, CheckCircle2, CalendarClock, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { recordsApi, retornosApi } from '@/services/api';
import type { Consulta, Prontuario, ProntuarioDetail, Retorno } from '@/types/hospital';

const riskStyleMap: Record<string, string> = {
  ATIVO: 'bg-rose-100 text-rose-700',
  ALTA:  'bg-emerald-100 text-emerald-700',
};

const retornoStatusStyle: Record<string, string> = {
  PENDENTE:   'bg-amber-100 text-amber-700',
  REALIZADO:  'bg-emerald-100 text-emerald-700',
  CANCELADO:  'bg-slate-100 text-slate-500',
};

export const Records = () => {
  const [tab, setTab]                           = useState<'consultas' | 'prontuarios' | 'retornos'>('consultas');
  const [consultas, setConsultas]               = useState<Consulta[]>([]);
  const [prontuarios, setProntuarios]           = useState<Prontuario[]>([]);
  const [retornos, setRetornos]                 = useState<Retorno[]>([]);
  const [detail, setDetail]                     = useState<ProntuarioDetail | null>(null);
  const [loadingConsultas, setLoadingConsultas] = useState(true);
  const [loadingProntuarios, setLoadingProntuarios] = useState(true);
  const [loadingRetornos, setLoadingRetornos]   = useState(true);
  const [loadingDetail, setLoadingDetail]       = useState(false);
  const [searchTerm, setSearchTerm]             = useState('');
  const [givingAlta, setGivingAlta]             = useState<string | null>(null);
  const [retornoFilterStatus, setRetornoFilterStatus] = useState<string>('TODOS');

  const fetchConsultas = useCallback(() => {
    setLoadingConsultas(true);
    recordsApi.getAll()
      .then(setConsultas)
      .catch(() => {})
      .finally(() => setLoadingConsultas(false));
  }, []);

  const fetchProntuarios = useCallback(() => {
    setLoadingProntuarios(true);
    recordsApi.getProntuarios()
      .then(setProntuarios)
      .catch(() => {})
      .finally(() => setLoadingProntuarios(false));
  }, []);

  const fetchRetornos = useCallback(() => {
    setLoadingRetornos(true);
    retornosApi.getAll()
      .then(setRetornos)
      .catch(() => {})
      .finally(() => setLoadingRetornos(false));
  }, []);

  useEffect(() => { fetchConsultas(); fetchProntuarios(); fetchRetornos(); }, [fetchConsultas, fetchProntuarios, fetchRetornos]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const d = await recordsApi.getProntuarioDetail(id);
      setDetail(d);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDarAlta = async (id: string) => {
    setGivingAlta(id);
    try {
      const updated = await recordsApi.darAlta(id);
      setProntuarios(prev => prev.map(p => String(p.id) === String(updated.id) ? updated : p));
      if (detail) setDetail({ ...detail, prontuario: updated });
    } catch {
    } finally {
      setGivingAlta(null);
    }
  };

  const filteredConsultas = consultas.filter(c =>
    (c.patientName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.medicoNome  ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProntuarios = prontuarios.filter(p =>
    (p.patientName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.medicoResponsavel ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRetornos = retornos.filter(r => {
    const matchSearch =
      (r.patientName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.medicoNome  ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.especialidade ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = retornoFilterStatus === 'TODOS' || r.status === retornoFilterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 p-10">
      <div>
        <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Registros Clínicos</h1>
        <p className="text-[#64748b]">Consultas realizadas e prontuários de internação.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([
          { id: 'consultas',   label: 'Consultas',   icon: <FileText size={15} />,      count: consultas.length },
          { id: 'prontuarios', label: 'Prontuários', icon: <BedDouble size={15} />,     count: prontuarios.length },
          { id: 'retornos',    label: 'Retornos',    icon: <CalendarClock size={15} />, count: retornos.filter(r => r.status === 'PENDENTE').length, badge: true },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id as any); setSearchTerm(''); setDetail(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
            <span className={`text-[11px] font-normal px-1.5 py-0.5 rounded-full ${t.badge && t.count > 0 ? 'bg-amber-100 text-amber-700 font-bold' : 'text-slate-400'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder={tab === 'consultas' ? 'Buscar por paciente ou médico...' : 'Buscar por paciente ou responsável...'}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ── Consultas ── */}
      {tab === 'consultas' && (
        <div className="space-y-3">
          {loadingConsultas ? (
            <p className="text-center py-12 text-slate-500">Carregando consultas...</p>
          ) : filteredConsultas.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-xl">
              <p className="text-slate-500">Nenhuma consulta registrada.</p>
            </div>
          ) : filteredConsultas.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                    <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                      <User size={13} /> {c.patientName || '—'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={11} /> Dr(a). {c.medicoNome || '—'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {c.data ? new Date(c.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </span>
                  </div>
                  {c.observacoes && (
                    <div className="mt-1">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Observações</p>
                      <p className="text-sm text-slate-700 line-clamp-2">{c.observacoes}</p>
                    </div>
                  )}
                  {c.conduta && (
                    <div className="mt-1">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Conduta</p>
                      <p className="text-sm text-slate-700 line-clamp-2">{c.conduta}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Prontuários ── */}
      {tab === 'prontuarios' && (
        <div className="space-y-3">
          {loadingProntuarios ? (
            <p className="text-center py-12 text-slate-500">Carregando prontuários...</p>
          ) : filteredProntuarios.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-xl">
              <p className="text-slate-500">Nenhum prontuário de internação encontrado.</p>
            </div>
          ) : filteredProntuarios.map(p => (
            <button
              key={p.id}
              onClick={() => openDetail(p.id)}
              className="w-full text-left bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-5 shadow-sm transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-50 text-rose-500 rounded-xl shrink-0">
                  <BedDouble size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-bold text-slate-900">{p.patientName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${riskStyleMap[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    <span>Dr(a). {p.medicoResponsavel}</span>
                    <span>Internado em {new Date(p.dataInternacao).toLocaleDateString('pt-BR')}</span>
                    {p.dataAlta && <span>Alta em {new Date(p.dataAlta).toLocaleDateString('pt-BR')}</span>}
                  </div>
                  {p.motivoInternacao && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">"{p.motivoInternacao}"</p>
                  )}
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Retornos ── */}
      {tab === 'retornos' && (
        <div className="space-y-4">
          {/* Status filter pills */}
          <div className="flex gap-2">
            {(['TODOS', 'PENDENTE', 'REALIZADO', 'CANCELADO'] as const).map(s => (
              <button
                key={s}
                onClick={() => setRetornoFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  retornoFilterStatus === s
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {s === 'TODOS' ? 'Todos' : s.charAt(0) + s.slice(1).toLowerCase()}
                {s !== 'TODOS' && (
                  <span className="ml-1 opacity-70">({retornos.filter(r => r.status === s).length})</span>
                )}
              </button>
            ))}
          </div>

          {loadingRetornos ? (
            <p className="text-center py-12 text-slate-500">Carregando retornos...</p>
          ) : filteredRetornos.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-xl">
              <p className="text-slate-500">Nenhum retorno encontrado.</p>
            </div>
          ) : filteredRetornos.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl shrink-0">
                  <CalendarClock size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                    <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                      <User size={13} /> {r.patientName || '—'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={11} /> Dr(a). {r.medicoNome || '—'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${retornoStatusStyle[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {r.especialidade && <span className="font-medium text-slate-700">{r.especialidade}</span>}
                    <span>Prazo: <span className="text-slate-700 font-medium">{r.prazo}</span></span>
                    <span>Criado em {r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                  {r.orientacoes && (
                    <p className="text-xs text-slate-400 mt-1 italic">"{r.orientacoes}"</p>
                  )}
                </div>
                {r.status === 'PENDENTE' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        await retornosApi.realizar(r.id);
                        setRetornos(prev => prev.map(x => String(x.id) === String(r.id) ? { ...x, status: 'REALIZADO' } : x));
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <CheckCircle2 size={13} /> Realizado
                    </button>
                    <button
                      onClick={async () => {
                        await retornosApi.cancelar(r.id);
                        setRetornos(prev => prev.map(x => String(x.id) === String(r.id) ? { ...x, status: 'CANCELADO' } : x));
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                    >
                      <XCircle size={13} /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detalhe do Prontuário ── */}
      <AnimatePresence>
        {(detail || loadingDetail) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {loadingDetail ? (
                <div className="p-12 text-center text-slate-500">Carregando...</div>
              ) : detail && (
                <>
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-900">{detail.prontuario.patientName}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${riskStyleMap[detail.prontuario.status]}`}>
                          {detail.prontuario.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">Dr(a). {detail.prontuario.medicoResponsavel}</p>
                    </div>
                    <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Info da internação */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Internação</p>
                        <p className="text-sm font-medium text-slate-900">
                          {new Date(detail.prontuario.dataInternacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      {detail.prontuario.dataAlta ? (
                        <div className="p-3 bg-emerald-50 rounded-xl">
                          <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Alta</p>
                          <p className="text-sm font-medium text-emerald-700">
                            {new Date(detail.prontuario.dataAlta).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-50 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Status</p>
                            <p className="text-sm font-medium text-rose-700">Internado</p>
                          </div>
                          <button
                            onClick={() => handleDarAlta(detail.prontuario.id)}
                            disabled={givingAlta === detail.prontuario.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 size={13} />
                            {givingAlta === detail.prontuario.id ? 'Aguarde...' : 'Dar Alta'}
                          </button>
                        </div>
                      )}
                    </div>

                    {detail.prontuario.motivoInternacao && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Motivo da Internação</p>
                        <p className="text-sm text-slate-700">{detail.prontuario.motivoInternacao}</p>
                      </div>
                    )}

                    {/* Lista de consultas */}
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <FileText size={15} className="text-blue-500" />
                        Consultas do paciente
                        <span className="text-xs font-normal text-slate-400">({detail.consultas.length})</span>
                      </h3>
                      {detail.consultas.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4 text-center">Nenhuma consulta registrada.</p>
                      ) : (
                        <div className="space-y-3">
                          {detail.consultas.map(c => (
                            <div key={c.id} className="border border-slate-100 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
                                <span>Dr(a). {c.medicoNome}</span>
                                <span>{c.data ? new Date(c.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                              </div>
                              {c.observacoes && (
                                <div className="mb-1">
                                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Observações</p>
                                  <p className="text-sm text-slate-700">{c.observacoes}</p>
                                </div>
                              )}
                              {c.conduta && (
                                <div>
                                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Conduta</p>
                                  <p className="text-sm text-slate-700">{c.conduta}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
