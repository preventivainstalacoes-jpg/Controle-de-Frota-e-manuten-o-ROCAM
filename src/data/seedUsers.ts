import { UserProfile } from '../types';

export const DEFAULT_SALT = 'rocam_sec_salt_99';

// Pre-computed SHA-256 hash for "admin123:rocam_sec_salt_99"
export const ADMIN_DEFAULT_HASH = 'd6df2d28ea4e1b096a59e4c2685b9ce0119bba8300f5bd351d2c3d6ebe604e76';

// Pre-computed SHA-256 hash for "operador123:rocam_sec_salt_99"
export const OPERATOR_DEFAULT_HASH = 'c0097d2886c7f57c27f10f95bfdaa3c9ae9fb986eadc4b642bf429db99c5ca33';

export const MAX_ADMINS = 20;
export const MAX_OPERATORS = 300;

export const FIRST_ADMIN: UserProfile = {
  id: 'usr-admin-01',
  username: 'admin',
  email: 'admin.souza@policiamilitar.sp.gov.br',
  name: 'Cap PM Souza',
  graduacao: 'CAP PM',
  re: '000.001-0',
  role: 'ADMIN',
  pelotao: 'Comando & Logística ROCAM',
  passwordHash: ADMIN_DEFAULT_HASH,
  salt: DEFAULT_SALT,
  createdAt: '2026-01-01T08:00:00Z',
  isActive: true,
  status: 'ATIVO',
};

/**
 * 20 Administradores com Acesso Total (modelos / referência)
 */
