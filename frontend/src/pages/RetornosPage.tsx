import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, CheckCircle2, XCircle, Clock, User, Stethoscope, RefreshCw, PlayCircle } from 'lucide-react';
import type { Retorno, StaffMember, Triagem } from '@/types/hospital';
import { retornosApi } from '@/services/api';
import { AtendimentoPage } from './AtendimentoPage';

type FilterStatus = 'TODOS' | 'PENDENTE' | 'REALIZADO' | 'CANCELADO';

const statusConfig = {
  PENDENTE:  { label: 'Pendente',  className: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400' },
  REALIZADO: { label: 'Realizado', className: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  CANCELADO: { label: 'Cancelado', className: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400' },
};

type Props = { me: StaffMember | null };

export const RetornosPage = ({ me }: Props) => {
  const [retornos, setRetornos]               = useState<Retorno[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [filter, setFilter]                   = useState<FilterStatus>('PENDENTE');
  const [actionId, setActionId]               = useState<string | null>(null);
  const [atendimento, setAtendimento]         = useState<Retorno | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await retornosApi.getAll();
      setRetornos(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (atendimento && me) {
    const fakeTriage: Triagem = {
      id: `retorno-${atendimento.id}`,
      patientId:   atendimento.patientId,
      patientName: atendimento.patientName,
      nivelRisco:  'Azul',
      status:      'Em Atendimento',
      data:        new Date().toISOString(),
    };
    return (
      <AtendimentoPage
        triage={fakeTriage}
        me={me}
        retornoOrigem={atendimento}
        onFinished={() => {
          setRetornos(prev => prev.map(r => r.id === atendimento.id ? { ...r, status: 'REALIZADO' } : r));
          setAtendimento(null);
        }}
        onBack={() => setAtendimento(null)}
      />
    );
  }

  const handleRealizar = async (id: string) => {
    setActionId(id);
    try {
      const updated = await retornosApi.realizar(id);
      setRetornos(prev => prev.map(r => r.id === id ? updated : r));
    } finally {
      setActionId(null);
    }
  };

  const handleCancelar = async (id: string) => {
    setActionId(id);
    try {
      const updated = await retornosApi.cancelar(id);
      setRetornos(prev => prev.map(r => r.id === id ? updated : r));
    } finally {
      setActionId(null);
    }
  };

  const filtered = filter === 'TODOS' ? retornos : retornos.filter(r => r.status === filter);
  const counts = {
    TODOS:     retornos.length,
    PENDENTE:  retornos.filter(r => r.status === 'PENDENTE').length,
    REALIZADO: retornos.filter(r => r.status === 'REALIZADO').length,
    CANCELADO: retornos.filter(r => r.status === 'CANCELADO').length,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CalendarClock size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Retornos Agendados</h1>
            <p className="text-sm text-slate-400">
              {counts.PENDENTE} pendente{counts.PENDENTE !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['TODOS', 'PENDENTE', 'REALIZADO', 'CANCELADO'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : statusConfig[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando retornos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarClock size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum retorno encontrado</p>
          <p className="text-xs mt-1">
            {filter === 'PENDENTE'
              ? 'Nenhum retorno pendente no momento.'
              : 'Nenhum retorno com este status.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(retorno => {
            const sc = statusConfig[retorno.status];
            return (
              <div
                key={retorno.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                    <p className="text-sm font-bold text-slate-900 truncate">{retorno.patientName}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${sc.className}`}>
                    {sc.label}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Stethoscope size={12} className="text-slate-400" />
                    <span className="font-medium">{retorno.especialidade || 'Especialidade não informada'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Clock size={12} className="text-slate-400" />
                    <span>Retornar em <strong>{retorno.prazo}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User size={12} className="text-slate-400" />
                    <span>Dr(a). {retorno.medicoNome}</span>
                  </div>
                  {retorno.orientacoes && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 italic">
                      "{retorno.orientacoes}"
                    </p>
                  )}
                </div>

                {retorno.status === 'PENDENTE' && (
                  <div className="flex flex-col gap-2 pt-1">
                    {me && (
                      <button
                        onClick={() => setAtendimento(retorno)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <PlayCircle size={13} />
                        Iniciar Consulta
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRealizar(retorno.id)}
                        disabled={actionId === retorno.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        Realizado
                      </button>
                      <button
                        onClick={() => handleCancelar(retorno.id)}
                        disabled={actionId === retorno.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
