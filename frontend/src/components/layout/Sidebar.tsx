import React from 'react';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  ClipboardList,
  FileText,
  BedDouble,
  UserCog,
  LogOut,
  X,
  CalendarClock,
  FlaskConical,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/services/api';

type NavItemProps = {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  key?: string;
};

const NavItem = ({ icon: Icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1",
      active 
        ? "bg-[#eff6ff] text-[#2563eb]" 
        : "text-[#64748b] hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  perfil?: string | null;
};

const ALL_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',          icon: LayoutDashboard, perfis: null },
  { id: 'patients',      label: 'Pacientes',           icon: Users,           perfis: null },
  { id: 'triage',        label: 'Triagem',             icon: Stethoscope,     perfis: null },
  { id: 'consultations', label: 'Consultas',           icon: ClipboardList,   perfis: null },
  { id: 'monitoring',    label: 'Leitos',              icon: BedDouble,       perfis: null },
  { id: 'records',       label: 'Registros Clínicos',  icon: FileText,        perfis: null },
  { id: 'retornos',      label: 'Retornos',            icon: CalendarClock,   perfis: null },
  { id: 'exames',        label: 'Exames',              icon: FlaskConical,    perfis: null },
  { id: 'staff',         label: 'Equipe',              icon: UserCog,         perfis: null },
  { id: 'analytics',     label: 'Analytics',           icon: BarChart2,       perfis: null },
] as const;

// perfis === null → visível para todos; array → apenas os listados
const PERFIL_ITEMS: Record<string, readonly string[]> = {
  'Médico':        ['dashboard', 'consultations', 'monitoring', 'records', 'retornos'],
  'Enfermeiro':    ['dashboard', 'triage', 'monitoring', 'records'],
  'Laboratorista': ['dashboard', 'exames'],
  'Recepcionista': ['dashboard', 'patients'],
};

export const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen, perfil }: SidebarProps) => {
  const allowed = perfil ? (PERFIL_ITEMS[perfil] ?? null) : null;
  const menuItems = allowed
    ? ALL_ITEMS.filter(item => allowed.includes(item.id as string))
    : ALL_ITEMS;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-[#e2e8f0] transition-transform lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full py-8 px-6">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-[#2563eb] rounded-[4px] flex items-center justify-center">
                  <svg viewBox="0 0 16 16" fill="white" className="w-3 h-3">
                    <rect x="6" y="1" width="4" height="14" rx="1" />
                    <rect x="1" y="6" width="14" height="4" rx="1" />
                  </svg>
                </div>
              <span className="text-[22px] font-extrabold text-[#2563eb] tracking-tight">HealthSys</span>
            </div>
            <button className="lg:hidden" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            <div className="text-[11px] uppercase tracking-[1px] text-[#94a3b8] font-bold mb-3 px-4">Menu Principal</div>
            {menuItems.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
              />
            ))}
            
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <NavItem icon={LogOut} label="Sair" onClick={handleLogout} />
          </div>
        </div>
      </aside>
    </>
  );
};
