import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Users, Activity, BedDouble, FlaskConical, TrendingUp, BrainCircuit } from 'lucide-react';
import { analyticsApi } from '@/services/api';
import type {
  AnalyticsOverview, RiscoItem, VolumeData,
  RiscoHoraItem, BedOcupacao, DiagnosticoItem,
} from '@/services/api';

// ── KPI card ─────────────────────────────────────────────────────────────────

type KpiProps = { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string };
const KpiCard = ({ label, value, sub, icon: Icon, color }: KpiProps) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Tooltip customizado ───────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

export const AnalyticsPage = () => {
  const [overview,     setOverview]     = useState<AnalyticsOverview | null>(null);
  const [distribuicao, setDistribuicao] = useState<RiscoItem[]>([]);
  const [volume,       setVolume]       = useState<VolumeData | null>(null);
  const [riscoHora,    setRiscoHora]    = useState<RiscoHoraItem[]>([]);
  const [beds,         setBeds]         = useState<BedOcupacao[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modelos,      setModelos]      = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      analyticsApi.getOverview().then(setOverview),
      analyticsApi.getDistribuicao().then(setDistribuicao),
      analyticsApi.getVolume().then(d => { setVolume(d); if (d.modelos) setModelos(d.modelos); }),
      analyticsApi.getRiscoHora().then(d => { if (!d.semDados) setRiscoHora(d.dados); }),
      analyticsApi.getBedsOcupacao().then(setBeds),
      analyticsApi.getExamesDiagnosticos().then(setDiagnosticos),
    ]).finally(() => setLoading(false));
  }, []);

  // Mescla histórico + projeção para o gráfico de área
  const volumeChart = (() => {
    if (!volume) return [];
    const pts: Record<string, any>[] = volume.historico.map(h => ({
      data: h.data.slice(5), // MM-DD
      historico: h.total,
    }));
    // Sobreposição do último ponto histórico com o início da projeção
    if (volume.projecao.length > 0 && pts.length > 0) {
      pts[pts.length - 1].projecaoLinear = pts[pts.length - 1].historico;
      pts[pts.length - 1].projecaoKnn    = pts[pts.length - 1].historico;
    }
    volume.projecao.forEach(p => {
      pts.push({
        data: p.data.slice(5),
        projecaoLinear: p.regressaoLinear,
        projecaoKnn:    p.knn,
      });
    });
    return pts;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-400 text-sm animate-pulse">Carregando análises...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-10">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Analytics</h1>
        <p className="text-[#64748b]">Indicadores hospitalares com KNN e Regressão Linear.</p>
      </div>

      {/* KPIs */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Pacientes"       value={overview.totalPacientes}    icon={Users}      color="bg-blue-500" />
          <KpiCard label="Triagens hoje"   value={overview.triagensHoje}      icon={Activity}   color="bg-rose-500" />
          <KpiCard
            label="Leitos ocupados"
            value={`${overview.leitosOcupados}/${overview.totalLeitos}`}
            sub={`${overview.ocupacaoLeitos}% de ocupação`}
            icon={BedDouble}
            color="bg-amber-500"
          />
          <KpiCard label="Exames pendentes" value={overview.examesPendentes}  icon={FlaskConical} color="bg-violet-500" />
        </div>
      )}

      {/* Volume + Distribuição */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Gráfico de volume — ocupa 2/3 */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-800">Volume de Triagens — Histórico + Projeção 7 dias</h2>
            <TrendingUp size={15} className="text-slate-400" />
          </div>
          {modelos && (
            <p className="text-[11px] text-slate-400 mb-4 flex items-center gap-1">
              <BrainCircuit size={11} /> Modelos: {modelos}
            </p>
          )}
          {volumeChart.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">Dados insuficientes (mínimo 3 dias).</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={volumeChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gKnn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="historico"     name="Histórico"         stroke="#3b82f6" fill="url(#gHist)" strokeWidth={2} dot={false} connectNulls />
                <Area type="monotone" dataKey="projecaoLinear" name="Reg. Linear"      stroke="#10b981" fill="url(#gReg)"  strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls />
                <Area type="monotone" dataKey="projecaoKnn"    name="KNN (k=3)"        stroke="#f97316" fill="url(#gKnn)"  strokeWidth={2} dot={false} strokeDasharray="3 3" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pizza de distribuição por risco */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Distribuição por Nível de Risco</h2>
          {distribuicao.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">Sem dados.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={distribuicao} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {distribuicao.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {distribuicao.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ocupação de leitos + Top diagnósticos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Ocupação de Leitos por Setor</h2>
          {beds.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={beds} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="setor" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ocupados"    name="Ocupados"    fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disponiveis" name="Disponíveis" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="manutencao"  name="Manutenção"  fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Top Diagnósticos — Exames de Imagem (IA)</h2>
          <p className="text-[11px] text-slate-400 mb-4">Baseado nos laudos gerados pelo ai-service.</p>
          {diagnosticos.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">Nenhum exame classificado por IA ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={diagnosticos} layout="vertical" margin={{ top: 4, right: 16, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="diagnostico" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" name="Casos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Risco por hora — KNN classificação */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-bold text-slate-800">Nível de Risco Esperado por Hora do Dia</h2>
          <BrainCircuit size={14} className="text-violet-500" />
        </div>
        <p className="text-[11px] text-slate-400 mb-5">
          Classificação KNN treinada sobre histórico de triagens — predição para hoje.
        </p>
        {riscoHora.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Dados insuficientes para treinar o modelo (mínimo 10 triagens).</p>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
            {riscoHora.map(({ hora, riscoEsperado, cor }) => (
              <div key={hora} className="flex flex-col items-center gap-1">
                <div
                  className="w-full h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
                  style={{ background: cor }}
                  title={riscoEsperado}
                >
                  {riscoEsperado.slice(0, 3)}
                </div>
                <span className="text-[10px] text-slate-400">{hora}h</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
