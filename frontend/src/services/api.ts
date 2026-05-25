import type { Patient, Triagem, Leito, StaffMember, Notification, Consulta, Prontuario, ProntuarioDetail, Retorno, Exame } from '../types/hospital';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8080';
const TOKEN_KEY = 'healthsys_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = (): void => localStorage.removeItem(TOKEN_KEY);

export const logout = (): void => {
  removeToken();
  window.location.reload();
};

export interface AuthUser {
  email: string;
  displayName: string;
}

export const getUserFromToken = (): AuthUser | null => {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const email: string = payload.sub || payload.email || '';
    if (!email) return null;
    return { email, displayName: email.split('@')[0] };
  } catch {
    return null;
  }
};

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  Object.assign(headers, options.headers);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let message: string;
      if (res.status === 401) {
        message = 'Sessão expirada. Faça login novamente.';
      } else if (res.status === 403) {
        message = 'Acesso negado.';
      } else if (res.status >= 500) {
        message = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
      } else {
        try {
          const json = JSON.parse(text);
          message = json.message || json.error || `Erro ${res.status}`;
        } catch {
          message = text || `Erro ${res.status}`;
        }
      }
      throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error(`Timeout ao chamar ${path} — verifique se o servidor está no ar.`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha: password }),
    }),
};

