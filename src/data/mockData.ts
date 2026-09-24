import { Vehicle, MaintenanceRecord, MaintenanceRule } from '../types';

export const INITIAL_VEHICLES: Vehicle[] = [
  // MOTOCICLETAS ROCAM
  {
    id: 'moto-1',
    prefixo: 'M-01201',
    placa: 'BRA-2A19',
    tipo: 'MOTOCICLETA',
    marca: 'Triumph',
    modelo: 'Tiger 900 Rally Pro',
    ano: 2024,
    kmAtual: 14850,
    status: 'OPERACIONAL',
    pelotao: '1º Pelotão ROCAM - Alpha',
    batalhao: 'ROCAM',
    condutorPadrao: 'CB PM Alencar (RE 184.201-3)',
    dataUltimaAtualizacaoKm: '2026-09-20',
    observacoes: 'Viatura em excelente estado, adesivagem e sirene tática operacionais.'
  },
  {
    id: 'moto-2',
    prefixo: 'M-01202',
    placa: 'BRA-2A20',
    tipo: 'MOTOCICLETA',
    marca: 'Triumph',
    modelo: 'Tiger 900 Rally Pro',
    ano: 2024,
    kmAtual: 16120,
    status: 'OPERACIONAL',
    pelotao: '1º Pelotão ROCAM - Alpha',
    batalhao: 'ROCAM',
    condutorPadrao: 'SD PM Rocha (RE 192.341-9)',
    dataUltimaAtualizacaoKm: '2026-09-20',
    observacoes: 'Kit relação trocado com 12.000km.'
  },
  {
    id: 'moto-3',
    prefixo: 'M-01203',
    placa: 'BRA-3B45',
    tipo: 'MOTOCICLETA',
    marca: 'BMW',
    modelo: 'F 850 GS Premium',
    ano: 2023,
    kmAtual: 29800,
    status: 'OPERACIONAL',
    pelotao: '2º Pelotão ROCAM - Bravo',
    batalhao: 'ROCAM',
    condutorPadrao: '1º SGT PM Ferreira (RE 138.990-1)',
    dataUltimaAtualizacaoKm: '2026-09-19',
    observacoes: 'Viatura revisada e disponível para empenho operacional.'
  },
  {
    id: 'moto-4',
    prefixo: 'M-01204',
    placa: 'BRA-3B46',
    tipo: 'MOTOCICLETA',
    marca: 'BMW',
    modelo: 'F 850 GS Premium',
    ano: 2023,
    kmAtual: 33450,
    status: 'OPERACIONAL',
    pelotao: '2º Pelotão ROCAM - Bravo',
    batalhao: 'ROCAM',
    condutorPadrao: 'CB PM Barbosa (RE 175.432-8)',
    dataUltimaAtualizacaoKm: '2026-09-20',
    observacoes: 'Óleo e filtro de motor próximos da troca preventiva.'
  },
  {
    id: 'moto-5',
    prefixo: 'M-01205',
    placa: 'BRA-5C78',
    tipo: 'MOTOCICLETA',
    marca: 'Yamaha',
    modelo: 'XT 660R Tática',
    ano: 2020,
    kmAtual: 58200,
    status: 'OPERACIONAL',
    pelotao: 'Pelotão de Apoio Tático',
    batalhao: 'ROCAM',
    condutorPadrao: 'SD PM Santos (RE 198.512-4)',
    dataUltimaAtualizacaoKm: '2026-09-18',
    observacoes: 'Viatura revisada e disponível para empenho operacional.'
  },
  {
    id: 'moto-6',
    prefixo: 'M-01206',
    placa: 'BRA-5C79',
    tipo: 'MOTOCICLETA',
    marca: 'Honda',
    modelo: 'XL 750 Transalp',
    ano: 2024,
    kmAtual: 9800,
    status: 'OPERACIONAL',
    pelotao: 'Pelotão de Escolta',
    batalhao: 'ROCAM',
    condutorPadrao: 'CB PM Oliveira (RE 169.882-5)',
    dataUltimaAtualizacaoKm: '2026-09-20',
    observacoes: 'Viatura de teste operacional recém-adquirida.'
  },
  {
    id: 'moto-7',
    prefixo: 'M-01207',
    placa: 'BRA-6D11',
    tipo: 'MOTOCICLETA',
    marca: 'Honda',
    modelo: 'XRE 300 Rally',
    ano: 2022,
    kmAtual: 42100,
    status: 'RESERVA',
    pelotao: 'Reserva Técnica Batalhão',
    batalhao: 'ROCAM',
    condutorPadrao: 'Reserva Técnica',
    dataUltimaAtualizacaoKm: '2026-09-15',
    observacoes: 'Disponível para substituição rápida em caso de avaria.'
  },

  // VIATURAS 04 RODAS ROCAM (Apoio Tático, CFP, Transporte de Peças/Motos)
  {
    id: 'car-1',
    prefixo: 'I-01250',
    placa: 'SP-ROC-1001',
    tipo: 'QUATRO_RODAS',
    marca: 'Chevrolet',
    modelo: 'Trailblazer V6 4x4 Tática',
    ano: 2023,
    kmAtual: 48920,
    status: 'OPERACIONAL',
    pelotao: 'Comando de Força Patrulha (CFP)',
    batalhao: 'ROCAM',
    condutorPadrao: 'TEN PM Medeiros / CB PM Souza',
    dataUltimaAtualizacaoKm: '2026-09-20',
    observacoes: 'Viatura blindada nível III-A de comando de pelotão.'
  },
  {
    id: 'car-2',
    prefixo: 'I-01251',
    placa: 'SP-ROC-1002',
    tipo: 'QUATRO_RODAS',
    marca: 'Toyota',
    modelo: 'Hilux CD 2.8 Diesel 4x4',
    ano: 2024,
    kmAtual: 27400,
    status: 'OPERACIONAL',
    pelotao: 'Apoio Tático ROCAM',
    batalhao: 'ROCAM',
    condutorPadrao: 'SGT PM Nogueira / SD PM Castro',
    dataUltimaAtualizacaoKm: '2026-09-20',
    observacoes: 'Equipada com suporte e rampa para recolhimento rápido de motos avariadas.'
  },
  {
    id: 'car-3',
    prefixo: 'I-01252',
    placa: 'SP-ROC-1003',
    tipo: 'QUATRO_RODAS',
    marca: 'Renault',
    modelo: 'Duster 1.3 Turbo Tce 4x4',
    ano: 2022,
    kmAtual: 63150,
    status: 'OPERACIONAL',
    pelotao: 'Supervisão de Oficial de Dia',
    batalhao: 'ROCAM',
    condutorPadrao: 'SUBTEN PM Cardoso',
    dataUltimaAtualizacaoKm: '2026-09-19',
    observacoes: 'Viatura revisada e disponível para empenho operacional.'
  },
  {
    id: 'car-4',
    prefixo: 'I-01253',
    placa: 'SP-ROC-1004',
    tipo: 'QUATRO_RODAS',
    marca: 'Mercedes-Benz',
    modelo: 'Sprinter Oficina Tática Móvel',
    ano: 2021,
    kmAtual: 71200,
    status: 'OPERACIONAL',
    pelotao: 'Logística e Manutenção Mecânica',
    batalhao: 'ROCAM',
    condutorPadrao: 'CB PM Mecânico Prado (RE 156.410-2)',
    dataUltimaAtualizacaoKm: '2026-09-20',
    observacoes: 'Oficina móvel para socorro e reparo rápido de motocicletas em campo.'
  }
];

