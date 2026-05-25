import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { authApi, setToken, getUserFromToken, type AuthUser } from '@/services/api';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await authApi.login(email, senha);
      setToken(token);
      const userData = getUserFromToken();
      if (userData) onLogin(userData);
    } catch {
      setError('Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-10 rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border border-[#e2e8f0]"
      >
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-6 h-6 bg-[#2563eb] rounded-[4px] flex items-center justify-center">
              <svg viewBox="0 0 16 16" fill="white" className="w-3.5 h-3.5">
                <rect x="6" y="1" width="4" height="14" rx="1" />
                <rect x="1" y="6" width="14" height="4" rx="1" />
              </svg>
            </div>
          <span className="text-[28px] font-extrabold text-[#2563eb] tracking-tight">HealthSys</span>
        </div>

        <h1 className="text-2xl font-bold text-[#1e293b] mb-2 text-center">Bem-vindo ao HealthSys</h1>
        <p className="text-[#64748b] mb-8 text-center text-sm">
          Faça login para acessar o sistema.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="usuario@hospital.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#2563eb] text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-60"
          >
            <LogIn size={20} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-xs text-[#94a3b8] uppercase tracking-[1px] font-bold">Acesso Restrito a Profissionais</p>
        </div>
      </motion.div>
    </div>
  );
};
