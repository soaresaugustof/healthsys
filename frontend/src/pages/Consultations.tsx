import React, { useState, useEffect, useCallback } from 'react';
import { Clock, UserCheck, Stethoscope, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Triagem, StaffMember } from '@/types/hospital';
import { triageApi, usersApi, getUserFromToken } from '@/services/api';
import { AtendimentoPage } from './AtendimentoPage';

const riskColors: Record<string, string> = {
  Vermelho: 'bg-rose-600',
  Laranja:  'bg-orange-500',
  Amarelo:  'bg-amber-400',
  Verde:    'bg-emerald-500',
  Azul:     'bg-blue-500',
};

const riskLabels: Record<string, string> = {
  Vermelho: 'Emergência',
  Laranja:  'Urgência Alta',
  Amarelo:  'Urgência Moderada',
  Verde:    'Urgência Baixa',
  Azul:     'Sem Urgência',
};

const riskOrder: Record<string, number> = {
  Vermelho: 0, Laranja: 1, Amarelo: 2, Verde: 3, Azul: 4,
};

const tempoAlvo: Record<string, string> = {
  Vermelho: 'Imediato', Laranja: '10 min', Amarelo: '60 min', Verde: '2h', Azul: '4h',
};

const EmptyState = ({ label }: { label: string }) => (
  <p className="text-sm text-slate-400 text-center py-6">{label}</p>
);

const TriageCard = ({ t, action }: { t: Triagem; action: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 border border-slate-100 rounded-xl bg-white hover:shadow-sm transition-shadow"
  >
    <div className="flex items-center justify-between mb-2">
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${riskColors[t.nivelRisco]}`}>
        {riskLabels[t.nivelRisco] ?? t.nivelRisco}
      </span>
      <span className="text-[10px] text-slate-400 flex items-center gap-1">
        <Clock size={10} />
        {new Date(t.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
    <p className="text-sm font-bold text-slate-900">{t.patientName || `Paciente #${t.patientId}`}</p>
    {t.queixaPrincipal && (
      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.queixaPrincipal}</p>
    )}
    <div className="mt-3 flex items-center justify-between">
      <span className="text-[10px] text-slate-400">
        Tempo-alvo: <span className="font-semibold text-slate-600">{tempoAlvo[t.nivelRisco]}</span>
      </span>
      {action}
    </div>
  </motion.div>
);

export const Consultations = () => {
  const [triagens, setTriagens]                 = useState<Triagem[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [assuming, setAssuming]                 = useState<string | null>(null);
  const [me, setMe]                             = useState<StaffMember | null>(null);
  const [finalizingTriage, setFinalizingTriage] = useState<Triagem | null>(null);

  const fetchData = useCallback(() => {
    const user = getUserFromToken();
    Promise.all([triageApi.getAll(), usersApi.getStaff()])
      .then(([triagesData, staffData]) => {
        setTriagens(triagesData);
        if (user) {
          const found = staffData.find(s => s.email === user.email) ?? null;
          setMe(found);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssume = async (triageId: string) => {
    if (!me || assuming) return;
    setAssuming(triageId);
    try {
      const updated = await triageApi.assignDoctor(triageId, { medicoId: String(me.id), medicoNome: me.nome });
      setTriagens(prev => prev.map(t => String(t.id) === String(updated.id) ? updated : t));
    } catch (error) {
      console.error('Erro ao assumir paciente:', error);
    } finally {
      setAssuming(null);
    }
  };

  if (finalizingTriage && me) {
    return (
      <AtendimentoPage
        triage={finalizingTriage}
        me={me}
        onFinished={updated => {
          setTriagens(prev => prev.map(t => String(t.id) === String(updated.id) ? updated : t));
          setFinalizingTriage(null);
        }}
        onBack={() => setFinalizingTriage(null)}
      />
    );
  }

  const waiting = triagens
    .filter(t => t.status === 'Pendente')
    .sort((a, b) => riskOrder[a.nivelRisco] - riskOrder[b.nivelRisco]);

  const mine = triagens
    .filter(t => t.status === 'Em Atendimento' && String(t.medicoId) === String(me?.id));

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Consultas</h1>
          <p className="text-[#64748b]">
            {me ? `Dr(a). ${me.nome}, selecione um paciente para iniciar o atendimento.` : 'Painel de atendimento médico.'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm font-medium">
          <Stethoscope size={16} />
          {waiting.length} aguardando médico
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <UserCheck size={16} className="text-orange-500" />
            Aguardando médico
            <span className="ml-auto text-xs font-normal text-slate-400">ordenado por risco</span>
          </h2>
          {loading ? (
            <EmptyState label="Carregando..." />
          ) : waiting.length === 0 ? (
            <EmptyState label="Nenhum paciente aguardando médico." />
          ) : (
            <div className="space-y-3">
              {waiting.map(t => (
                <TriageCard
                  key={t.id}
                  t={t}
                  action={
                    me ? (
                      <button
                        onClick={() => handleAssume(t.id)}
                        disabled={assuming === t.id}
                        className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-40"
                      >
                        {assuming === t.id ? 'Assumindo...' : 'Assumir paciente'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Sem permissão</span>
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Meus atendimentos
          </h2>
          {loading ? (
            <EmptyState label="Carregando..." />
          ) : !me ? (
            <EmptyState label="Usuário não encontrado no corpo médico." />
          ) : mine.length === 0 ? (
            <EmptyState label="Nenhum paciente em atendimento." />
          ) : (
            <div className="space-y-3">
              {mine.map(t => (
                <TriageCard
                  key={t.id}
                  t={t}
                  action={
                    <button
                      onClick={() => setFinalizingTriage(t)}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      Finalizar
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
