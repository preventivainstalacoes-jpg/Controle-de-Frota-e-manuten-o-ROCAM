import {
  Vehicle,
  MaintenanceRecord,
  MaintenanceRule,
  CautelaRecord,
  MonthlyBackup,
  MonthlyBackupSummary,
  BackupScheduleConfig,
} from '../types';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Converts "2026-09" to "Setembro / 2026"
 */
export function formatMonthLabel(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth || 'Mês Atual';
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthNum = parseInt(monthStr, 10);
  const name = MONTH_NAMES[monthNum - 1] || monthStr;
  return `${name} / ${yearStr}`;
}

/**
 * Calculates monthly operational and logistics metrics
 */
export function calculateMonthlySummary(
  mesReferencia: string,
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  cautelas: CautelaRecord[]
): MonthlyBackupSummary {
  // Cautelas of this month (saída started in this month)
  const cautelasDoMes = cautelas.filter((c) => c.dataHoraSaida.startsWith(mesReferencia));

  let kmRodadosNoMes = 0;
  let cautelasComAvaria = 0;

  cautelasDoMes.forEach((c) => {
    if (c.kmPercorrido && c.kmPercorrido > 0) {
      kmRodadosNoMes += c.kmPercorrido;
    } else if (c.kmRetorno && c.kmSaida && c.kmRetorno > c.kmSaida) {
      kmRodadosNoMes += c.kmRetorno - c.kmSaida;
    }
    if (c.houveAvaria) {
      cautelasComAvaria += 1;
    }
  });

  // Manutenções of this month
  const manutencoesDoMes = maintenanceRecords.filter((m) => m.dataEntrada.startsWith(mesReferencia));

  // Veículos ativos
  const veiculosAtivos = vehicles.filter(
    (v) => v.status === 'OPERACIONAL' || v.status === 'RESERVA'
  ).length;

  return {
    kmRodadosNoMes,
    cautelasRealizadas: cautelasDoMes.length,
    cautelasComAvaria,
    manutencoesRealizadas: manutencoesDoMes.length,
    veiculosAtivos,
  };
}

/**
 * Constructs a pristine MonthlyBackup snapshot
 */
export function buildMonthlyBackup(
  mesReferencia: string,
  tipo: 'AUTOMATICO' | 'MANUAL',
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  rules: MaintenanceRule[],
  cautelas: CautelaRecord[]
): MonthlyBackup {
  const agora = new Date().toISOString();
  const labelMes = formatMonthLabel(mesReferencia);
  const resumoMensal = calculateMonthlySummary(mesReferencia, vehicles, maintenanceRecords, cautelas);

  const dados = {
    exportDate: agora,
    mesReferencia,
    labelMes,
    vehicles,
    maintenanceRecords,
    rules,
    cautelas,
  };

  const jsonStr = JSON.stringify(dados);
  const bytes = new Blob([jsonStr]).size;

  let tamanhoFormatado = `${bytes} B`;
  if (bytes > 1024 * 1024) {
    tamanhoFormatado = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes > 1024) {
    tamanhoFormatado = `${(bytes / 1024).toFixed(1)} KB`;
  }

  const id = `backup-${mesReferencia}-${Date.now()}`;

  return {
    id,
    mesReferencia,
    labelMes,
    criadoEm: agora,
    tipo,
    totalViaturas: vehicles.length,
    totalCautelas: cautelas.length,
    totalManutencoes: maintenanceRecords.length,
    totalRegras: rules.length,
    tamanhoBytes: bytes,
    tamanhoFormatado,
    resumoMensal,
    dados,
  };
}

/**
 * Downloads a MonthlyBackup as JSON
 */
