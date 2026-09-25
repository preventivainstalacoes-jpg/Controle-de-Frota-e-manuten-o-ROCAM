import { Vehicle, MaintenanceRecord, MaintenanceRule, CautelaRecord } from '../types';

export interface DatabaseStats {
  totalRecords: number;
  vehiclesCount: number;
  maintenanceCount: number;
  cautelasCount: number;
  rulesCount: number;
  estimatedBytes: number;
  estimatedSizeFormatted: string;
  lastUpdated: string;
}

/**
 * Calculates storage size and counts of the current local database
 */
export function calculateDatabaseStats(
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  rules: MaintenanceRule[],
  cautelas: CautelaRecord[]
): DatabaseStats {
  const data = { vehicles, maintenanceRecords, rules, cautelas };
  const jsonStr = JSON.stringify(data);
  const bytes = new Blob([jsonStr]).size;

  let formatted = `${bytes} B`;
  if (bytes > 1024 * 1024) {
    formatted = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes > 1024) {
    formatted = `${(bytes / 1024).toFixed(1)} KB`;
  }

  return {
    totalRecords: vehicles.length + maintenanceRecords.length + rules.length + cautelas.length,
    vehiclesCount: vehicles.length,
    maintenanceCount: maintenanceRecords.length,
    cautelasCount: cautelas.length,
    rulesCount: rules.length,
    estimatedBytes: bytes,
    estimatedSizeFormatted: formatted,
    lastUpdated: new Date().toLocaleDateString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  };
}

/**
 * Generates an ANSI SQL / SQLite / PostgreSQL / MySQL compatible dump file
 */
