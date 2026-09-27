export type VehicleType = 'MOTOCICLETA' | 'QUATRO_RODAS';

export type VehicleStatus = 'OPERACIONAL' | 'BAIXADA' | 'EM_MANUTENCAO' | 'RESERVA';

export type MaintenanceType = 'PREVENTIVA' | 'CORRETIVA';

export type MaintenanceStatus = 
  | 'AGENDADA' 
  | 'EM_EXECUCAO' 
  | 'AGUARDANDO_PECAS' 
  | 'CONCLUIDA' 
  | 'CANCELADA';

export type MaintenanceCategory =
  | 'OLEO_FILTRO'
  | 'TRANSMISSAO_RELACAO'
  | 'FREIOS'
  | 'PNEUS'
  | 'SUSPENSAO'
  | 'ELETRICA_SIRENE'
  | 'MOTOR_CAMBIO'
  | 'REVISAO_PERIODICA'
  | 'FUNILARIA_ESTRUTURA'
  | 'OUTROS';

export type AlertSeverity = 'CRITICO' | 'ATENCAO' | 'NORMAL';

export interface VehiclePartReplacement {
  id: string;
  nome: string;
  quantidade: number;
  codigoPeca?: string; // Código de patrimônio/almoxarifado
}

export interface Vehicle {
  id: string;
  prefixo: string; // Ex: M-01201, I-01250
  placa: string;
  tipo: VehicleType;
  marca: string;
  modelo: string;
  ano: number;
  kmAtual: number;
  horimetro?: number;
  status: VehicleStatus;
  pelotao: string; // Ex: 1º Pelotão ROCAM, 2º Pelotão ROCAM, Apoio Tático
  batalhao: string; // Ex: ROCAM
  motivoBaixa?: string;
  condutorPadrao?: string; // Nome de guerra e RE do PM responsável ou equipe
  dataUltimaAtualizacaoKm: string;
  observacoes?: string;
}

export type WorkshopType = 'INTERNA' | 'EXTERNA';

export interface MaintenanceRecord {
  id: string;
  numeroOS: string; // Ex: OS-2026-0034
  viaturaId: string;
  prefixoViatura: string;
  tipoViatura: VehicleType;
  tipoManutencao: MaintenanceType;
  categoria: MaintenanceCategory;
  status: MaintenanceStatus;
  dataEntrada: string; // YYYY-MM-DD
  dataConclusao?: string; // YYYY-MM-DD
  kmEntrada: number;
  descricaoProblema: string;
  servicosExecutados: string;
  pecasSubstituidas: VehiclePartReplacement[];
  tipoOficina?: WorkshopType; // 'INTERNA' (Mecânica ROCAM) ou 'EXTERNA' (Oficina Credenciada / Concessionária)
  oficinaResponsavel: string; // Ex: Mecânica ROCAM, Concessionária BMW Motorrad, Oficina Credenciada
  cnpjOficina?: string; // CNPJ da oficina externa
  numeroContratoEmpenho?: string; // Número do empenho ou contrato público
  mecanicoResponsavel: string;
  policialSolicitante: string; // Ex: 2º Sgt PM Silva
  matriculaRE: string; // Ex: 145.892-0
  urgencia: 'BAIXA' | 'MEDIA' | 'ALTA' | 'EMERGENCIAL';
}

export interface MaintenanceRule {
  id: string;
  categoria: MaintenanceCategory;
  nomeItem: string;
  tipoViatura: 'TODAS' | VehicleType;
  intervaloKm: number;
  intervaloMeses: number;
  avisoAntecipadoKm: number; // Ex: alertar 500km antes
  descricao: string;
}

export interface MaintenanceAlert {
  id: string;
  viaturaId: string;
  prefixoViatura: string;
  tipoViatura: VehicleType;
  modeloViatura: string;
  categoria: MaintenanceCategory;
  nomeItem: string;
  kmAtual: number;
  kmUltimaTroca: number;
  kmProximaTroca: number;
  kmRestante: number;
  dataUltimaTroca?: string;
  dataProximaTroca?: string;
  diasRestantes?: number;
  severidade: AlertSeverity;
  mensagem: string;
}

