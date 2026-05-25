import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  AlertTriangle,
  CalendarClock,
  FlaskConical,
  BedDouble,
  Stethoscope,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'motion/react';
import { patientsApi, triageApi, bedsApi, retornosApi, examesApi } from '@/services/api';

const buildChartData = (triages: any[]) => {
  const today = new Date().toISOString().split('T')[0];
  const slots: Record<string, number> = {};
  for (let h = 6; h <= 22; h += 2)
    slots[`${String(h).padStart(2, '0')}:00`] = 0;

  triages
    .filter(t => t.data?.startsWith(today))
    .forEach(t => {
      const hour = new Date(t.data).getHours();
      const key  = `${String(Math.floor(hour / 2) * 2).padStart(2, '0')}:00`;
      if (key in slots) slots[key]++;
    });

  return Object.entries(slots).map(([name, pacientes]) => ({ name, pacientes }));
};

const riskColors: Record<string, string> = {
  'Vermelho': 'bg-rose-100 text-rose-700',
  'Laranja':  'bg-orange-100 text-orange-700',
  'Amarelo':  'bg-amber-100 text-amber-700',
  'Verde':    'bg-emerald-100 text-emerald-700',
  'Azul':     'bg-slate-100 text-slate-700',
};

const riskLabels: Record<string, string> = {
  Vermelho: 'Emergência',
  Laranja:  'Urgência Alta',
  Amarelo:  'Urgência Moderada',
  Verde:    'Urgência Baixa',
  Azul:     'Sem Urgência',
};

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, isCritical }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-white border border-[#e2e8f0] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trendValue && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isCritical ? 'text-rose-600' : 'text-[#10b981]'}`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
        </div>
      )}
    </div>
    <h3 className="text-[13px] font-medium text-[#64748b] mb-2">{title}</h3>
    <p className="text-2xl font-bold text-[#1e293b]">{value}</p>
  </motion.div>
);

type Props = { onNavigate: (tab: string) => void; perfil?: string | null };

