import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, UserCog, Stethoscope, Users, Pencil, Trash2, FlaskConical, ConciergeBell, X } from 'lucide-react';
import { Select } from '@/components/ui/FormFields';
import { motion, AnimatePresence } from 'motion/react';
import { StaffMember } from '@/types/hospital';
import { usersApi } from '@/services/api';

const PERFIS = ['Médico', 'Enfermeiro', 'Recepcionista', 'Laboratorista', 'Admin'] as const;
type Perfil = typeof PERFIS[number];

const perfilColors: Record<string, string> = {
  'Médico':         'bg-blue-100 text-blue-700',
  'Enfermeiro':     'bg-emerald-100 text-emerald-700',
  'Recepcionista':  'bg-violet-100 text-violet-700',
  'Laboratorista':  'bg-amber-100 text-amber-700',
  'Admin':          'bg-purple-100 text-purple-700',
};

const perfilIcons: Record<string, React.ReactNode> = {
  'Médico':         <Stethoscope size={13} />,
  'Enfermeiro':     <Users size={13} />,
  'Recepcionista':  <ConciergeBell size={13} />,
  'Laboratorista':  <FlaskConical size={13} />,
  'Admin':          <UserCog size={13} />,
};

const emptyForm = { nome: '', email: '', senha: '', perfil: 'Médico' as string };

type EditingUser = StaffMember & { novaSenha: string };

export const Staff = () => {
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterPerfil, setFilterPerfil] = useState('');
  const [isAdding, setIsAdding]         = useState(false);
  const [editing, setEditing]           = useState<EditingUser | null>(null);
  const [deleting, setDeleting]         = useState<StaffMember | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [formData, setFormData]         = useState(emptyForm);

  const fetchStaff = useCallback(() => {
    usersApi.getAll()
      .then(data => { setStaff(data.sort((a, b) => a.nome.localeCompare(b.nome))); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersApi.create(formData);
      setIsAdding(false);
      setFormData(emptyForm);
      fetchStaff();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        nome:   editing.nome,
        email:  editing.email,
        perfil: editing.perfil,
      };
      if (editing.novaSenha.trim()) payload.senha = editing.novaSenha;
      await usersApi.update(editing.id, payload);
      setEditing(null);
      fetchStaff();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    try {
      await usersApi.delete(deleting.id);
      setDeleting(null);
      fetchStaff();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = staff.filter(s => {
    const matchName   = s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPerfil = !filterPerfil || s.perfil === filterPerfil;
    return matchName && matchPerfil;
  });

  const counts = PERFIS.reduce((acc, p) => {
    acc[p] = staff.filter(s => s.perfil === p).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#1e293b] tracking-[-0.5px]">Equipe</h1>
          <p className="text-[#64748b]">Gestão de usuários e perfis de acesso.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between xl:col-span-1">
          <span className="text-sm text-slate-600">Total</span>
          <span className="text-xl font-bold text-slate-700">{staff.length}</span>
        </div>
        {PERFIS.map(p => (
          <div key={p} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">{p}</span>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${perfilColors[p]}`}>{counts[p]}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Select
          value={filterPerfil}
          onChange={e => setFilterPerfil(e.target.value)}
          className="w-auto min-w-[160px]"
        >
          <option value="">Todos os perfis</option>
          {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Nenhum resultado encontrado.</td></tr>
            ) : filtered.map(member => (
              <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${perfilColors[member.perfil] ?? 'bg-slate-100 text-slate-600'}`}>
                      {member.nome.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{member.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{member.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${perfilColors[member.perfil] ?? 'bg-slate-100 text-slate-600'}`}>
                    {perfilIcons[member.perfil]}
                    {member.perfil}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditing({ ...member, novaSenha: '' })}
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleting(member)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo usuário */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Novo Usuário</h2>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form className="p-6 space-y-4" onSubmit={handleCreate}>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                  <input required type="text" value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Dr. João Silva" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">E-mail</label>
                  <input required type="email" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="joao@healthsys.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Senha</label>
                  <input required type="password" value={formData.senha}
                    onChange={e => setFormData({ ...formData, senha: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="••••••••" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Perfil</label>
                  <Select value={formData.perfil}
                    onChange={e => setFormData({ ...formData, perfil: e.target.value })}>
                    {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {submitting ? 'Salvando...' : 'Criar Usuário'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar usuário */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Editar Usuário</h2>
                <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form className="p-6 space-y-4" onSubmit={handleUpdate}>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                  <input required type="text" value={editing.nome}
                    onChange={e => setEditing({ ...editing, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">E-mail (login)</label>
                  <input required type="email" value={editing.email}
                    onChange={e => setEditing({ ...editing, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">
                    Nova Senha <span className="text-slate-400 font-normal">(deixe em branco para não alterar)</span>
                  </label>
                  <input type="password" value={editing.novaSenha}
                    onChange={e => setEditing({ ...editing, novaSenha: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="••••••••" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Perfil</label>
                  <Select value={editing.perfil}
                    onChange={e => setEditing({ ...editing, perfil: e.target.value })}>
                    {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setEditing(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {submitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Confirmar exclusão */}
      <AnimatePresence>
        {deleting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Excluir usuário?</h2>
                <p className="text-sm text-slate-600">
                  Tem certeza que deseja excluir <span className="font-semibold">{deleting.nome}</span>? Essa ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setDeleting(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleDelete} disabled={submitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50">
                    {submitting ? 'Excluindo...' : 'Excluir'}
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
