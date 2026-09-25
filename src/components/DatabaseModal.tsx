import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { MonthlyBackup } from '../types';
import {
  Database,
  Download,
  Upload,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Trash2,
  X,
  Copy,
  Check,
  Server,
  Layers,
  ShieldCheck,
  Info,
  Calendar,
  CalendarClock,
  Clock,
  Archive,
  ArrowRight,
  PlusCircle,
  Shield,
  RotateCcw,
} from 'lucide-react';
import {
  calculateDatabaseStats,
  generateSQLDump,
  downloadSQLFile,
  downloadAllTablesCSV,
} from '../utils/databaseExporter';
import { formatMonthLabel } from '../utils/monthlyBackupEngine';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const {
    vehicles,
    maintenanceRecords,
    rules,
    cautelas,
    exportDatabaseJSON,
    importDatabaseJSON,
    clearAllRecords,
    resetToDefaultData,
    monthlyBackups,
    backupConfig,
    generateMonthlyBackupNow,
    restoreFromMonthlyBackup,
    deleteMonthlyBackupItem,
    updateBackupConfig,
    downloadBackupFile,
    downloadBackupSQL,
  } = useFleet();

  const [activeModalTab, setActiveModalTab] = useState<'estrutura' | 'backups-mensais'>('backups-mensais');
  const [showSqlPreview, setShowSqlPreview] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [importMessage, setImportMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Month generation selector state
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonthToBackup, setSelectedMonthToBackup] = useState<string>(currentYearMonth);
  const [isGenerating, setIsGenerating] = useState(false);

  // Restore confirmation modal
  const [backupToRestore, setBackupToRestore] = useState<MonthlyBackup | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const stats = calculateDatabaseStats(vehicles, maintenanceRecords, rules, cautelas);
  const sqlDump = generateSQLDump(vehicles, maintenanceRecords, rules, cautelas);

  // Generate options for past 12 months + current
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthOptions.push({
      value: val,
      label: formatMonthLabel(val),
    });
  }

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlDump);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          setImportMessage({ text: 'Banco de dados restaurado com sucesso!', type: 'success' });
        } else {
          setImportMessage({ text: 'Erro ao restaurar: arquivo JSON inválido ou incompatível.', type: 'error' });
        }
        setTimeout(() => setImportMessage(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearRecords = () => {
    clearAllRecords();
    setConfirmClearOpen(false);
    setImportMessage({ text: 'Registros de cautelas e manutenções limpos com sucesso. Viaturas mantidas.', type: 'success' });
    setTimeout(() => setImportMessage(null), 3000);
  };

  const handleResetDefault = () => {
    resetToDefaultData();
    setConfirmResetOpen(false);
    setImportMessage({ text: 'Base de dados restaurada para o padrão inicial.', type: 'success' });
    setTimeout(() => setImportMessage(null), 3000);
  };

  const handleCreateMonthlyBackup = async () => {
    try {
      setIsGenerating(true);
      const b = await generateMonthlyBackupNow(selectedMonthToBackup, 'MANUAL');
      setImportMessage({
        text: `Backup mensal de ${b.labelMes} criado e arquivado com sucesso no banco de dados!`,
        type: 'success',
      });
      setTimeout(() => setImportMessage(null), 4000);
    } catch {
      setImportMessage({ text: 'Erro ao gerar backup mensal.', type: 'error' });
      setTimeout(() => setImportMessage(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmRestoreAction = () => {
    if (!backupToRestore) return;
    const success = restoreFromMonthlyBackup(backupToRestore);
    if (success) {
      setImportMessage({
        text: `Banco de dados restaurado com sucesso para o estado de ${backupToRestore.labelMes}!`,
        type: 'success',
      });
    } else {
      setImportMessage({
        text: 'Erro ao restaurar dados do backup.',
        type: 'error',
      });
    }
    setBackupToRestore(null);
    setTimeout(() => setImportMessage(null), 4000);
  };

  const confirmDeleteAction = async () => {
    if (!backupToDelete) return;
    await deleteMonthlyBackupItem(backupToDelete);
    setBackupToDelete(null);
    setImportMessage({ text: 'Backup mensal removido do cofre.', type: 'success' });
    setTimeout(() => setImportMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                Central de Banco de Dados & Armazenamento
              </h2>
              <p className="text-xs text-zinc-400">
                Gestão da persistência de registros, backups mensais automatizados e exportação SQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs Bar */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-zinc-800 bg-zinc-950/70">
          <button
            onClick={() => setActiveModalTab('backups-mensais')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeModalTab === 'backups-mensais'
                ? 'border-amber-400 text-amber-400 bg-zinc-900/60 rounded-t-lg'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Backups Mensais Automatizados</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {monthlyBackups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveModalTab('estrutura')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeModalTab === 'estrutura'
                ? 'border-amber-400 text-amber-400 bg-zinc-900/60 rounded-t-lg'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Estrutura do Banco & SQL Dump</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notification banner */}
          {importMessage && (
            <div
              className={`p-3.5 rounded-xl flex items-center space-x-2.5 text-xs font-semibold ${
                importMessage.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-700/60 text-rose-300'
              }`}
            >
              {importMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{importMessage.text}</span>
            </div>
          )}

          {/* TAB 1: BACKUPS MENSAIS AUTOMATIZADOS */}
          {activeModalTab === 'backups-mensais' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Status and Automation Control Box */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        Rotina de Backup Mensal Automático
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            backupConfig.autoBackupMonthlyEnabled
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {backupConfig.autoBackupMonthlyEnabled ? 'Ativado' : 'Desativado'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Gera snapshots mensais protegidos de viaturas, cautelas, checklists e ordens de serviço.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() =>
                      updateBackupConfig({
                        autoBackupMonthlyEnabled: !backupConfig.autoBackupMonthlyEnabled,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto ${
                      backupConfig.autoBackupMonthlyEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                    }`}
                  >
                    <span>
                      {backupConfig.autoBackupMonthlyEnabled ? 'Backup Automático: LIGADO' : 'Ligar Backup Automático'}
                    </span>
                  </button>
                </div>

                {/* Sub-config bar */}
                <div className="pt-3 border-t border-zinc-850 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-zinc-400 text-[11px]">Agendamento Mensal:</div>
                    <div className="font-semibold text-zinc-200 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Todo dia 1º de cada mês</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-zinc-400 text-[11px]">Última Execução Automática:</div>
                    <div className="font-semibold text-zinc-200 mt-0.5">
                      {backupConfig.ultimoBackupAutomatico
                        ? new Date(backupConfig.ultimoBackupAutomatico).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Aguardando próximo ciclo'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-zinc-400 text-[11px]">Armazenamento Seguro:</div>
                    <div className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cofre Nativo IndexedDB Ativo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generator Section */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-amber-400" />
                      Gerar Novo Backup Mensal sob Demanda
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Gere e congele um snapshot completo do banco para o mês selecionado.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedMonthToBackup}
                      onChange={(e) => setSelectedMonthToBackup(e.target.value)}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {monthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleCreateMonthlyBackup}
                      disabled={isGenerating}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Gravando...</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          <span>Gravar Backup Mensal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Vault list of monthly backups */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Archive className="w-4 h-4 text-amber-400" />
                    Cofre de Backups Mensais Arquivados ({monthlyBackups.length})
                  </h3>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Retenção local persistente
                  </span>
                </div>

                {monthlyBackups.length === 0 ? (
                  <div className="p-8 text-center bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                      <CalendarClock className="w-6 h-6 text-amber-400/60" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200">
                        Nenhum backup mensal arquivado ainda
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                        O sistema gerará backups automáticos no primeiro dia de cada mês, ou você pode gerar o snapshot de qualquer mês agora mesmo pelo botão acima.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateMonthlyBackup}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Gerar Backup de {formatMonthLabel(currentYearMonth)} Agora
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {monthlyBackups.map((backup) => {
                      const dataFormatada = new Date(backup.criadoEm).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={backup.id}
                          className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 hover:border-zinc-750 transition flex flex-col space-y-3"
                        >
                          {/* Card top */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center space-x-3">
                              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
                                <Calendar className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                                  <span>{backup.labelMes}</span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                      backup.tipo === 'AUTOMATICO'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                    }`}
                                  >
                                    {backup.tipo === 'AUTOMATICO' ? 'Automático' : 'Manual'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                                  <span>Gravado em: {dataFormatada}</span>
                                  <span>•</span>
                                  <span className="font-mono text-zinc-400">{backup.tamanhoFormatado}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                              <button
                                onClick={() => downloadBackupFile(backup)}
                                className="px-2.5 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                                title="Baixar arquivo JSON do backup deste mês"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>.JSON</span>
                              </button>

                              <button
                                onClick={() => downloadBackupSQL(backup)}
                                className="px-2.5 py-1.5 bg-amber-500/90 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                                title="Baixar script SQL das tabelas deste mês"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                                <span>.SQL</span>
                              </button>

                              <button
                                onClick={() => setBackupToRestore(backup)}
                                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-zinc-700 transition cursor-pointer"
                                title="Restaurar banco para o estado deste mês"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                                <span>Restaurar</span>
                              </button>

                              <button
                                onClick={() => setBackupToDelete(backup.id)}
                                className="p-1.5 bg-zinc-900 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-lg text-xs border border-zinc-800 hover:border-rose-900/40 transition cursor-pointer"
                                title="Excluir backup do cofre"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Card Metrics Grid */}
                          <div className="pt-2 border-t border-zinc-850/80 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-850">
                              <span className="text-[10px] text-zinc-400 font-medium">Viaturas na Frota:</span>
                              <div className="font-bold text-zinc-200 font-mono mt-0.5">
                                {backup.totalViaturas}
                              </div>
                            </div>

                            <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-850">
                              <span className="text-[10px] text-zinc-400 font-medium">Cautelas no Mês:</span>
                              <div className="font-bold text-emerald-400 font-mono mt-0.5">
                                {backup.resumoMensal?.cautelasRealizadas ?? backup.totalCautelas}
                              </div>
                            </div>

                            <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-850">
                              <span className="text-[10px] text-zinc-400 font-medium">Km Rodados no Mês:</span>
                              <div className="font-bold text-blue-400 font-mono mt-0.5">
                                {backup.resumoMensal?.kmRodadosNoMes ?? 0} km
                              </div>
                            </div>

                            <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-850">
                              <span className="text-[10px] text-zinc-400 font-medium">Ordens de Serviço:</span>
                              <div className="font-bold text-amber-400 font-mono mt-0.5">
                                {backup.resumoMensal?.manutencoesRealizadas ?? backup.totalManutencoes}
                              </div>
                            </div>

                            <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-850">
                              <span className="text-[10px] text-zinc-400 font-medium">Avarias Registradas:</span>
                              <div
                                className={`font-bold font-mono mt-0.5 ${
                                  (backup.resumoMensal?.cautelasComAvaria ?? 0) > 0
                                    ? 'text-rose-400'
                                    : 'text-zinc-400'
                                }`}
                              >
                                {backup.resumoMensal?.cautelasComAvaria ?? 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ESTRUTURA DO BANCO & SQL DUMP */}
          {activeModalTab === 'estrutura' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Database Health & Status Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Card */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Estado do Banco
                    </div>
                    <div className="text-sm font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Ativo & Persistente
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Armazenamento local seguro IndexedDB + LocalStorage
                    </div>
                  </div>
                </div>

                {/* Storage Size Card */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Volume de Dados
                    </div>
                    <div className="text-sm font-black text-blue-400 mt-0.5 font-mono">
                      {stats.estimatedSizeFormatted}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {stats.totalRecords} registros cadastrados no total
                    </div>
                  </div>
                </div>

                {/* Last Update Card */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Última Sincronização
                    </div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5 font-mono">
                      {stats.lastUpdated}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Tabelas normalizadas e sincronizadas
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Tables Overview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Tabelas e Entidades do Banco de Dados
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
                    <div className="text-[11px] text-zinc-400 font-mono">TABELA: viaturas</div>
                    <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                      {stats.vehiclesCount}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Motos e viaturas 4R</div>
                  </div>
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
                    <div className="text-[11px] text-zinc-400 font-mono">TABELA: cautelas</div>
                    <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                      {stats.cautelasCount}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Termos e checklists</div>
                  </div>
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
                    <div className="text-[11px] text-zinc-400 font-mono">TABELA: manutencoes</div>
                    <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                      {stats.maintenanceCount}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Ordens de serviço</div>
                  </div>
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
                    <div className="text-[11px] text-zinc-400 font-mono">TABELA: regras</div>
                    <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                      {stats.rulesCount}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Planos preventivos</div>
                  </div>
                </div>
              </div>

              {/* Export & Generation Actions */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-400" />
                  Gerar e Exportar Banco de Dados
                </h3>
                <p className="text-xs text-zinc-400">
                  Exporte seus dados em formatos profissionais para custódia externa, backup seguro ou importação em servidores de banco de dados (SQLite, MySQL, PostgreSQL, Planilhas).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Gerar Script SQL */}
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-amber-500/30 hover:border-amber-500/60 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-amber-400 mb-1.5">
                        <FileCode className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Script SQL (.sql)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Gera arquivo SQL completo com comandos CREATE TABLE e INSERT INTO com todos os registros atuais.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={() => downloadSQLFile(vehicles, maintenanceRecords, rules, cautelas)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar .SQL</span>
                      </button>
                      <button
                        onClick={() => setShowSqlPreview(!showSqlPreview)}
                        className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                        title="Pré-visualizar código SQL"
                      >
                        {showSqlPreview ? 'Ocultar' : 'Ver'}
                      </button>
                    </div>
                  </div>

                  {/* Backup Completo JSON */}
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-blue-500/30 hover:border-blue-500/60 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-blue-400 mb-1.5">
                        <Database className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Backup JSON (.json)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Cópia de segurança completa do banco em JSON nativo, pronta para restauração instantânea.
                      </p>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={exportDatabaseJSON}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar .JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Planilhas CSV */}
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-emerald-500/30 hover:border-emerald-500/60 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-emerald-400 mb-1.5">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Tabelas em CSV (.csv)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Exporta tabelas de viaturas, cautelas e ordens de serviço para abrir no Excel ou Google Sheets.
                      </p>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => downloadAllTablesCSV(vehicles, maintenanceRecords, cautelas)}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Planilhas</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* SQL Preview Box if toggled */}
                {showSqlPreview && (
                  <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-mono text-[11px] text-amber-400">Script SQL Gerado (DUMP):</span>
                      <button
                        onClick={handleCopySql}
                        className="flex items-center space-x-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition cursor-pointer"
                      >
                        {copiedSql ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar SQL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 bg-zinc-950 rounded-lg text-[11px] font-mono text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap select-all border border-zinc-850">
                      {sqlDump}
                    </pre>
                  </div>
                )}
              </div>

              {/* Import / Restore Section */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  Restaurar Backup do Banco de Dados
                </h3>
                <p className="text-xs text-zinc-400">
                  Selecione um arquivo de backup previamente gerado (.json) para restaurar todo o banco de dados. Os dados atuais serão atualizados de forma segura.
                </p>

                <div>
                  <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Selecionar Arquivo JSON de Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Maintenance & Reset Operations */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-zinc-400" />
                  Operações de Manutenção do Banco
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {!confirmClearOpen ? (
                    <button
                      onClick={() => setConfirmClearOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Histórico de Cautelas e O.S.</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-rose-950/60 border border-rose-700 p-2 rounded-lg text-xs">
                      <span className="text-rose-200">Confirma apagar cautelas e manutenções? Viaturas permanecerão salvas.</span>
                      <button
                        onClick={handleClearRecords}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded cursor-pointer"
                      >
                        Sim, Limpar
                      </button>
                      <button
                        onClick={() => setConfirmClearOpen(false)}
                        className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {!confirmResetOpen ? (
                    <button
                      onClick={() => setConfirmResetOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Restaurar Base Padrão ROCAM</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-amber-950/60 border border-amber-700 p-2 rounded-lg text-xs">
                      <span className="text-amber-200">Restaurar toda a base com dados padrão?</span>
                      <button
                        onClick={handleResetDefault}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded cursor-pointer"
                      >
                        Sim, Restaurar
                      </button>
                      <button
                        onClick={() => setConfirmResetOpen(false)}
                        className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Restore Confirmation Dialog Modal */}
        {backupToRestore && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-amber-400">
                <RotateCcw className="w-6 h-6" />
                <h3 className="text-base font-bold text-zinc-100">
                  Restaurar Banco de Dados
                </h3>
              </div>
              <p className="text-xs text-zinc-300">
                Você está prestes a restaurar o banco de dados para o snapshot de{' '}
                <strong className="text-amber-400">{backupToRestore.labelMes}</strong>.
              </p>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5 text-zinc-400">
                <div>Viaturas: <span className="font-bold text-zinc-200">{backupToRestore.totalViaturas}</span></div>
                <div>Cautelas: <span className="font-bold text-zinc-200">{backupToRestore.totalCautelas}</span></div>
                <div>Manutenções: <span className="font-bold text-zinc-200">{backupToRestore.totalManutencoes}</span></div>
                <div>Data do Backup: <span className="font-bold text-zinc-200">{new Date(backupToRestore.criadoEm).toLocaleString('pt-BR')}</span></div>
              </div>
              <p className="text-[11px] text-amber-300/80">
                Recomendamos que você faça um backup do estado atual antes de continuar.
              </p>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setBackupToRestore(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRestoreAction}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirmar Restauração</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog Modal */}
        {backupToDelete && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-rose-400">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-base font-bold text-zinc-100">
                  Excluir Backup do Cofre
                </h3>
              </div>
              <p className="text-xs text-zinc-300">
                Confirma a exclusão permanente deste backup mensal arquivado?
              </p>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setBackupToDelete(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteAction}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Sim, Excluir Backup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-zinc-500">
            <Info className="w-4 h-4 text-amber-500" />
            <span>Os backups mensais ficam protegidos e salvos no cofre de dados persistente.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
