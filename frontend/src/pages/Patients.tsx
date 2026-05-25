import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Mail, Phone, Pencil, MapPin, Loader2
} from 'lucide-react';
import { Select, DateInput } from '@/components/ui/FormFields';
import { motion, AnimatePresence } from 'motion/react';
import { Patient } from '@/types/hospital';
import { patientsApi } from '@/services/api';
import { phoneMask, cepMask } from '@/utils/masks';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

type FormData = Omit<Patient, 'id'>;

const emptyForm: FormData = {
  nome: '', dataNascimento: '', sexo: 'Masculino',
  telefone: '', email: '',
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '',
};

const inputClass = 'w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm';

export const Patients = () => {
  const [searchTerm, setSearchTerm]         = useState('');
  const [patients, setPatients]             = useState<Patient[]>([]);
  const [loading, setLoading]               = useState(true);
  const [isAdding, setIsAdding]             = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData]             = useState<FormData>(emptyForm);
  const [submitting, setSubmitting]         = useState(false);
  const [fetchingCep, setFetchingCep]       = useState(false);
  const [cepError, setCepError]             = useState('');

  const fetchPatients = useCallback(() => {
    patientsApi.getAll()
      .then(data => {
        setPatients(data.sort((a, b) => a.nome.localeCompare(b.nome)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const openAdd = () => {
    setFormData(emptyForm);
    setIsAdding(true);
  };

  const openEdit = (p: Patient) => {
    setFormData({
      nome: p.nome, dataNascimento: p.dataNascimento, sexo: p.sexo,
      telefone: p.telefone ?? '', email: p.email ?? '',
      cep: p.cep ?? '', logradouro: p.logradouro ?? '', numero: p.numero ?? '',
      complemento: p.complemento ?? '', bairro: p.bairro ?? '',
      cidade: p.cidade ?? '', estado: p.estado ?? '',
    });
    setEditingPatient(p);
  };

  const closeModal = () => {
    setIsAdding(false);
    setEditingPatient(null);
    setCepError('');
  };

  const set = (field: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleCepChange = async (raw: string) => {
    const masked = cepMask(raw);
    set('cep', masked);
    setCepError('');
    const digits = masked.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
      } else {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro ?? prev.logradouro,
          bairro:     data.bairro     ?? prev.bairro,
          cidade:     data.localidade ?? prev.cidade,
          estado:     data.uf         ?? prev.estado,
        }));
      }
    } catch {
      setCepError('Erro ao buscar CEP.');
    } finally {
      setFetchingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingPatient) {
        const updated = await patientsApi.update(editingPatient.id, formData);
        setPatients(prev => prev.map(p => p.id === updated.id ? updated : p).sort((a, b) => a.nome.localeCompare(b.nome)));
      } else {
        await patientsApi.create(formData);
        fetchPatients();
      }
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modalOpen = isAdding || !!editingPatient;

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Gestão de Pacientes</h1>
          <p className="text-[#64748b]">Cadastre e gerencie as informações dos pacientes.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Novo Paciente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#e2e8f0]">
                <th className="px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Paciente</th>
                <th className="px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Data de Nasc.</th>
                <th className="px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Sexo</th>
                <th className="px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Endereço</th>
                <th className="px-6 py-4 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Carregando pacientes...</td>
                </tr>
              ) : filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#eff6ff] text-[#2563eb] rounded-full flex items-center justify-center font-bold shrink-0">
                        {patient.nome.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-[#1e293b]">{patient.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(patient.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{patient.sexo}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {patient.telefone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone size={12} /> {patient.telefone}
                        </div>
                      )}
                      {patient.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Mail size={12} /> {patient.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {patient.cidade ? (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} />
                        {[patient.cidade, patient.estado].filter(Boolean).join(' — ')}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openEdit(patient)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filteredPatients.length === 0 && (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 text-slate-400 rounded-full mb-4">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhum paciente encontrado</h3>
            <p className="text-slate-500">Tente ajustar seus termos de busca.</p>
          </div>
        )}
      </div>

      {/* Modal criar / editar */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingPatient ? 'Editar Paciente' : 'Novo Cadastro'}
                </h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form className="overflow-y-auto flex-1 p-6 space-y-6" onSubmit={handleSubmit}>

                {/* ── Dados pessoais ── */}
                <section>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Dados Pessoais</p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                      <input required type="text" value={formData.nome}
                        onChange={e => set('nome', e.target.value)}
                        className={inputClass} placeholder="Ex: Maria Silva" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Data de Nascimento</label>
                        <DateInput required value={formData.dataNascimento}
                          onChange={e => set('dataNascimento', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Sexo</label>
                        <Select required value={formData.sexo}
                          onChange={e => set('sexo', e.target.value)}>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Outro">Outro</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Contato ── */}
                <section>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contato</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Telefone</label>
                      <input required type="tel" value={formData.telefone}
                        onChange={e => set('telefone', phoneMask(e.target.value))}
                        className={inputClass} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">E-mail</label>
                      <input type="email" value={formData.email}
                        onChange={e => set('email', e.target.value)}
                        className={inputClass} placeholder="email@exemplo.com" />
                    </div>
                  </div>
                </section>

                {/* ── Endereço ── */}
                <section>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Endereço <span className="normal-case font-normal">(opcional)</span>
                  </p>
                  <div className="space-y-3">
                    {/* CEP */}
                    <div className="flex gap-3 items-end">
                      <div className="space-y-1 w-44">
                        <label className="text-sm font-medium text-slate-700">CEP</label>
                        <div className="relative">
                          <input type="text" value={formData.cep}
                            onChange={e => handleCepChange(e.target.value)}
                            className={inputClass} placeholder="00000-000" maxLength={9} />
                          {fetchingCep && (
                            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                          )}
                        </div>
                        {cepError && <p className="text-xs text-rose-500">{cepError}</p>}
                      </div>
                      <p className="text-xs text-slate-400 pb-2">CEP preenchido automaticamente</p>
                    </div>

                    {/* Logradouro + Número */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-sm font-medium text-slate-700">Logradouro</label>
                        <input type="text" value={formData.logradouro}
                          onChange={e => set('logradouro', e.target.value)}
                          className={inputClass} placeholder="Rua, Avenida..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Número</label>
                        <input type="text" value={formData.numero}
                          onChange={e => set('numero', e.target.value)}
                          className={inputClass} placeholder="123" />
                      </div>
                    </div>

                    {/* Complemento */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Complemento</label>
                      <input type="text" value={formData.complemento}
                        onChange={e => set('complemento', e.target.value)}
                        className={inputClass} placeholder="Apto, Bloco, Casa..." />
                    </div>

                    {/* Bairro + Cidade + Estado */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Bairro</label>
                        <input type="text" value={formData.bairro}
                          onChange={e => set('bairro', e.target.value)}
                          className={inputClass} placeholder="Bairro" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Cidade</label>
                        <input type="text" value={formData.cidade}
                          onChange={e => set('cidade', e.target.value)}
                          className={inputClass} placeholder="Cidade" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Estado (UF)</label>
                        <Select value={formData.estado}
                          onChange={e => set('estado', e.target.value)}>
                          <option value="">UF</option>
                          {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </Select>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex gap-3 pt-2 shrink-0">
                  <button type="button" onClick={closeModal}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {submitting ? 'Salvando...' : editingPatient ? 'Salvar Alterações' : 'Salvar Paciente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