export const INITIAL_RULES: MaintenanceRule[] = [
  {
    id: 'rule-1',
    categoria: 'OLEO_FILTRO',
    nomeItem: 'Troca de Óleo de Motor e Filtro (Motos)',
    tipoViatura: 'MOTOCICLETA',
    intervaloKm: 3000,
    intervaloMeses: 6,
    avisoAntecipadoKm: 400,
    descricao: 'Substituição do lubrificante 10W40/15W50 sintético e filtro de óleo.'
  },
  {
    id: 'rule-2',
    categoria: 'TRANSMISSAO_RELACAO',
    nomeItem: 'Kit Relação: Coroa, Pinhão e Corrente com Retentor',
    tipoViatura: 'MOTOCICLETA',
    intervaloKm: 12000,
    intervaloMeses: 12,
    avisoAntecipadoKm: 800,
    descricao: 'Inspeção de folga, desgaste dos dentes e substituição do kit completo.'
  },
  {
    id: 'rule-3',
    categoria: 'FREIOS',
    nomeItem: 'Pastilhas de Freio Dianteiro e Traseiro (Motos)',
    tipoViatura: 'MOTOCICLETA',
    intervaloKm: 7000,
    intervaloMeses: 6,
    avisoAntecipadoKm: 600,
    descricao: 'Inspeção da espessura das pastilhas sinterizadas e fluido DOT 4/5.1.'
  },
  {
    id: 'rule-4',
    categoria: 'PNEUS',
    nomeItem: 'Pares de Pneus (Dianteiro e Traseiro Motos)',
    tipoViatura: 'MOTOCICLETA',
    intervaloKm: 9000,
    intervaloMeses: 12,
    avisoAntecipadoKm: 700,
    descricao: 'Verificação do TWI, balanceamento de raios e calibração semanal.'
  },
  {
    id: 'rule-5',
    categoria: 'SUSPENSAO',
    nomeItem: 'Revisão de Suspensão e Óleo de Bengala',
    tipoViatura: 'MOTOCICLETA',
    intervaloKm: 15000,
    intervaloMeses: 12,
    avisoAntecipadoKm: 1000,
    descricao: 'Troca de fluído hidráulico da bengala e verificação de retentores.'
  },
  {
    id: 'rule-6',
    categoria: 'OLEO_FILTRO',
    nomeItem: 'Troca de Óleo e Filtros (Viaturas 04 Rodas)',
    tipoViatura: 'QUATRO_RODAS',
    intervaloKm: 10000,
    intervaloMeses: 6,
    avisoAntecipadoKm: 800,
    descricao: 'Troca de óleo diesel/flex 5W30, filtro de óleo, ar e combustível.'
  },
  {
    id: 'rule-7',
    categoria: 'FREIOS',
    nomeItem: 'Sistema de Freios e Discos (04 Rodas)',
    tipoViatura: 'QUATRO_RODAS',
    intervaloKm: 15000,
    intervaloMeses: 12,
    avisoAntecipadoKm: 1000,
    descricao: 'Substituição de pastilhas dianteiras/traseiras e inspeção de discos.'
  },
  {
    id: 'rule-8',
    categoria: 'PNEUS',
    nomeItem: 'Rodízio, Alinhamento e Balanceamento (04 Rodas)',
    tipoViatura: 'QUATRO_RODAS',
    intervaloKm: 10000,
    intervaloMeses: 6,
    avisoAntecipadoKm: 800,
    descricao: 'Geometria de suspensão tática, alinhamento e rodízio em X.'
  }
];

export const INITIAL_MAINTENANCE_RECORDS: MaintenanceRecord[] = [];