export const SEED_ADMINS: UserProfile[] = [
  FIRST_ADMIN,
  {
    id: 'usr-admin-02',
    username: 'admin2',
    name: 'Maj PM Costa',
    graduacao: 'MAJ PM',
    re: '000.002-1',
    role: 'ADMIN',
    pelotao: 'Subcomando & Gestão Operacional',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-02T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-03',
    username: 'admin3',
    name: 'Cap PM Almeida',
    graduacao: 'CAP PM',
    re: '000.003-2',
    role: 'ADMIN',
    pelotao: '1ª Cia ROCAM - Coordenação',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-03T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-04',
    username: 'admin4',
    name: '1º Ten PM Ribeiro',
    graduacao: '1º TEN PM',
    re: '000.004-3',
    role: 'ADMIN',
    pelotao: 'Seção de Motomecanização & Frota',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-04T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-05',
    username: 'admin5',
    name: 'Cel PM Albuquerque',
    graduacao: 'CEL PM',
    re: '000.005-4',
    role: 'ADMIN',
    pelotao: 'Comando de Policiamento de Choque',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-05T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-06',
    username: 'admin6',
    name: 'Ten Cel PM Vasconcelos',
    graduacao: 'TEN CEL PM',
    re: '000.006-5',
    role: 'ADMIN',
    pelotao: 'Comando 1º BPChq ROCAM',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-06T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-07',
    username: 'admin7',
    name: 'Maj PM Ferreira',
    graduacao: 'MAJ PM',
    re: '000.007-6',
    role: 'ADMIN',
    pelotao: 'Coordenação Operacional & Doutrina',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-07T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-08',
    username: 'admin8',
    name: 'Cap PM Barbosa',
    graduacao: 'CAP PM',
    re: '000.008-7',
    role: 'ADMIN',
    pelotao: '2ª Cia ROCAM - Coordenação',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-08T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-09',
    username: 'admin9',
    name: 'Cap PM Carvalho',
    graduacao: 'CAP PM',
    re: '000.009-8',
    role: 'ADMIN',
    pelotao: '3ª Cia ROCAM - Coordenação',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-09T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-10',
    username: 'admin10',
    name: 'Cap PM Duarte',
    graduacao: 'CAP PM',
    re: '000.010-9',
    role: 'ADMIN',
    pelotao: 'Seção de Inteligência & Operações',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-10T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-11',
    username: 'admin11',
    name: '1º Ten PM Guimarães',
    graduacao: '1º TEN PM',
    re: '000.011-0',
    role: 'ADMIN',
    pelotao: 'Oficial de Suprimentos & Almoxarifado',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-11T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-12',
    username: 'admin12',
    name: '1º Ten PM Nogueira',
    graduacao: '1º TEN PM',
    re: '000.012-1',
    role: 'ADMIN',
    pelotao: 'Oficial Supervisor de Ordens de Serviço',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-12T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-13',
    username: 'admin13',
    name: '1º Ten PM Silveira',
    graduacao: '1º TEN PM',
    re: '000.013-2',
    role: 'ADMIN',
    pelotao: 'Oficial de Comunicações & Telemática',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-13T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-14',
    username: 'admin14',
    name: '2º Ten PM Medeiros',
    graduacao: '2º TEN PM',
    re: '000.014-3',
    role: 'ADMIN',
    pelotao: 'Gestão de Manutenções Preventivas',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-14T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-15',
    username: 'admin15',
    name: '2º Ten PM Cardoso',
    graduacao: '2º TEN PM',
    re: '000.015-4',
    role: 'ADMIN',
    pelotao: 'Supervisão de Turno Alfa',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-15T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-16',
    username: 'admin16',
    name: '2º Ten PM Antunes',
    graduacao: '2º TEN PM',
    re: '000.016-5',
    role: 'ADMIN',
    pelotao: 'Supervisão de Turno Bravo',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-16T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-17',
    username: 'admin17',
    name: 'Subten PM Borges',
    graduacao: 'SUBTEN PM',
    re: '000.017-6',
    role: 'ADMIN',
    pelotao: 'Encarregado Geral de Pátio & Frota',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-17T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-18',
    username: 'admin18',
    name: '1º Sgt PM Castro',
    graduacao: '1º SGT PM',
    re: '000.018-7',
    role: 'ADMIN',
    pelotao: 'Fiscalização de Cautelas & Despacho',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-18T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-19',
    username: 'admin19',
    name: '1º Sgt PM Machado',
    graduacao: '1º SGT PM',
    re: '000.019-8',
    role: 'ADMIN',
    pelotao: 'Fiscal de Oficina & Manutenção Externa',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-19T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
  {
    id: 'usr-admin-20',
    username: 'admin20',
    name: '1º Sgt PM Pacheco',
    graduacao: '1º SGT PM',
    re: '000.020-9',
    role: 'ADMIN',
    pelotao: 'Auditoria de Hodômetro e Abastecimento',
    passwordHash: ADMIN_DEFAULT_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2026-01-20T08:00:00Z',
    isActive: true,
    status: 'ATIVO',
  },
];

const SURNAMES = [
  'Oliveira', 'Silva', 'Santos', 'Souza', 'Pereira', 'Lima', 'Carvalho', 'Ferreira',
  'Ribeiro', 'Rodrigues', 'Almeida', 'Nascimento', 'Alves', 'Araujo', 'Ramos', 'Martins',
  'Rocha', 'Barbosa', 'Gomes', 'Dias', 'Moreira', 'Castro', 'Moura', 'Mendes',
  'Cavalcanti', 'Teixeira', 'Cardoso', 'Correia', 'Gonçalves', 'Monteiro', 'Nunes',
  'Barros', 'Freitas', 'Santana', 'Lopes', 'Vieira', 'Pinto', 'Carmo', 'Andrade',
  'Miranda', 'Coelho', 'Macedo', 'Borges', 'Duarte', 'Machado', 'Moraes', 'Pacheco',
  'Pinheiro', 'Fonseca', 'Campos', 'Rezende', 'Guimarães', 'Vasconcelos', 'Batista',
  'Brito', 'Farias', 'Cunha', 'Tavares', 'Barreto', 'Dantas', 'Figueiredo', 'Antunes',
];

const RANKS = ['CB PM', 'SD PM', '3º SGT PM', '2º SGT PM'];

const PELOTOES = [
  '1º Pelotão ROCAM',
  '2º Pelotão ROCAM',
  '3º Pelotão ROCAM',
  '4º Pelotão ROCAM',
  '5º Pelotão ROCAM',
  'Pelotão Escolta Tática ROCAM',
  'Grupamento de Apoio Tático ROCAM',
];

/**
 * Generate 300 Operadores com Acesso Limitado
 */
function generate300Operators(): UserProfile[] {
  const operators: UserProfile[] = [];

  for (let i = 1; i <= 300; i++) {
    const numStr = String(i).padStart(3, '0');
    const surname = SURNAMES[(i - 1) % SURNAMES.length];
    
    // Give rank according to distribution: 1..15 are 2º/3º Sgt, majority are Cb and Sd
    let rank = 'CB PM';
    if (i % 15 === 0) rank = '2º SGT PM';
    else if (i % 7 === 0) rank = '3º SGT PM';
    else if (i % 2 === 0) rank = 'SD PM';

    // Pelotão distribution
    const pelotao = PELOTOES[(i - 1) % PELOTOES.length];

    // Check digit calculation
    const digito = (i * 3 + 1) % 10;
    const re = `145.${numStr}-${digito}`;

    // Main operator alias
    let username = `op${numStr}`;
    let name = `${rank} ${surname}`;

    if (i === 1) {
      username = 'operador';
      name = 'Cb PM Oliveira';
    } else if (i === 2) {
      username = 'sd.silva';
      name = 'Sd PM Silva';
    }

    const email = `${username}@policiamilitar.sp.gov.br`;

    operators.push({
      id: `usr-operador-${numStr}`,
      username,
      email,
      name,
      graduacao: rank,
      re,
      role: 'OPERADOR',
      pelotao,
      passwordHash: OPERATOR_DEFAULT_HASH,
      salt: DEFAULT_SALT,
      createdAt: '2026-01-15T08:00:00Z',
      isActive: true,
      status: 'ATIVO',
    });
  }

  return operators;
}

export const SEED_OPERATORS: UserProfile[] = generate300Operators();

// Ensure all 20 admins have standard emails
SEED_ADMINS.forEach((adm) => {
  if (!adm.email) {
    adm.email = `${adm.username}@policiamilitar.sp.gov.br`;
  }
});

/**
 * Cadastro Inicial Padrão: Apenas o 1º Administrador Master
 * Capacidade suportada pelo sistema: até 20 Admins e até 300 Operadores
 */
export const INITIAL_USERS: UserProfile[] = [FIRST_ADMIN];