export function generateSQLDump(
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  rules: MaintenanceRule[],
  cautelas: CautelaRecord[]
): string {
  const now = new Date().toISOString();
  let sql = `-- =========================================================================\n`;
  sql += `-- ROCAM FROTA - SCRIPT DE BANCO DE DADOS SQL\n`;
  sql += `-- Gerado automaticamente em: ${now}\n`;
  sql += `-- Compatível com SQLite, PostgreSQL e MySQL / MariaDB\n`;
  sql += `-- =========================================================================\n\n`;

  // Tabela: viaturas
  sql += `-- -----------------------------------------------------\n`;
  sql += `-- Tabela: viaturas\n`;
  sql += `-- -----------------------------------------------------\n`;
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

  // Tabela: regras_manutencao
  sql += `-- -----------------------------------------------------\n`;
  sql += `-- Tabela: regras_manutencao\n`;
  sql += `-- -----------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS regras_manutencao (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  tipo_viatura VARCHAR(32) NOT NULL,\n`;
  sql += `  categoria VARCHAR(64) NOT NULL,\n`;
  sql += `  nome_item VARCHAR(128) NOT NULL,\n`;
  sql += `  intervalo_km INT NOT NULL,\n`;
  sql += `  intervalo_meses INT NOT NULL DEFAULT 6,\n`;
  sql += `  aviso_antecipado_km INT NOT NULL DEFAULT 500,\n`;
  sql += `  descricao TEXT\n`;
  sql += `);\n\n`;

  // Tabela: manutencoes
  sql += `-- -----------------------------------------------------\n`;
  sql += `-- Tabela: manutencoes\n`;
  sql += `-- -----------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS manutencoes (\n`;
  sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
  sql += `  viatura_id VARCHAR(64) NOT NULL,\n`;
  sql += `  prefixo_viatura VARCHAR(32) NOT NULL,\n`;
  sql += `  tipo_viatura VARCHAR(32) NOT NULL,\n`;
  sql += `  numero_os VARCHAR(32) NOT NULL,\n`;
  sql += `  tipo_manutencao VARCHAR(32) NOT NULL DEFAULT 'PREVENTIVA',\n`;
  sql += `  categoria VARCHAR(64) NOT NULL,\n`;
  sql += `  status VARCHAR(32) NOT NULL DEFAULT 'CONCLUIDA',\n`;
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
  sql += `  pecas_substituidas TEXT,\n`;
  sql += `  FOREIGN KEY (viatura_id) REFERENCES viaturas(id)\n`;
  sql += `);\n\n`;

  // Tabela: cautelas
  sql += `-- -----------------------------------------------------\n`;
  sql += `-- Tabela: cautelas\n`;
  sql += `-- -----------------------------------------------------\n`;
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
  sql += `  status VARCHAR(32) NOT NULL DEFAULT 'EM_PATRULHAMENTO',\n`;
  sql += `  data_hora_retorno VARCHAR(32),\n`;
  sql += `  km_retorno INT,\n`;
  sql += `  km_percorrido INT,\n`;
  sql += `  combustivel_retorno VARCHAR(16),\n`;
  sql += `  recebedor_nome VARCHAR(128),\n`;
  sql += `  recebedor_re VARCHAR(32),\n`;
  sql += `  observacoes_retorno TEXT,\n`;
  sql += `  houve_avaria BOOLEAN NOT NULL DEFAULT FALSE,\n`;
  sql += `  descricao_avaria TEXT,\n`;
  sql += `  viatura_baixada_apos_retorno BOOLEAN NOT NULL DEFAULT FALSE,\n`;
  sql += `  checklist_saida_json TEXT,\n`;
  sql += `  checklist_retorno_json TEXT,\n`;
  sql += `  FOREIGN KEY (viatura_id) REFERENCES viaturas(id)\n`;
  sql += `);\n\n`;

  const esc = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');

  // DML: Inserir Viaturas
  sql += `-- -----------------------------------------------------\n`;
  sql += `-- Registros da Tabela viaturas (${vehicles.length} registros)\n`;
  sql += `-- -----------------------------------------------------\n`;
  vehicles.forEach((v) => {
    sql += `INSERT INTO viaturas (id, prefixo, placa, marca, modelo, tipo, ano, km_atual, data_ultima_atualizacao_km, status, motivo_baixa, pelotao, batalhao, condutor_padrao, observacoes) VALUES (${esc(v.id)}, ${esc(v.prefixo)}, ${esc(v.placa)}, ${esc(v.marca)}, ${esc(v.modelo)}, ${esc(v.tipo)}, ${v.ano}, ${v.kmAtual}, ${esc(v.dataUltimaAtualizacaoKm)}, ${esc(v.status)}, ${esc(v.motivoBaixa)}, ${esc(v.pelotao)}, ${esc(v.batalhao)}, ${esc(v.condutorPadrao)}, ${esc(v.observacoes)});\n`;
  });
  sql += `\n`;

  // DML: Inserir Regras
  sql += `-- -----------------------------------------------------\n`;
  sql += `-- Registros da Tabela regras_manutencao (${rules.length} registros)\n`;
  sql += `-- -----------------------------------------------------\n`;
  rules.forEach((r) => {
    sql += `INSERT INTO regras_manutencao (id, tipo_viatura, categoria, nome_item, intervalo_km, intervalo_meses, aviso_antecipado_km, descricao) VALUES (${esc(r.id)}, ${esc(r.tipoViatura)}, ${esc(r.categoria)}, ${esc(r.nomeItem)}, ${r.intervaloKm}, ${r.intervaloMeses}, ${r.avisoAntecipadoKm}, ${esc(r.descricao)});\n`;
  });
  sql += `\n`;

  // DML: Inserir Manutenções
  sql += `-- -----------------------------------------------------\n`;
  sql += `-- Registros da Tabela manutencoes (${maintenanceRecords.length} registros)\n`;
  sql += `-- -----------------------------------------------------\n`;
  maintenanceRecords.forEach((m) => {
    const pecas = m.pecasSubstituidas && m.pecasSubstituidas.length > 0 ? JSON.stringify(m.pecasSubstituidas) : null;
    sql += `INSERT INTO manutencoes (id, viatura_id, prefixo_viatura, tipo_viatura, numero_os, tipo_manutencao, categoria, status, data_entrada, data_conclusao, km_entrada, descricao_problema, servicos_executados, tipo_oficina, oficina_responsavel, mecanico_responsavel, policial_solicitante, matricula_re, urgencia, pecas_substituidas) VALUES (${esc(m.id)}, ${esc(m.viaturaId)}, ${esc(m.prefixoViatura)}, ${esc(m.tipoViatura)}, ${esc(m.numeroOS)}, ${esc(m.tipoManutencao)}, ${esc(m.categoria)}, ${esc(m.status)}, ${esc(m.dataEntrada)}, ${esc(m.dataConclusao)}, ${m.kmEntrada}, ${esc(m.descricaoProblema)}, ${esc(m.servicosExecutados)}, ${esc(m.tipoOficina)}, ${esc(m.oficinaResponsavel)}, ${esc(m.mecanicoResponsavel)}, ${esc(m.policialSolicitante)}, ${esc(m.matriculaRE)}, ${esc(m.urgencia)}, ${esc(pecas || undefined)});\n`;
  });
  sql += `\n`;

  // DML: Inserir Cautelas
  sql += `-- -----------------------------------------------------\n`;
  sql += `-- Registros da Tabela cautelas (${cautelas.length} registros)\n`;
  sql += `-- -----------------------------------------------------\n`;
  cautelas.forEach((c) => {
    const chkSaida = c.checklistSaida ? JSON.stringify(c.checklistSaida) : null;
    const chkRetorno = c.checklistRetorno ? JSON.stringify(c.checklistRetorno) : null;
    sql += `INSERT INTO cautelas (id, numero_termo, viatura_id, prefixo_viatura, modelo_viatura, placa_viatura, tipo_viatura, pelotao, data_hora_saida, km_saida, combustivel_saida, condutor_nome, condutor_re, condutor_graduacao, encarregado_vtr, observacoes_saida, status, data_hora_retorno, km_retorno, km_percorrido, combustivel_retorno, recebedor_nome, recebedor_re, observacoes_retorno, houve_avaria, descricao_avaria, viatura_baixada_apos_retorno, checklist_saida_json, checklist_retorno_json) VALUES (${esc(c.id)}, ${esc(c.numeroTermo)}, ${esc(c.viaturaId)}, ${esc(c.prefixoViatura)}, ${esc(c.modeloViatura)}, ${esc(c.placaViatura)}, ${esc(c.tipoViatura)}, ${esc(c.pelotao)}, ${esc(c.dataHoraSaida)}, ${c.kmSaida}, ${esc(c.combustivelSaida)}, ${esc(c.condutorNome)}, ${esc(c.condutorRE)}, ${esc(c.condutorGraduacao)}, ${esc(c.encarregadoVtr)}, ${esc(c.observacoesSaida)}, ${esc(c.status)}, ${esc(c.dataHoraRetorno)}, ${c.kmRetorno || 'NULL'}, ${c.kmPercorrido || 'NULL'}, ${esc(c.combustivelRetorno)}, ${esc(c.recebedorNome)}, ${esc(c.recebedorRE)}, ${esc(c.observacoesRetorno)}, ${c.houveAvaria ? 'TRUE' : 'FALSE'}, ${esc(c.descricaoAvaria)}, ${c.viaturaBaixadaAposRetorno ? 'TRUE' : 'FALSE'}, ${esc(chkSaida || undefined)}, ${esc(chkRetorno || undefined)});\n`;
  });
  sql += `\n-- Fim do Dump SQL ROCAM\n`;

  return sql;
}

