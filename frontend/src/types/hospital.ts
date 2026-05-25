export type Patient = {
  id: string;
  nome: string;
  dataNascimento: string;
  sexo: 'Masculino' | 'Feminino' | 'Outro';
  telefone: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

export type Atendimento = {
  id: string;
  idPaciente: string;
  tipoAtendimento: string;
  data: string;
  observacoes: string;
};

export type Vacina = {
  id: string;
  idPaciente: string;
  nomeVacina: string;
  dataAplicacao: string;
};

export type StaffMember = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
};

export type Triagem = {
  id: string;
  patientId: string;
  patientName?: string;
  queixaPrincipal?: string;
  nivelRisco: 'Vermelho' | 'Laranja' | 'Amarelo' | 'Verde' | 'Azul';
  status: 'Pendente' | 'Em Atendimento' | 'Finalizado';
  data: string;
  medicoId?: string;
  medicoNome?: string;
  vitals?: {
    temp?: number | null;
    heartRate?: number | null;
    saturation?: number | null;
    pressure?: string | null;
    respiratoryRate?: number | null;
    glucose?: number | null;
    painScale?: number | null;
    consciousnessLevel?: string | null;
    weight?: number | null;
    height?: number | null;
  };
};

export type Leito = {
  id: string;
  setor: string;
  status: 'Disponível' | 'Ocupado' | 'Manutenção';
  pacienteId?: string | null;
  pacienteNome?: string | null;
  medicoId?: string | null;
  medicoNome?: string | null;
  prontuarioId?: string | null;
};

export type Consulta = {
  id: string;
  patientId: string;
  patientName: string;
  medicoNome: string;
  anamnese?: string;
  exameFisico?: string;
  hipoteseDiagnostica?: string;
  cid?: string;
  conduta?: string;
  observacoes?: string;
  prescricao?: string;
  encaminhamentos?: string;
  data: string;
};

export type Prontuario = {
  id: string;
  patientId: string;
  patientName: string;
  medicoResponsavel: string;
  motivoInternacao?: string;
  dataInternacao: string;
  dataAlta?: string;
  leitoId?: string;
  status: 'AGUARDANDO_LEITO' | 'ATIVO' | 'ALTA';
};

export type ProntuarioDetail = {
  prontuario: Prontuario;
  consultas: Consulta[];
};

export type Retorno = {
  id: string;
  patientId: string;
  patientName: string;
  medicoNome: string;
  prazo: string;
  especialidade: string;
  orientacoes?: string;
  status: 'PENDENTE' | 'REALIZADO' | 'CANCELADO';
  dataCriacao: string;
};

export type Exame = {
  id: string;
  patientId: string;
  patientName: string;
  medicoNome: string;
  tipoExame: string;
  urgencia: string;
  justificativa?: string;
  status: 'SOLICITADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  resultado?: string;
  tecnicoNome?: string;
  dataSolicitacao: string;
  dataResultado?: string;
};

export type Notification = {
  id: string;
  tipo: string;
  refId: string;
  patientName: string;
  nivelRisco: string;
  mensagem?: string;
  lida: boolean;
  criadaEm: string;
  destinatarioPerfil?: string;
  destinatarioNome?: string;
};