export interface DailyReportSummary {
  dataReferencia: string;
  totalViaturas: number;
  totalMotos: number;
  totalQuatroRodas: number;
  operacionais: number;
  baixadas: number;
  emManutencao: number;
  reserva: number;
  taxaProntidao: number; // percentual
  manutencoesHoje: MaintenanceRecord[];
  alertasCriticos: MaintenanceAlert[];
  viaturasBaixadas: Vehicle[];
}

export interface MonthlyReportSummary {
  mesAno: string; // YYYY-MM
  mesExtenso: string;
  totalServicos: number;
  preventivas: number;
  corretivas: number;
  servicosMotos: number;
  servicosQuatroRodas: number;
  servicosPorCategoria: { [key in MaintenanceCategory]?: number };
  viaturasMaisManutenidas: { prefixo: string; modelo: string; tipo: VehicleType; totalOS: number }[];
  pecasMaisUtilizadas: { nome: string; quantidade: number }[];
}

export type ChecklistCategory = 'MECANICA' | 'ELETRICA' | 'ESTRUTURA' | 'COMUNICACAO' | 'DOCUMENTOS';

export interface ChecklistItem {
  id: string;
  item: string;
  categoria: ChecklistCategory;
  conforme: boolean;
  observacao?: string;
}

export type CautelaStatus = 'EM_PATRULHAMENTO' | 'CONCLUIDA';

export interface DamagePhoto {
  id: string;
  dataUrl: string; // Base64 data URL compactado da foto
  legenda?: string; // Descrição da avaria observada (ex: "Arranhão profundo no para-lama dianteiro")
  momento: 'SAIDA' | 'RETORNO'; // Registrado na saída ou no retorno
  dataHora: string; // YYYY-MM-DDTHH:mm:ss
  itemChecklistId?: string; // Opcional: ID do item do checklist correlato
}

export interface CautelaRecord {
  id: string;
  numeroTermo: string; // Ex: CAUT-2026-0042
  viaturaId: string;
  prefixoViatura: string;
  tipoViatura: VehicleType;
  modeloViatura: string;
  placaViatura: string;
  pelotao: string;

  // Saída / Cautela
  dataHoraSaida: string; // YYYY-MM-DDTHH:mm
  kmSaida: number;
  combustivelSaida: 'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO';
  condutorNome: string;
  condutorRE: string;
  condutorGraduacao: string; // Ex: CB PM, SD PM, 1º SGT PM
  encarregadoVtr?: string;
  observacoesSaida?: string;
  checklistSaida: ChecklistItem[];
  fotosAvariasSaida?: DamagePhoto[]; // Registro fotográfico na saída

  // Retorno / Descautela
  status: CautelaStatus;
  dataHoraRetorno?: string; // YYYY-MM-DDTHH:mm
  kmRetorno?: number;
  kmPercorrido?: number;
  combustivelRetorno?: 'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO';
  recebedorNome?: string;
  recebedorRE?: string;
  observacoesRetorno?: string;
  checklistRetorno?: ChecklistItem[];
  houveAvaria?: boolean;
  descricaoAvaria?: string;
  viaturaBaixadaAposRetorno?: boolean;
  fotosAvariasRetorno?: DamagePhoto[]; // Registro fotográfico no retorno
}

export interface MonthlyBackupSummary {
  kmRodadosNoMes: number;
  cautelasRealizadas: number;
  cautelasComAvaria: number;
  manutencoesRealizadas: number;
  veiculosAtivos: number;
}

export interface MonthlyBackupData {
  exportDate: string;
  mesReferencia: string; // Ex: "2026-09"
  labelMes: string; // Ex: "Setembro / 2026"
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  rules: MaintenanceRule[];
  cautelas: CautelaRecord[];
}

export interface MonthlyBackup {
  id: string; // Ex: "mb-2026-09-1727284000"
  mesReferencia: string; // "2026-09"
  labelMes: string; // "Setembro / 2026"
  criadoEm: string; // ISO string
  tipo: 'AUTOMATICO' | 'MANUAL';
  totalViaturas: number;
  totalCautelas: number;
  totalManutencoes: number;
  totalRegras: number;
  tamanhoBytes: number;
  tamanhoFormatado: string;
  resumoMensal: MonthlyBackupSummary;
  dados: MonthlyBackupData;
}

