import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  ChevronRight,
  Thermometer,
  Heart,
  Wind,
  Activity,
  AlertCircle,
  Droplets,
  Brain,
  Scale,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Triagem, Patient } from '@/types/hospital';
import { patientsApi, triageApi } from '@/services/api';
import { Select } from '@/components/ui/FormFields';
import { pressureMask } from '@/utils/masks';

const riskColors: Record<string, string> = {
  'Vermelho': 'bg-rose-600',
  'Laranja':  'bg-orange-500',
  'Amarelo':  'bg-amber-400',
  'Verde':    'bg-emerald-500',
  'Azul':     'bg-blue-500',
};

const riskLabels: Record<string, string> = {
  'Vermelho': 'Emergência',
  'Laranja':  'Urgência Alta',
  'Amarelo':  'Urgência Moderada',
  'Verde':    'Urgência Baixa',
  'Azul':     'Sem Urgência',
};

const tempoAlvo: Record<string, string> = {
  'Vermelho': 'Imediato',
  'Laranja':  '10 min',
  'Amarelo':  '60 min',
  'Verde':    '2h',
  'Azul':     '4h',
};

const PAIN_COLORS = [
  'bg-emerald-500', 'bg-emerald-500', 'bg-emerald-400', 'bg-emerald-400',
  'bg-amber-400',   'bg-amber-400',   'bg-amber-500',
  'bg-orange-500',  'bg-orange-500',  'bg-rose-500',    'bg-rose-600',
];

const CONSCIOUSNESS_LEVELS = [
  { value: 'Alerta',      desc: 'Orientado',          color: 'border-emerald-400 text-emerald-700 bg-emerald-50' },
  { value: 'Voz',         desc: 'Resp. verbal',        color: 'border-amber-400 text-amber-700 bg-amber-50'   },
  { value: 'Dor',         desc: 'Resp. à dor',         color: 'border-orange-400 text-orange-700 bg-orange-50' },
  { value: 'Irresponsivo',desc: 'Sem resposta',        color: 'border-rose-400 text-rose-700 bg-rose-50'      },
];

const emptyVitals = () => ({
  temp: '', heartRate: '', saturation: '', pressure: '',
  respiratoryRate: '', glucose: '', painScale: '', consciousnessLevel: '',
  weight: '', height: '',
});

type VitalsForm = ReturnType<typeof emptyVitals>;

const toApiVitals = (v: VitalsForm) => ({
  temp:              v.temp            ? parseFloat(v.temp)            : null,
  heartRate:         v.heartRate       ? parseInt(v.heartRate)         : null,
  saturation:        v.saturation      ? parseInt(v.saturation)        : null,
  pressure:          v.pressure        || null,
  respiratoryRate:   v.respiratoryRate ? parseInt(v.respiratoryRate)   : null,
  glucose:           v.glucose         ? parseFloat(v.glucose)         : null,
  painScale:         v.painScale       ? parseInt(v.painScale)         : null,
  consciousnessLevel: v.consciousnessLevel || null,
  weight:            v.weight          ? parseFloat(v.weight)          : null,
  height:            v.height          ? parseFloat(v.height)          : null,
});

