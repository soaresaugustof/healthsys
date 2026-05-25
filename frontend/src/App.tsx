import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { Triage } from './pages/Triage';
import { Consultations } from './pages/Consultations';
import { Monitoring } from './pages/Monitoring';
import { Records } from './pages/Records';
import { Staff } from './pages/Staff';
import { RetornosPage } from './pages/RetornosPage';
import { ExamesPage } from './pages/ExamesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { Login } from './pages/Login';
import { getToken, getUserFromToken, usersApi, type AuthUser } from './services/api';
import type { StaffMember } from './types/hospital';
import { Activity } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Ops! Algo deu errado.</h2>
            <p className="text-slate-600 mb-6">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);

  const applyStaffMember = async (email: string) => {
    setStaffLoading(true);
    try {
      const staff = await usersApi.getAll();
      const me = staff.find(s => s.email === email) ?? null;
      setStaffMember(me);
      setActiveTab('dashboard');
    } catch {
      setStaffMember(null);
    } finally {
      await new Promise(r => setTimeout(r, 800));
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = getToken() ? getUserFromToken() : null;
    setUser(currentUser);
    setLoading(false);
    if (currentUser) applyStaffMember(currentUser.email);
  }, []);

  if (loading || staffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 bg-[#2563eb] rounded-[4px] flex items-center justify-center">
                <svg viewBox="0 0 16 16" fill="white" className="w-3 h-3">
                  <rect x="6" y="1" width="4" height="14" rx="1" />
                  <rect x="1" y="6" width="14" height="4" rx="1" />
                </svg>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-slate-700 font-semibold">HealthSys</p>
            <p className="text-slate-400 text-sm mt-1">Preparando seu acesso...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Login onLogin={(userData) => {
        setUser(userData);
        setStaffMember(null);
        applyStaffMember(userData.email);
      }} />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':      return <Dashboard onNavigate={setActiveTab} perfil={staffMember?.perfil} />;
      case 'patients':       return <Patients />;
      case 'triage':         return <Triage />;
      case 'consultations':  return <Consultations />;
      case 'monitoring':     return <Monitoring />;
      case 'records':        return <Records />;
      case 'retornos':       return <RetornosPage me={staffMember} />;
      case 'exames':         return <ExamesPage />;
      case 'staff':          return <Staff />;
      case 'analytics':      return <AnalyticsPage />;
      default:               return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          perfil={staffMember?.perfil}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header setSidebarOpen={setSidebarOpen} user={user} staffMember={staffMember} onNavigate={setActiveTab} />

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{renderContent()}</div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