export const patientsApi = {
  getAll: () => apiFetch<Patient[]>('/api/patients'),
  create: (data: Omit<Patient, 'id'>) =>
    apiFetch<Patient>('/api/patients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Omit<Patient, 'id'>) =>
    apiFetch<Patient>(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export const triageApi = {
  getAll: () => apiFetch<Triagem[]>('/api/triage'),
  create: (data: Omit<Triagem, 'id'>) =>
    apiFetch<Triagem>('/api/triage', { method: 'POST', body: JSON.stringify(data) }),
  assignDoctor: (id: string | number, medico: { medicoId: string; medicoNome: string }) =>
    apiFetch<Triagem>(`/api/triage/${id}/assign`, { method: 'PATCH', body: JSON.stringify(medico) }),
  finishTriage: (id: string | number) =>
    apiFetch<Triagem>(`/api/triage/${id}/finish`, { method: 'PATCH' }),
  suggestRisk: (vitals: Triagem['vitals']) =>
    apiFetch<string>('/api/triage/suggest-risk', { method: 'POST', body: JSON.stringify(vitals) }),
};

export const usersApi = {
  getStaff: () => apiFetch<StaffMember[]>('/api/users/staff'),
  getAll: () => apiFetch<StaffMember[]>('/api/users'),
  create: (data: { nome: string; email: string; senha: string; perfil: string }) =>
    apiFetch<StaffMember>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nome?: string; email?: string; perfil?: string; senha?: string }) =>
    apiFetch<StaffMember>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' }),
};

export const bedsApi = {
  getAll: () => apiFetch<Leito[]>('/api/beds'),
  update: (id: string, data: Partial<Leito>) =>
    apiFetch<Leito>(`/api/beds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export const recordsApi = {
  // Consultas
  getAll: () => apiFetch<Consulta[]>('/api/records'),
  getByPatient: (patientId: string) => apiFetch<Consulta[]>(`/api/records/patient/${patientId}`),
  create: (data: { patientId?: string; patientName: string; medicoNome: string; anamnese?: string; exameFisico?: string; hipoteseDiagnostica?: string; cid?: string; conduta?: string; observacoes?: string; prescricao?: string; encaminhamentos?: string }) =>
    apiFetch<Consulta>('/api/records', { method: 'POST', body: JSON.stringify(data) }),

  // Prontuários / Internações
  getProntuarios: () => apiFetch<Prontuario[]>('/api/records/prontuarios'),
  getProntuarioDetail: (id: string | number) =>
    apiFetch<ProntuarioDetail>(`/api/records/prontuarios/${id}`),
  createInternacao: (data: { patientId?: string; patientName: string; medicoResponsavel: string; motivoInternacao: string }) =>
    apiFetch<Prontuario>('/api/records/internacao', { method: 'POST', body: JSON.stringify(data) }),
  darAlta: (id: string | number) =>
    apiFetch<Prontuario>(`/api/records/prontuarios/${id}/alta`, { method: 'PATCH' }),
  getInternacoesPendentes: () =>
    apiFetch<Prontuario[]>('/api/records/internacoes/aguardando'),
  internarPaciente: (id: string | number, leitoId: string) =>
    apiFetch<Prontuario>(`/api/records/internacoes/${id}/internar`, { method: 'PATCH', body: JSON.stringify({ leitoId }) }),
};

export const retornosApi = {
  getAll: () => apiFetch<Retorno[]>('/api/records/retornos'),
  getPendentes: () => apiFetch<Retorno[]>('/api/records/retornos/pendentes'),
  create: (data: { patientId?: string; patientName: string; medicoNome: string; prazo: string; especialidade: string; orientacoes?: string }) =>
    apiFetch<Retorno>('/api/records/retornos', { method: 'POST', body: JSON.stringify(data) }),
  realizar: (id: string | number) =>
    apiFetch<Retorno>(`/api/records/retornos/${id}/realizar`, { method: 'PATCH' }),
  cancelar: (id: string | number) =>
    apiFetch<Retorno>(`/api/records/retornos/${id}/cancelar`, { method: 'PATCH' }),
};

export const examesApi = {
  getAll: () => apiFetch<Exame[]>('/api/records/exames'),
  getByPatient: (patientId: string) => apiFetch<Exame[]>(`/api/records/exames/patient/${patientId}`),
  create: (data: { patientId?: string; patientName: string; medicoNome: string; tipoExame: string; urgencia: string; justificativa?: string }) =>
    apiFetch<Exame>('/api/records/exames', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string | number, status: string) =>
    apiFetch<Exame>(`/api/records/exames/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  registrarResultado: (id: string | number, resultado: string, tecnicoNome?: string) =>
    apiFetch<Exame>(`/api/records/exames/${id}/resultado`, { method: 'PATCH', body: JSON.stringify({ resultado, tecnicoNome }) }),
};

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalPacientes: number; totalTriagens: number; triagensHoje: number;
  internacoesAtivas: number; totalLeitos: number; leitosOcupados: number;
  ocupacaoLeitos: number; examesPendentes: number;
}
export interface RiscoItem    { name: string; value: number; color: string; }
export interface VolumeData   { historico: { data: string; total: number }[]; projecao: { data: string; regressaoLinear: number; knn: number }[]; semDados?: boolean; modelos?: string; }
export interface RiscoHoraItem { hora: number; riscoEsperado: string; cor: string; }
export interface BedOcupacao  { setor: string; disponiveis: number; ocupados: number; manutencao: number; total: number; pctOcupacao: number; }
export interface DiagnosticoItem { diagnostico: string; total: number; }

export const analyticsApi = {
  getOverview:           () => apiFetch<AnalyticsOverview>('/api/analytics/overview'),
  getDistribuicao:       () => apiFetch<RiscoItem[]>('/api/analytics/triage/distribuicao'),
  getVolume:             () => apiFetch<VolumeData>('/api/analytics/triage/volume'),
  getRiscoHora:          () => apiFetch<{ dados: RiscoHoraItem[]; semDados: boolean; modelo: string }>('/api/analytics/triage/risco-hora'),
  getBedsOcupacao:       () => apiFetch<BedOcupacao[]>('/api/analytics/beds/ocupacao'),
  getExamesDiagnosticos: () => apiFetch<DiagnosticoItem[]>('/api/analytics/exames/diagnosticos'),
};

export interface AiClassifyResult {
  diagnostico: string;
  probabilidade: string;
  detalhes: Record<string, string>;
}

export const aiApi = {
  classify: async (file: File): Promise<AiClassifyResult> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('imagem', file);
    // Não setar Content-Type manualmente — o browser define o boundary correto
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/api/ai/classify`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.');
    }
    return res.json();
  },
};

export const notificationsApi = {
  getAll: () => apiFetch<Notification[]>('/api/notifications'),
  markRead: (id: string | number) =>
    apiFetch<void>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiFetch<void>('/api/notifications/read-all', { method: 'PATCH' }),
  delete: (id: string | number) =>
    apiFetch<void>(`/api/notifications/${id}`, { method: 'DELETE' }),
};