export interface BackupScheduleConfig {
  autoBackupMonthlyEnabled: boolean;
  diaDoMesAgendado: number; // 1 = primeiro dia do mês, 28 = fechamento
  ultimoBackupAutomatico?: string; // ISO string da última execução
  ultimoMesBackupAutomatico?: string; // Ex: "2026-08" ou "2026-09"
  notificarNovoBackup: boolean;
}

export type UserRole = 'ADMIN' | 'OPERADOR';
export type UserAccountStatus = 'ATIVO' | 'PENDENTE' | 'INATIVO' | 'REJEITADO';

export interface UserProfile {
  id: string;
  username: string; // ex: 'admin', 'operador'
  name: string; // ex: 'Cap PM Souza', 'Cb PM Oliveira'
  re: string; // ex: '000.001-0'
  graduacao: string; // ex: 'CAP PM', 'CB PM', '1º SGT PM', etc.
  role: UserRole;
  pelotao: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
  status: UserAccountStatus;
  solicitadoEm?: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  motivoRejeicao?: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  username: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}

// ==========================================
// TRABALHO EM EQUIPE & COMPARTILHAMENTO
// ==========================================

export type TeamNoticeCategory =
  | 'PASSAGEM_SERVICO'    // Passagem de Serviço e Turno
  | 'ALERTA_OPERACIONAL'  // Alerta Tático / Operação
  | 'LOGISTICA_OFICINA'   // Oficina, Manutenção e Abastecimento
  | 'ORDEM_DO_DIA'        // Ordem do Dia do Comando
  | 'INFORMATIVO';        // Informações Gerais

export type TeamNoticePriority = 'URGENTE' | 'ALTA' | 'NORMAL' | 'INFORMATIVO';

export interface NoticeAcknowledgement {
  userId: string;
  userName: string;
  userRE: string;
  userGraduacao: string;
  acknowledgedAt: string; // ISO string
}

export interface TeamNotice {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: TeamNoticeCategory;
  prioridade: TeamNoticePriority;
  autorId: string;
  autorNome: string;
  autorRE: string;
  autorGraduacao: string;
  criadoEm: string;
  atualizadoEm?: string;
  fixado?: boolean;
  viaturaRelacionadaId?: string;
  viaturaRelacionadaPrefixo?: string;
  confirmacoes: NoticeAcknowledgement[]; // Quem deu QSL / Ciente
}

export interface TeamMessage {
  id: string;
  remetenteId: string;
  remetenteNome: string;
  remetenteRE: string;
  remetenteGraduacao: string;
  remetenteRole: UserRole;
  texto: string;
  viaturaId?: string;
  viaturaPrefixo?: string;
  criadoEm: string;
  tipo: 'TEXTO' | 'ALERTA_AVARIA' | 'CAUTELA_INICIADA' | 'DESCAUTELA_FINALIZADA' | 'HODOMETRO_ATUALIZADO';
}

export interface TeamActivityLog {
  id: string;
  tipo:
    | 'CAUTELA'
    | 'DESCAUTELA'
    | 'MANUTENCAO'
    | 'HODOMETRO'
    | 'AVARIA'
    | 'COMUNICADO'
    | 'SISTEMA';
  titulo: string;
  descricao: string;
  usuarioNome: string;
  usuarioRE: string;
  usuarioRole: UserRole;
  dataHora: string;
  badge?: string;
  linkTab?: string;
}

export interface TeamMemberPresence {
  userId: string;
  userName: string;
  userRE: string;
  graduacao: string;
  role: UserRole;
  pelotao: string;
  isOnline: boolean;
  statusServico: 'EM_SERVICO' | 'PATRULHAMENTO' | 'BASE_LOGISTICA' | 'FOLGA';
  viaturaAtual?: {
    id: string;
    prefixo: string;
    modelo: string;
  };
  ultimoAcesso: string;
}