export const Dashboard = ({ onNavigate, perfil }: Props) => {
  const [chartData, setChartData]       = useState<{ name: string; pacientes: number }[]>([]);
  const [recentTriages, setRecentTriages] = useState<any[]>([]);
  const [stats, setStats] = useState({
    patients: 0, triagesPendentes: 0, aguardandoMedico: 0,
    leitosDisponiveis: 0, retornosPendentes: 0,
    examesSolicitados: 0, examesEmAndamento: 0, examesConcluidos: 0,
  });

  const isAdmin = !perfil || perfil === 'Admin';
  const isMedico     = perfil === 'Médico';
  const isEnfermeiro = perfil === 'Enfermeiro';
  const isRecep      = perfil === 'Recepcionista';
  const isLab        = perfil === 'Laboratorista';

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled([
        patientsApi.getAll(),
        triageApi.getAll(),
        bedsApi.getAll(),
        retornosApi.getPendentes(),
        examesApi.getAll(),
      ]);

      const patients = results[0].status === 'fulfilled' ? results[0].value : [];
      const triages  = results[1].status === 'fulfilled' ? results[1].value : [];
      const beds     = results[2].status === 'fulfilled' ? results[2].value : [];
      const retornos = results[3].status === 'fulfilled' ? results[3].value : [];
      const exames   = results[4].status === 'fulfilled' ? results[4].value : [];

      const today = new Date().toISOString().split('T')[0];

      setStats({
        patients:           patients.length,
        triagesPendentes:   triages.filter((t: any) => t.status === 'Pendente').length,
        aguardandoMedico:   triages.filter((t: any) => t.status === 'Pendente').length,
        leitosDisponiveis:  beds.filter((b: any) => b.status === 'Disponível').length,
        retornosPendentes:  retornos.length,
        examesSolicitados:  exames.filter((e: any) => e.status === 'SOLICITADO').length,
        examesEmAndamento:  exames.filter((e: any) => e.status === 'EM_ANDAMENTO').length,
        examesConcluidos:   exames.filter((e: any) => e.status === 'CONCLUIDO' && e.dataResultado?.startsWith(today)).length,
      });

      setChartData(buildChartData(triages));
      setRecentTriages(
        [...triages]
          .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
          .slice(0, 5)
      );
    };

    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  const subtitles: Record<string, string> = {
    'Médico':        'Suas consultas e internações em andamento.',
    'Enfermeiro':    'Triagens e leitos sob sua responsabilidade.',
    'Laboratorista': 'Exames pendentes e em andamento.',
    'Recepcionista': 'Fluxo de pacientes e atendimentos do dia.',
  };

  return (
    <div className="space-y-8 p-10">
      <div>
        <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Dashboard</h1>
        <p className="text-[#64748b]">{subtitles[perfil ?? ''] ?? 'Visão geral do HealthSys em tempo real.'}</p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        {(isAdmin || isRecep) && (
          <StatCard title="Total de Pacientes" value={stats.patients.toString()}
            icon={Users} trend="up" trendValue="12%" color="bg-blue-600" />
        )}

        {(isAdmin || isEnfermeiro || isRecep) && (
          <StatCard title="Triagens Pendentes" value={stats.triagesPendentes.toString()}
            icon={Stethoscope} color="bg-emerald-600" />
        )}

        {(isAdmin || isMedico) && (
          <StatCard title="Aguardando Médico" value={stats.aguardandoMedico.toString()}
            icon={AlertTriangle}
            trendValue={stats.aguardandoMedico > 5 ? 'Crítico' : undefined}
            isCritical={stats.aguardandoMedico > 5}
            color="bg-rose-600" />
        )}

        {(isAdmin || isMedico || isEnfermeiro) && (
          <StatCard title="Leitos Disponíveis" value={stats.leitosDisponiveis.toString()}
            icon={BedDouble} color="bg-purple-600" />
        )}

        {(isAdmin || isMedico) && (
          <StatCard title="Retornos Pendentes" value={stats.retornosPendentes.toString()}
            icon={CalendarClock}
            trendValue={stats.retornosPendentes > 0 ? 'Pendente' : undefined}
            isCritical={stats.retornosPendentes > 0}
            color="bg-amber-500" />
        )}

        {(isAdmin || isLab) && (
          <StatCard title="Exames Solicitados" value={stats.examesSolicitados.toString()}
            icon={FlaskConical}
            trendValue={stats.examesSolicitados > 0 ? 'Na fila' : undefined}
            isCritical={stats.examesSolicitados > 0}
            color="bg-violet-600" />
        )}

        {(isAdmin || isLab) && (
          <StatCard title="Exames em Andamento" value={stats.examesEmAndamento.toString()}
            icon={Activity} color="bg-sky-600" />
        )}

        {(isAdmin || isLab) && (
          <StatCard title="Concluídos Hoje" value={stats.examesConcluidos.toString()}
            icon={FlaskConical} color="bg-emerald-600" />
        )}
      </div>

      {/* ── Gráfico + triagens recentes (não mostrado para Laboratorista) ── */}
      {!isLab && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="p-6 bg-white border border-[#e2e8f0] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[#1e293b]">Fluxo de Pacientes (Hoje)</h3>
              <div className="flex items-center gap-2 text-sm text-[#64748b]">
                <span className="w-3 h-3 bg-[#2563eb] rounded-full"></span>
                Atendimentos
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="pacientes" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorPacientes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 bg-white border border-[#e2e8f0] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
            <h3 className="font-bold text-[#1e293b] mb-6">Triagens Recentes</h3>
            <div className="space-y-4">
              {recentTriages.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Nenhuma triagem recente.</p>
              ) : recentTriages.map((triage) => (
                <div key={triage.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#cbd5e1] rounded-full flex items-center justify-center font-bold text-slate-700">
                      {(triage.patientName || 'P').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1e293b]">{triage.patientName || 'Paciente'}</p>
                      <p className="text-xs text-[#64748b]">{new Date(triage.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${riskColors[triage.nivelRisco] || 'bg-slate-100 text-slate-700'}`}>
                    {riskLabels[triage.nivelRisco] ?? triage.nivelRisco}
                  </span>
                </div>
              ))}
            </div>
            {(isAdmin || isEnfermeiro || isRecep) && (
              <button onClick={() => onNavigate('triage')} className="w-full mt-6 py-2 text-sm font-medium text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors">
                Ver todas as triagens
              </button>
            )}
            {isMedico && (
              <button onClick={() => onNavigate('consultations')} className="w-full mt-6 py-2 text-sm font-medium text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors">
                Ver consultas →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Atalho rápido para Laboratorista ────────────────────── */}
      {isLab && (
        <div className="p-6 bg-white border border-[#e2e8f0] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] text-center">
          <FlaskConical size={32} className="mx-auto text-violet-500 mb-3" />
          <p className="text-sm text-slate-500 mb-4">Acesse a fila de exames para registrar resultados.</p>
          <button
            onClick={() => onNavigate('exames')}
            className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
          >
            Ir para Exames →
          </button>
        </div>
      )}
    </div>
  );
};