export function downloadMonthlyBackupFile(backup: MonthlyBackup): void {
  const filename = `backup_mensal_ROCAM_${backup.mesReferencia.replace('-', '_')}.json`;
  const blob = new Blob([JSON.stringify(backup.dados, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates SQL script specifically tagged for this monthly backup
 */
export function generateMonthlySQLDump(backup: MonthlyBackup): string {
  const { vehicles, maintenanceRecords, rules, cautelas } = backup.dados;
  const now = new Date(backup.criadoEm).toLocaleString('pt-BR');

  let sql = `-- =========================================================================\n`;
  sql += `-- ROCAM FROTA - BACKUP MENSAL DE BANCO DE DADOS (${backup.labelMes})\n`;
  sql += `-- Mês de Referência: ${backup.mesReferencia}\n`;
  sql += `-- Data de Gravação: ${now}\n`;
  sql += `-- Tipo de Backup: ${backup.tipo}\n`;
  sql += `-- Resumo Operacional do Mês:\n`;
  sql += `--   - Total de Viaturas na Frota: ${backup.totalViaturas}\n`;
  sql += `--   - Cautelas Realizadas no Mês: ${backup.resumoMensal.cautelasRealizadas}\n`;
  sql += `--   - Km Rodados no Mês: ${backup.resumoMensal.kmRodadosNoMes} km\n`;
  sql += `--   - Manutenções / O.S. no Mês: ${backup.resumoMensal.manutencoesRealizadas}\n`;
  sql += `--   - Avarias Notificadas no Mês: ${backup.resumoMensal.cautelasComAvaria}\n`;
  sql += `-- Compatível com SQLite, PostgreSQL e MySQL\n`;
  sql += `-- =========================================================================\n\n`;

  // Include DDL and DML
  sql += `CREATE TABLE IF NOT EXISTS viaturas (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  prefixo VARCHAR(32) NOT NULL UNIQUE,\n`;
  sql += `  placa VARCHAR(16) NOT NULL,\n`;
  sql += `  marca VARCHAR(64) NOT NULL,\n`;
  sql += `  modelo VARCHAR(64) NOT NULL,\n`;
  sql += `  tipo VARCHAR(32) NOT NULL,\n`;
  sql += `  ano INT NOT NULL,\n`;
  sql += `  km_atual INT NOT NULL DEFAULT 0,\n`;
  sql += `  data_ultima_atualizacao_km DATE,\n`;
  sql += `  status VARCHAR(32) NOT NULL DEFAULT 'OPERACIONAL',\n`;
  sql += `  motivo_baixa TEXT,\n`;
  sql += `  pelotao VARCHAR(64) NOT NULL,\n`;
  sql += `  batalhao VARCHAR(64) NOT NULL DEFAULT 'ROCAM',\n`;
  sql += `  condutor_padrao VARCHAR(128),\n`;
  sql += `  observacoes TEXT\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS manutencoes (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  viatura_id VARCHAR(64) NOT NULL,\n`;
  sql += `  prefixo_viatura VARCHAR(32) NOT NULL,\n`;
  sql += `  tipo_viatura VARCHAR(32) NOT NULL,\n`;
  sql += `  numero_os VARCHAR(32) NOT NULL,\n`;
  sql += `  tipo_manutencao VARCHAR(32) NOT NULL,\n`;
  sql += `  categoria VARCHAR(64) NOT NULL,\n`;
  sql += `  status VARCHAR(32) NOT NULL,\n`;
  sql += `  data_entrada DATE NOT NULL,\n`;
  sql += `  data_conclusao DATE,\n`;
  sql += `  km_entrada INT NOT NULL,\n`;
  sql += `  descricao_problema TEXT NOT NULL,\n`;
  sql += `  servicos_executados TEXT,\n`;
  sql += `  tipo_oficina VARCHAR(32),\n`;
  sql += `  oficina_responsavel VARCHAR(128),\n`;
  sql += `  mecanico_responsavel VARCHAR(128),\n`;
  sql += `  policial_solicitante VARCHAR(128),\n`;
  sql += `  matricula_re VARCHAR(32),\n`;
  sql += `  urgencia VARCHAR(32) NOT NULL DEFAULT 'MEDIA',\n`;
  sql += `  pecas_substituidas TEXT\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS cautelas (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  numero_termo VARCHAR(32) NOT NULL UNIQUE,\n`;
  sql += `  viatura_id VARCHAR(64) NOT NULL,\n`;
  sql += `  prefixo_viatura VARCHAR(32) NOT NULL,\n`;
  sql += `  modelo_viatura VARCHAR(64) NOT NULL,\n`;
  sql += `  placa_viatura VARCHAR(16) NOT NULL,\n`;
  sql += `  tipo_viatura VARCHAR(32) NOT NULL,\n`;
  sql += `  pelotao VARCHAR(64) NOT NULL,\n`;
  sql += `  data_hora_saida VARCHAR(32) NOT NULL,\n`;
  sql += `  km_saida INT NOT NULL,\n`;
  sql += `  combustivel_saida VARCHAR(16) NOT NULL,\n`;
  sql += `  condutor_nome VARCHAR(128) NOT NULL,\n`;
  sql += `  condutor_re VARCHAR(32) NOT NULL,\n`;
  sql += `  condutor_graduacao VARCHAR(32) NOT NULL,\n`;
  sql += `  encarregado_vtr VARCHAR(128),\n`;
  sql += `  observacoes_saida TEXT,\n`;
  sql += `  status VARCHAR(32) NOT NULL,\n`;
  sql += `  data_hora_retorno VARCHAR(32),\n`;
  sql += `  km_retorno INT,\n`;
  sql += `  km_percorrido INT,\n`;
  sql += `  combustivel_retorno VARCHAR(16),\n`;
  sql += `  recebedor_nome VARCHAR(128),\n`;
  sql += `  recebedor_re VARCHAR(32),\n`;
  sql += `  observacoes_retorno TEXT,\n`;
  sql += `  houve_avaria BOOLEAN DEFAULT 0,\n`;
  sql += `  descricao_avaria TEXT,\n`;
  sql += `  viatura_baixada BOOLEAN DEFAULT 0\n`;
  sql += `);\n\n`;

  // Inserts
  if (vehicles.length > 0) {
    sql += `-- Inserção de dados: viaturas\n`;
    vehicles.forEach((v) => {
      const escape = (val?: string) => (val ? `'${val.replace(/'/g, "''")}'` : 'NULL');
      sql += `INSERT INTO viaturas (id, prefixo, placa, marca, modelo, tipo, ano, km_atual, data_ultima_atualizacao_km, status, motivo_baixa, pelotao, condutor_padrao, observacoes) VALUES (\n`;
      sql += `  '${v.id}', '${v.prefixo}', '${v.placa}', ${escape(v.marca)}, ${escape(v.modelo)}, '${v.tipo}', ${v.ano}, ${v.kmAtual}, ${escape(v.dataUltimaAtualizacaoKm)}, '${v.status}', ${escape(v.motivoBaixa)}, ${escape(v.pelotao)}, ${escape(v.condutorPadrao)}, ${escape(v.observacoes)}\n`;
      sql += `) ON CONFLICT(id) DO UPDATE SET km_atual=excluded.km_atual, status=excluded.status;\n`;
    });
    sql += `\n`;
  }

  if (cautelas.length > 0) {
    sql += `-- Inserção de dados: cautelas\n`;
    cautelas.forEach((c) => {
      const escape = (val?: string) => (val ? `'${val.replace(/'/g, "''")}'` : 'NULL');
      sql += `INSERT INTO cautelas (id, numero_termo, viatura_id, prefixo_viatura, modelo_viatura, placa_viatura, tipo_viatura, pelotao, data_hora_saida, km_saida, combustivel_saida, condutor_nome, condutor_re, condutor_graduacao, encarregado_vtr, observacoes_saida, status, data_hora_retorno, km_retorno, km_percorrido, combustivel_retorno, recebedor_nome, recebedor_re, observacoes_retorno, houve_avaria, descricao_avaria, viatura_baixada) VALUES (\n`;
      sql += `  '${c.id}', '${c.numeroTermo}', '${c.viaturaId}', '${c.prefixoViatura}', ${escape(c.modeloViatura)}, '${c.placaViatura}', '${c.tipoViatura}', ${escape(c.pelotao)}, '${c.dataHoraSaida}', ${c.kmSaida}, '${c.combustivelSaida}', ${escape(c.condutorNome)}, '${c.condutorRE}', '${c.condutorGraduacao}', ${escape(c.encarregadoVtr)}, ${escape(c.observacoesSaida)}, '${c.status}', ${escape(c.dataHoraRetorno)}, ${c.kmRetorno ?? 'NULL'}, ${c.kmPercorrido ?? 'NULL'}, ${escape(c.combustivelRetorno)}, ${escape(c.recebedorNome)}, ${escape(c.recebedorRE)}, ${escape(c.observacoesRetorno)}, ${c.houveAvaria ? 1 : 0}, ${escape(c.descricaoAvaria)}, ${c.viaturaBaixadaAposRetorno ? 1 : 0}\n`;
      sql += `) ON CONFLICT(id) DO NOTHING;\n`;
    });
    sql += `\n`;
  }

  if (maintenanceRecords.length > 0) {
    sql += `-- Inserção de dados: manutencoes\n`;
    maintenanceRecords.forEach((m) => {
      const escape = (val?: string) => (val ? `'${val.replace(/'/g, "''")}'` : 'NULL');
      sql += `INSERT INTO manutencoes (id, viatura_id, prefixo_viatura, tipo_viatura, numero_os, tipo_manutencao, categoria, status, data_entrada, data_conclusao, km_entrada, descricao_problema, servicos_executados, tipo_oficina, oficina_responsavel, mecanico_responsavel, policial_solicitante, matricula_re, urgencia) VALUES (\n`;
      sql += `  '${m.id}', '${m.viaturaId}', '${m.prefixoViatura}', '${m.tipoViatura}', '${m.numeroOS}', '${m.tipoManutencao}', '${m.categoria}', '${m.status}', '${m.dataEntrada}', ${escape(m.dataConclusao)}, ${m.kmEntrada}, ${escape(m.descricaoProblema)}, ${escape(m.servicosExecutados)}, ${escape(m.tipoOficina)}, ${escape(m.oficinaResponsavel)}, ${escape(m.mecanicoResponsavel)}, ${escape(m.policialSolicitante)}, ${escape(m.matriculaRE)}, '${m.urgencia}'\n`;
      sql += `) ON CONFLICT(id) DO NOTHING;\n`;
    });
    sql += `\n`;
  }

  return sql;
}

/**
 * Downloads SQL dump for a specific monthly backup
 */
export function downloadMonthlySQLDump(backup: MonthlyBackup): void {
  const sql = generateMonthlySQLDump(backup);
  const filename = `backup_mensal_ROCAM_${backup.mesReferencia.replace('-', '_')}.sql`;
  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Evaluates whether an automated monthly backup should be triggered
 */
export function checkShouldRunMonthlyBackup(
  config: BackupScheduleConfig,
  existingBackups: MonthlyBackup[]
): { shouldRun: boolean; targetMonth: string } {
  if (!config.autoBackupMonthlyEnabled) {
    return { shouldRun: false, targetMonth: '' };
  }

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Also check previous month (completed month)
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Check if we have a backup for the previous month
  const hasPrevMonthBackup = existingBackups.some((b) => b.mesReferencia === prevYearMonth);
  if (!hasPrevMonthBackup) {
    return { shouldRun: true, targetMonth: prevYearMonth };
  }

  // Check if current month has any backup yet
  const hasCurrentMonthBackup = existingBackups.some((b) => b.mesReferencia === currentYearMonth);
  if (!hasCurrentMonthBackup) {
    return { shouldRun: true, targetMonth: currentYearMonth };
  }

  return { shouldRun: false, targetMonth: '' };
}
