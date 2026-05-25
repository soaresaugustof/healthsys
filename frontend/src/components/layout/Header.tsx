import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Bell, X, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AuthUser } from '@/services/api';
import { notificationsApi, triageApi } from '@/services/api';
import type { Notification, StaffMember } from '@/types/hospital';

const riskColors: Record<string, string> = {
  Vermelho: 'bg-rose-500',
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

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

type HeaderProps = {
  setSidebarOpen: (open: boolean) => void;
  user: AuthUser;
  staffMember: StaffMember | null;
  onNavigate: (tab: string) => void;
};

export const Header = ({ setSidebarOpen, user, staffMember, onNavigate }: HeaderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [panelOpen, setPanelOpen]         = useState(false);
  const [allocating, setAllocating]       = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isForMe = (n: Notification) => {
    if (!staffMember) return true;
    if (n.destinatarioPerfil && n.destinatarioPerfil !== staffMember.perfil) return false;
    if (n.destinatarioNome   && n.destinatarioNome   !== staffMember.nome)   return false;
    return true;
  };

  const visible = notifications.filter(isForMe);
  const unread  = visible.filter(n => !n.lida).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch {
      // silently ignore if notification-service is unreachable
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const SSE_BASE = (import.meta as any).env?.VITE_SSE_URL ?? 'http://localhost:8086';
    const es = new EventSource(`${SSE_BASE}/api/notifications/subscribe`);

    es.addEventListener('notification', (e: MessageEvent) => {
      try {
        const incoming: Notification = JSON.parse(e.data);
        const normalized: Notification = {
          ...incoming,
          id: String(incoming.id),
          refId: String(incoming.refId),
        };
        setNotifications(prev =>
          prev.find(n => n.id === normalized.id) ? prev : [normalized, ...prev]
        );
      } catch {
        // malformed event — ignore
      }
    });

    es.onerror = () => {
      fetchNotifications();
    };

    return () => es.close();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    if (panelOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const handleAllocate = async (notification: Notification) => {
    if (!staffMember || allocating) return;
    setAllocating(notification.id);
    try {
      await triageApi.assignDoctor(notification.refId, {
        medicoId: String(staffMember.id),
        medicoNome: staffMember.nome,
      });
      await notificationsApi.markRead(notification.id);
      setNotifications(prev => prev.map(n =>
        n.id === notification.id ? { ...n, lida: true } : n
      ));
      onNavigate('consultations');
      setPanelOpen(false);
    } catch {
      // triage may already be assigned — mark as read anyway
      await notificationsApi.markRead(notification.id);
      setNotifications(prev => prev.map(n =>
        n.id === notification.id ? { ...n, lida: true } : n
      ));
    } finally {
      setAllocating(null);
    }
  };

  const handleDismiss = async (id: string) => {
    await notificationsApi.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-10 bg-white border-b border-[#e2e8f0]">
      <div className="flex items-center gap-4">
        <button
          className="p-2 -ml-2 text-slate-600 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen(prev => !prev)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {panelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50"
              >
                {/* Header do painel */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-900 text-sm">
                    Notificações
                    {unread > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full">
                        {unread} nova{unread > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  {unread > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      <CheckCheck size={13} />
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                {/* Lista */}
                <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                  {visible.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">
                      Nenhuma notificação.
                    </p>
                  ) : visible.map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 flex gap-3 transition-colors ${n.lida ? 'opacity-50' : 'bg-blue-50/40'}`}
                    >
                      <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        n.tipo === 'RETORNO_AGENDADO'      ? 'bg-emerald-400' :
                        n.tipo === 'INTERNACAO_SOLICITADA' ? 'bg-amber-400'   :
                        n.tipo === 'LEITO_ALOCADO'         ? 'bg-violet-500'  :
                        (riskColors[n.nivelRisco] ?? 'bg-slate-400')
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {n.patientName}
                        </p>
                        {n.tipo === 'LEITO_ALOCADO' ? (
                          <>
                            <p className="text-xs text-slate-500">{n.mensagem}</p>
                            {!n.lida && (
                              <button
                                onClick={() => { onNavigate('monitoring'); setPanelOpen(false); }}
                                className="mt-1.5 text-[11px] font-bold text-violet-600 hover:underline"
                              >
                                Ver prontuário →
                              </button>
                            )}
                          </>
                        ) : n.tipo === 'EXAME_SOLICITADO' ? (
                          <>
                            <p className="text-xs text-slate-500">{n.mensagem}</p>
                            {!n.lida && (
                              <button
                                onClick={() => { onNavigate('exames'); setPanelOpen(false); }}
                                className="mt-1.5 text-[11px] font-bold text-violet-600 hover:underline"
                              >
                                Ver exames →
                              </button>
                            )}
                          </>
                        ) : (n.tipo === 'RETORNO_AGENDADO' || n.tipo === 'INTERNACAO_SOLICITADA') ? (
                          <>
                            <p className="text-xs text-slate-500">{n.mensagem}</p>
                            {!n.lida && n.tipo === 'INTERNACAO_SOLICITADA' && (
                              <button
                                onClick={() => { onNavigate('monitoring'); setPanelOpen(false); }}
                                className="mt-1.5 text-[11px] font-bold text-amber-600 hover:underline"
                              >
                                Ver leitos →
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-slate-500">
                              {riskLabels[n.nivelRisco] ?? n.nivelRisco} · entrou na fila de espera
                            </p>
                            {!n.lida && (
                              <button
                                onClick={() => handleAllocate(n)}
                                disabled={allocating === n.id}
                                className="mt-1.5 text-[11px] font-bold text-blue-600 hover:underline disabled:opacity-40"
                              >
                                {allocating === n.id ? 'Alocando...' : 'Alocar agora →'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-slate-400">{timeAgo(n.criadaEm)}</span>
                        <button
                          onClick={() => handleDismiss(n.id)}
                          className="text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-slate-700">
            {staffMember?.nome ?? user.displayName}
          </span>
          {staffMember?.perfil && (
            <span className="text-xs text-slate-400">{staffMember.perfil}</span>
          )}
        </div>
        <div className="w-9 h-9 bg-[#cbd5e1] rounded-full flex items-center justify-center text-xs font-bold text-slate-700">
          {(staffMember?.nome ?? user.displayName).charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};