export const Triage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [triagens, setTriagens] = useState<Triagem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [queixaPrincipal, setQueixaPrincipal] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [suggestedRisk, setSuggestedRisk] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vitals, setVitals] = useState(emptyVitals());

  const fetchData = useCallback(() => {
    Promise.all([triageApi.getAll(), patientsApi.getAll()])
      .then(([triagesData, patientsData]) => {
        setTriagens(triagesData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 10));
        setPatients(patientsData.sort((a, b) => a.nome.localeCompare(b.nome)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const imc = (() => {
    const w = parseFloat(vitals.weight);
    const h = parseFloat(vitals.height) / 100;
    if (!w || !h) return null;
    return (w / (h * h)).toFixed(1);
  })();

  const handleGoToClassification = async () => {
    setActiveStep(3);
    setLoadingSuggestion(true);
    try {
      const suggested = await triageApi.suggestRisk(toApiVitals(vitals));
      setSuggestedRisk(suggested);
      setSelectedRisk(suggested);
    } catch {
      setSuggestedRisk(null);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleFinishTriage = async () => {
    if (!selectedPatient || !selectedRisk || submitting) return;
    setSubmitting(true);
    try {
      await triageApi.create({
        patientId: selectedPatient.id,
        patientName: selectedPatient.nome,
        queixaPrincipal,
        nivelRisco: selectedRisk as Triagem['nivelRisco'],
        status: 'Pendente',
        data: new Date().toISOString(),
        vitals: toApiVitals(vitals),
      });
      setActiveStep(1);
      setSelectedPatient(null);
      setQueixaPrincipal('');
      setSelectedRisk(null);
      setSuggestedRisk(null);
      setVitals(emptyVitals());
      fetchData();
    } catch (error) {
      console.error('Erro ao registrar triagem:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const setV = (field: keyof ReturnType<typeof emptyVitals>, value: string) =>
    setVitals(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Triagem Médica</h1>
          <p className="text-[#64748b]">Classificação de risco — Protocolo de Manchester.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#eff6ff] text-[#2563eb] rounded-full text-sm font-medium">
          <Activity size={16} />
          {triagens.filter(t => t.status === 'Pendente').length} pacientes aguardando
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] overflow-hidden">

            {/* Stepper */}
            <div className="p-6 border-b border-[#e2e8f0] bg-slate-50/50">
              <div className="flex items-center gap-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      activeStep === step ? 'bg-[#2563eb] text-white' :
                      activeStep > step  ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {activeStep > step ? <CheckCircle2 size={18} /> : step}
                    </div>
                    <span className={`text-sm font-medium ${activeStep === step ? 'text-[#2563eb]' : 'text-slate-500'}`}>
                      {step === 1 ? 'Identificação' : step === 2 ? 'Sinais Vitais' : 'Classificação'}
                    </span>
                    {step < 3 && <ChevronRight size={16} className="text-slate-300" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8">

              {/* STEP 1 — Identificação */}
              {activeStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900">Identificação do Paciente</h3>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Paciente</label>
                    <Select
                      className="py-3"
                      value={selectedPatient?.id || ''}
                      onChange={(e) => {
                        const p = patients.find(p => String(p.id) === e.target.value);
                        setSelectedPatient(p || null);
                      }}
                    >
                      <option value="">Selecione um paciente...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </Select>
                  </div>

                  {selectedPatient && (
                    <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-xl">
                      <p className="text-sm font-bold text-blue-900">{selectedPatient.nome}</p>
                      <p className="text-xs text-blue-700">
                        Nascimento: {new Date(selectedPatient.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Queixa Principal</label>
                    <textarea
                      value={queixaPrincipal}
                      onChange={(e) => setQueixaPrincipal(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Descreva a queixa principal do paciente..."
                    />
                  </div>

                  <button
                    disabled={!selectedPatient}
                    onClick={() => setActiveStep(2)}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo: Sinais Vitais
                  </button>
                </motion.div>
              )}

              {/* STEP 2 — Sinais Vitais */}
              {activeStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-7">
                  <h3 className="text-lg font-bold text-slate-900">Sinais Vitais e Dados Clínicos</h3>

                  {/* Seção 1 — Sinais vitais principais */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sinais Vitais Principais</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Thermometer size={15} className="text-rose-500" /> Temperatura (°C)
                        </label>
                        <input type="number" step="0.1" value={vitals.temp}
                          onChange={e => setV('temp', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="36.5" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Heart size={15} className="text-rose-500" /> Freq. Cardíaca (bpm)
                        </label>
                        <input type="number" value={vitals.heartRate}
                          onChange={e => setV('heartRate', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="80" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Wind size={15} className="text-blue-500" /> Saturação O₂ (%)
                        </label>
                        <input type="number" value={vitals.saturation}
                          onChange={e => setV('saturation', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="98" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Activity size={15} className="text-emerald-500" /> Pressão Arterial (mmHg)
                        </label>
                        <input type="text" value={vitals.pressure}
                          onChange={e => setV('pressure', pressureMask(e.target.value))}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="120/80" />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2 — Avaliação clínica */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Avaliação Clínica</p>
                    <div className="space-y-4">

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Wind size={15} className="text-violet-500" /> Freq. Respiratória (irpm)
                          </label>
                          <input type="number" value={vitals.respiratoryRate}
                            onChange={e => setV('respiratoryRate', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="16" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Droplets size={15} className="text-amber-500" /> Glicemia Capilar (mg/dL)
                          </label>
                          <input type="number" value={vitals.glucose}
                            onChange={e => setV('glucose', e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="100" />
                        </div>
                      </div>

                      {/* Escala de Dor */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Escala de Dor
                          {vitals.painScale !== '' && (
                            <span className="ml-2 text-slate-500 font-normal">
                              — {vitals.painScale}/10
                              {Number(vitals.painScale) === 0 && ' (sem dor)'}
                              {Number(vitals.painScale) >= 1 && Number(vitals.painScale) <= 3 && ' (leve)'}
                              {Number(vitals.painScale) >= 4 && Number(vitals.painScale) <= 6 && ' (moderada)'}
                              {Number(vitals.painScale) >= 7 && Number(vitals.painScale) <= 8 && ' (intensa)'}
                              {Number(vitals.painScale) >= 9 && ' (insuportável)'}
                            </span>
                          )}
                        </label>
                        <div className="flex gap-1.5">
                          {Array.from({ length: 11 }, (_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setV('painScale', String(i))}
                              className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all border-2 ${
                                vitals.painScale === String(i)
                                  ? `${PAIN_COLORS[i]} text-white border-transparent scale-110 shadow-sm`
                                  : 'bg-slate-100 text-slate-500 border-transparent hover:border-slate-300'
                              }`}
                            >
                              {i}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                          <span>Sem dor</span>
                          <span>Insuportável</span>
                        </div>
                      </div>

                      {/* Nível de Consciência */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Nível de Consciência (AVDI)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {CONSCIOUSNESS_LEVELS.map(({ value, desc, color }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setV('consciousnessLevel', vitals.consciousnessLevel === value ? '' : value)}
                              className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 font-medium transition-all ${
                                vitals.consciousnessLevel === value
                                  ? `${color} border-current shadow-sm`
                                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className="text-sm font-bold">{value[0]}</span>
                              <span className="text-[11px] font-semibold mt-0.5">{value}</span>
                              <span className="text-[10px] font-normal opacity-75">{desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 3 — Antropometria */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados Antropométricos <span className="font-normal normal-case">(opcional)</span></p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Scale size={15} className="text-slate-500" /> Peso (kg)
                        </label>
                        <input type="number" step="0.1" value={vitals.weight}
                          onChange={e => setV('weight', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="70" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Scale size={15} className="text-slate-500" /> Altura (cm)
                        </label>
                        <input type="number" value={vitals.height}
                          onChange={e => setV('height', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="170" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">IMC</label>
                        <div className={`w-full px-4 py-2 border rounded-lg text-sm font-mono ${
                          imc ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-dashed border-slate-200 text-slate-400'
                        }`}>
                          {imc ? (
                            <>
                              {imc}
                              <span className="ml-1 text-xs font-sans text-slate-400">
                                {Number(imc) < 18.5 ? 'Baixo peso'
                                  : Number(imc) < 25   ? 'Normal'
                                  : Number(imc) < 30   ? 'Sobrepeso'
                                  : 'Obesidade'}
                              </span>
                            </>
                          ) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button onClick={() => setActiveStep(1)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                      Voltar
                    </button>
                    <button onClick={handleGoToClassification}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                      Próximo: Classificação
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 — Classificação */}
              {activeStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Classificação de Risco (Manchester)</h3>

                  {loadingSuggestion && (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                      <p className="text-xs text-slate-500">Analisando sinais vitais e dados clínicos...</p>
                    </div>
                  )}

                  {suggestedRisk && !loadingSuggestion && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <AlertCircle size={14} className="text-blue-500 shrink-0" />
                      <p className="text-xs text-blue-700">
                        <span className="font-bold">Sugestão pelos dados clínicos:</span>{' '}
                        <span>
                          <span className={`w-2 h-2 rounded-full inline-block mr-1 ${riskColors[suggestedRisk]}`} />
                          {riskLabels[suggestedRisk]} — atendimento em {tempoAlvo[suggestedRisk]}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(riskColors).map(([colorKey, color]) => (
                      <button
                        key={colorKey}
                        onClick={() => setSelectedRisk(colorKey)}
                        className={`flex items-center justify-between p-4 border rounded-xl transition-all ${
                          selectedRisk === colorKey
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full shrink-0 ${color}`} />
                          <span className="font-bold text-slate-700">{riskLabels[colorKey]}</span>
                          <span className="text-xs text-slate-400">({colorKey})</span>
                          {suggestedRisk === colorKey && selectedRisk !== colorKey && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                              sugerido
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-medium">{tempoAlvo[colorKey]}</span>
                          {selectedRisk === colorKey && <CheckCircle2 size={18} className="text-blue-500" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button onClick={() => setActiveStep(2)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                      Voltar
                    </button>
                    <button onClick={handleFinishTriage} disabled={!selectedRisk || submitting}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {submitting ? 'Criando...' : 'Criar Triagem'}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — Fila + Últimas Chamadas */}
        <div className="space-y-6">

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Fila de Atendimento</h3>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500 text-center py-4">Carregando fila...</p>
              ) : triagens.filter(t => t.status === 'Pendente').length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum paciente na fila.</p>
              ) : triagens.filter(t => t.status === 'Pendente').map((t) => (
                <div key={t.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${riskColors[t.nivelRisco]}`}>
                      {riskLabels[t.nivelRisco] ?? t.nivelRisco}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(t.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{t.patientName || `Paciente #${t.patientId}`}</p>
                  {t.queixaPrincipal && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.queixaPrincipal}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                    {t.vitals?.temp && (
                      <span className="text-[10px] text-slate-400">T: <span className="font-semibold text-slate-600">{t.vitals.temp}°C</span></span>
                    )}
                    {t.vitals?.heartRate && (
                      <span className="text-[10px] text-slate-400">FC: <span className="font-semibold text-slate-600">{t.vitals.heartRate}bpm</span></span>
                    )}
                    {t.vitals?.saturation && (
                      <span className="text-[10px] text-slate-400">Sat: <span className="font-semibold text-slate-600">{t.vitals.saturation}%</span></span>
                    )}
                    {t.vitals?.glucose && (
                      <span className="text-[10px] text-slate-400">Gli: <span className="font-semibold text-slate-600">{t.vitals.glucose}mg/dL</span></span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <span className="text-[10px] text-slate-400">Atender em: <span className="font-semibold text-slate-600">{tempoAlvo[t.nivelRisco]}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Últimas Chamadas</h3>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500 text-center py-4">Carregando...</p>
              ) : triagens.filter(t => t.status !== 'Pendente').length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum paciente chamado ainda.</p>
              ) : triagens.filter(t => t.status !== 'Pendente').slice(0, 5).map((t) => (
                <div key={t.id} className="p-3 border border-slate-100 rounded-xl bg-emerald-50/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${riskColors[t.nivelRisco]}`}>
                      {riskLabels[t.nivelRisco] ?? t.nivelRisco}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(t.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{t.patientName || `Paciente #${t.patientId}`}</p>
                  {t.queixaPrincipal && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.queixaPrincipal}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[10px] font-medium ${t.status === 'Em Atendimento' ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {t.status}
                    </span>
                    {t.medicoNome && (
                      <span className="text-[10px] text-slate-400">Dr(a). {t.medicoNome}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