/**
 * Trigger download of SQL script
 */
export function downloadSQLFile(
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  rules: MaintenanceRule[],
  cautelas: CautelaRecord[]
) {
  const sql = generateSQLDump(vehicles, maintenanceRecords, rules, cautelas);
  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `banco_dados_rocam_frota_${dateStr}.sql`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads all database tables as separate CSV files
 */
export function downloadAllTablesCSV(
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[],
  cautelas: CautelaRecord[]
) {
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Viaturas CSV
  let vtrCsv = 'Prefixo;Placa;Marca;Modelo;Tipo;Ano;KM_Atual;Status;Pelotao;Condutor_Padrao;Motivo_Baixa\n';
  vehicles.forEach((v) => {
    vtrCsv += `"${v.prefixo}";"${v.placa}";"${v.marca}";"${v.modelo}";"${v.tipo}";${v.ano};${v.kmAtual};"${v.status}";"${v.pelotao}";"${v.condutorPadrao || ''}";"${v.motivoBaixa || ''}"\n`;
  });

  // 2. Cautelas CSV
  let cautelaCsv = 'Termo;Prefixo;Modelo;Placa;Condutor;RE;Graduacao;Pelotao;Status;Data_Saida;KM_Saida;Combustivel_Saida;Data_Retorno;KM_Retorno;KM_Percorrido;Combustivel_Retorno;Avaria;Baixada_Apos_Retorno\n';
  cautelas.forEach((c) => {
    cautelaCsv += `"${c.numeroTermo}";"${c.prefixoViatura}";"${c.modeloViatura}";"${c.placaViatura}";"${c.condutorNome}";"${c.condutorRE}";"${c.condutorGraduacao}";"${c.pelotao}";"${c.status}";"${c.dataHoraSaida}";${c.kmSaida};"${c.combustivelSaida}";"${c.dataHoraRetorno || ''}";${c.kmRetorno || ''};${c.kmPercorrido || ''};"${c.combustivelRetorno || ''}";"${c.houveAvaria ? 'SIM' : 'NAO'}";"${c.viaturaBaixadaAposRetorno ? 'SIM' : 'NAO'}"\n`;
  });

  // 3. Manutenções CSV
  let manCsv = 'Numero_OS;Viatura_ID;Prefixo;Tipo_Manutencao;Categoria;Status;KM_Entrada;Data_Entrada;Data_Conclusao;Oficina;Mecanico;Descricao_Problema;Servicos_Executados\n';
  maintenanceRecords.forEach((m) => {
    manCsv += `"${m.numeroOS}";"${m.viaturaId}";"${m.prefixoViatura}";"${m.tipoManutencao}";"${m.categoria}";"${m.status}";${m.kmEntrada};"${m.dataEntrada}";"${m.dataConclusao || ''}";"${m.oficinaResponsavel || ''}";"${m.mecanicoResponsavel || ''}";"${m.descricaoProblema.replace(/"/g, '""')}";"${m.servicosExecutados.replace(/"/g, '""')}"\n`;
  });

  // Download helper
  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  downloadBlob(vtrCsv, `tabela_viaturas_${dateStr}.csv`);
  setTimeout(() => downloadBlob(cautelaCsv, `tabela_cautelas_${dateStr}.csv`), 300);
  setTimeout(() => downloadBlob(manCsv, `tabela_manutencoes_${dateStr}.csv`), 600);
}
