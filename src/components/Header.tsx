import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { UserManagementModal } from './UserManagementModal';
import { UserProfileModal } from './UserProfileModal';
import {
  Shield,
  Bike,
  Wrench,
  AlertTriangle,
  FileText,
  Calendar,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Layers,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  RotateCcw,
  Trash2,
  Database,
  Users,
  KeyRound,
  LogOut,
  User,
  ChevronDown,
  Lock,
  MessageSquareShare
} from 'lucide-react';

interface HeaderProps {
  onOpenNewVehicle: () => void;
  onOpenNewMaintenance: () => void;
  onOpenNewCautela?: () => void;
  onOpenDescautelar?: () => void;
  onOpenDatabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewVehicle,
  onOpenNewMaintenance,
  onOpenNewCautela,
  onOpenDescautelar,
  onOpenDatabaseModal,
}) => {
  const {
    activeTab,
    setActiveTab,
    stats,
    activeCautelasCount,
    criticalAlertCount,
    warningAlertCount,
    resetToDefaultData,
    clearAllRecords,
    exportDatabaseJSON,
    importDatabaseJSON,
    monthlyBackups,
    backupNotification,
    setBackupNotification,
  } = useFleet();

  const { currentUser, isAdmin, isOperator, logout, users, pendingApprovalsCount } = useAuth();
  const { unreadNoticesCount, isOnlineSync } = useTeam();

  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalInitialTab, setUserModalInitialTab] = useState<'list' | 'pending' | 'create'>('list');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          setToastMessage({ text: 'Dados restaurados com sucesso!', type: 'success' });
        } else {
          setToastMessage({ text: 'Arquivo inválido para restauração.', type: 'error' });
        }
        setTimeout(() => setToastMessage(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Build navigation items filtered by RBAC
  const allNavItems = [
    {
      id: 'frota',
      label: 'Frota ROCAM',
      icon: Bike,
      badge: `${stats.total}`,
      badgeColor: 'bg-zinc-800 text-zinc-300',
      allowedRoles: ['ADMIN', 'OPERADOR'],
    },
    {
      id: 'equipe',
      label: 'Equipe & Comunicação',
      icon: Users,
      badge: unreadNoticesCount > 0 ? `${unreadNoticesCount} Novo${unreadNoticesCount > 1 ? 's' : ''}` : undefined,
      badgeColor: 'bg-amber-500 text-zinc-950 font-bold',
      allowedRoles: ['ADMIN', 'OPERADOR'],
    },
    {
      id: 'cautelas',
      label: 'Cautela & Checklist',
      icon: ClipboardCheck,
      badge: activeCautelasCount > 0 ? `${activeCautelasCount} em serviço` : undefined,
      badgeColor: 'bg-emerald-500 text-zinc-950 font-bold',
      allowedRoles: ['ADMIN', 'OPERADOR'],
    },
    {
      id: 'manutencao',
      label: 'Manutenções',
      icon: Wrench,
      badge: undefined,
      allowedRoles: ['ADMIN'], // Restrito a Admin
    },
    {
      id: 'alertas',
      label: 'Alertas de Manutenção',
      icon: AlertTriangle,
      badge:
        criticalAlertCount > 0
          ? `${criticalAlertCount} Crítico${criticalAlertCount > 1 ? 's' : ''}`
          : warningAlertCount > 0
          ? `${warningAlertCount}`
          : undefined,
      badgeColor:
        criticalAlertCount > 0
          ? 'bg-rose-500 text-white animate-pulse'
          : 'bg-amber-500 text-black font-semibold',
      allowedRoles: ['ADMIN', 'OPERADOR'],
    },
    {
      id: 'relatorio-diario',
      label: 'Relatório Diário',
      icon: FileText,
      badge: stats.baixadas > 0 ? `${stats.baixadas} Baixada${stats.baixadas > 1 ? 's' : ''}` : undefined,
      badgeColor: 'bg-rose-900/80 text-rose-200 border border-rose-700/60',
      allowedRoles: ['ADMIN', 'OPERADOR'],
    },
    {
      id: 'relatorio-mensal',
      label: 'Relatório Mensal',
      icon: Calendar,
      badge: undefined,
      allowedRoles: ['ADMIN'], // Restrito a Admin
    },
  ];

  const currentRole = currentUser?.role || 'OPERADOR';
  const navItems = allNavItems.filter((item) => item.allowedRoles.includes(currentRole));

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-30 shadow-xl">
      {/* Top Banner Tático */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 border-b border-zinc-850">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-400 text-xs font-mono hidden sm:inline">
                  {isOperator ? 'Módulo Operador • Cautelas & Avarias' : 'Comando & Logística ROCAM'}
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-900 text-amber-400 border border-zinc-800">
                  rocammecanizacao.com.br
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
                ROCAM <span className="text-amber-400 font-semibold text-base sm:text-lg">Mecanização</span>
              </h1>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Indicador de Prontidão (Desktop) */}
            <div className="hidden lg:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 shadow-inner">
              <div className="mr-2">
                <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Prontidão</div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-sm font-black font-mono ${
                      stats.taxaProntidao >= 80
                        ? 'text-emerald-400'
                        : stats.taxaProntidao >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {stats.taxaProntidao}%
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    ({stats.operacionais + stats.reserva}/{stats.total})
                  </span>
                </div>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  stats.taxaProntidao >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </div>

            {/* Indicador de Equipe Sincronizada */}
            <button
              onClick={() => setActiveTab('equipe')}
              className="hidden md:flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
              title="Rede de Trabalho em Equipe ROCAM. Clique para acessar o Mural e Mensagens."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <div className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">Rede ROCAM</div>
                <div className="text-[11px] text-emerald-400 font-bold leading-none flex items-center gap-1">
                  <span>Equipe Online</span>
                  {unreadNoticesCount > 0 && (
                    <span className="px-1 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-zinc-950">
                      {unreadNoticesCount}
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Nova Cautela Button - Em destaque para ambos, especialmente o Operador */}
            {onOpenNewCautela && (
              <button
                id="btn-header-nova-cautela"
                onClick={onOpenNewCautela}
                className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
                title="Registrar Cautela de Saída para Patrulhamento"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>+ Cautela</span>
              </button>
            )}

            {/* Descautelar (Fim de Serviço) Button */}
            {onOpenDescautelar && (
              <button
                id="btn-header-descautelar"
                onClick={onOpenDescautelar}
                className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition active:scale-95 cursor-pointer ${
                  activeCautelasCount > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700'
                }`}
                title="Descautelar viatura ao final do serviço policial"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Descautelar</span>
                {activeCautelasCount > 0 && <span className="font-bold">({activeCautelasCount})</span>}
              </button>
            )}

            {/* Ações Exclusivas de Administrador */}
            {isAdmin && (
              <>
                {/* Nova O.S. Button */}
                <button
                  id="btn-header-nova-os"
                  onClick={onOpenNewMaintenance}
                  className="hidden md:flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                  title="Abrir Ordem de Serviço de Manutenção"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova O.S.</span>
                </button>

                {/* Novo Veículo */}
                <button
                  id="btn-header-nova-vtr"
                  onClick={onOpenNewVehicle}
                  className="hidden lg:flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-750 transition active:scale-95 cursor-pointer"
                  title="Cadastrar Nova Viatura na Frota"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>+ Vtr</span>
                </button>

                {/* Gestão de Usuários (Admin) */}
                <button
                  id="btn-header-gestao-usuarios"
                  onClick={() => {
                    setUserModalInitialTab(pendingApprovalsCount > 0 ? 'pending' : 'list');
                    setIsUserModalOpen(true);
                  }}
                  className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-sm transition active:scale-95 cursor-pointer ${
                    pendingApprovalsCount > 0
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-zinc-800 hover:bg-zinc-750 text-amber-300 border-amber-500/30 hover:border-amber-400'
                  }`}
                  title={
                    pendingApprovalsCount > 0
                      ? `Existem ${pendingApprovalsCount} solicitações de cadastro pendentes de aprovação!`
                      : 'Gestão de Usuários: Acessar todos os usuários cadastrados'
                  }
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Usuários</span>
                  {pendingApprovalsCount > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950 animate-pulse">
                      {pendingApprovalsCount} pend.
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {users.length}
                    </span>
                  )}
                </button>

                {/* Banco de Dados Central Button */}
                {onOpenDatabaseModal && (
                  <button
                    id="btn-header-banco-dados"
                    onClick={onOpenDatabaseModal}
                    className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 shadow-sm transition active:scale-95 cursor-pointer relative"
                    title="Central de Banco de Dados, Backups Mensais e Exportação SQL"
                  >
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden xl:inline">Banco de Dados</span>
                    {monthlyBackups.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {monthlyBackups.length}m
                      </span>
                    )}
                  </button>
                )}

                {/* Menu Opções e Backup Rápido */}
                <div className="relative">
                  <button
                    onClick={() => setShowConfigMenu(!showConfigMenu)}
                    title="Opções de Base de Dados"
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                  </button>

                  {showConfigMenu && (
                    <div
                      className="absolute right-0 mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-750 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                      onClick={() => setShowConfigMenu(false)}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5">
                        Gerenciar Base de Dados
                      </div>
                      {onOpenDatabaseModal && (
                        <button
                          onClick={onOpenDatabaseModal}
                          className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-amber-300 hover:bg-zinc-800 rounded-lg transition font-semibold"
                        >
                          <Database className="w-4 h-4 text-amber-400" />
                          <span>Central de Banco & Backups</span>
                        </button>
                      )}
                      <button
                        onClick={exportDatabaseJSON}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Download className="w-4 h-4 text-amber-400" />
                        <span>Fazer Backup JSON</span>
                      </button>
                      <label className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer">
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>Restaurar Backup JSON</span>
                        <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                      </label>
                      <div className="my-1 border-t border-zinc-800" />
                      <button
                        onClick={clearAllRecords}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Apagar Cautelas e O.S.</span>
                      </button>
                      <button
                        onClick={resetToDefaultData}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4 text-zinc-400" />
                        <span>Restaurar Frota Padrão</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Divisor Visual */}
            <div className="h-6 w-px bg-zinc-800 mx-0.5" />

            {/* User Profile Button & Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center space-x-2 pl-2 pr-2.5 py-1 rounded-xl border transition cursor-pointer ${
                  isAdmin
                    ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-zinc-100'
                    : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-zinc-100'
                }`}
                title={`Usuário conectado: ${currentUser?.name || 'Policial'}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isAdmin ? 'bg-amber-500 text-zinc-950' : 'bg-emerald-500 text-zinc-950'
                  }`}
                >
                  {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
                </div>

                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    <span className="truncate max-w-[120px]">{currentUser?.name || 'Policial'}</span>
                  </div>
                  <div className="text-[10px] font-mono leading-none text-zinc-400 flex items-center gap-1">
                    <span
                      className={`font-bold ${
                        isAdmin ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {isAdmin ? 'ADMIN' : 'OPERADOR'}
                    </span>
                    <span>•</span>
                    <span>{currentUser?.re || ''}</span>
                  </div>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {/* User Dropdown Box */}
              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-750 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  {/* User info card */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isAdmin ? 'bg-amber-500 text-zinc-950' : 'bg-emerald-500 text-zinc-950'
                        }`}
                      >
                        {isAdmin ? <Shield className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">{currentUser?.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">RE: {currentUser?.re}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{currentUser?.pelotao}</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Nível de Acesso:</span>
                      <span
                        className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                          isAdmin
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isAdmin ? '👑 ADMIN (Total)' : '🛡️ OPERADOR (Limitado)'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-1">
                    {/* Meu Perfil & Excluir Conta */}
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-800 rounded-lg transition font-medium cursor-pointer"
                    >
                      <User className="w-4 h-4 text-amber-400" />
                      <span>Meu Perfil & Configurações</span>
                    </button>

                    {/* User Management (Admin only) */}
                    {isAdmin && (
                      <>
                        {pendingApprovalsCount > 0 && (
                          <button
                            onClick={() => {
                              setUserModalInitialTab('pending');
                              setIsUserModalOpen(true);
                            }}
                            className="w-full text-left flex items-center justify-between px-3 py-2 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition font-medium cursor-pointer"
                          >
                            <div className="flex items-center space-x-2.5">
                              <Clock className="w-4 h-4 text-amber-400" />
                              <span>Pendentes de Aprovação</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
                              {pendingApprovalsCount}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setUserModalInitialTab('create');
                            setIsUserModalOpen(true);
                          }}
                          className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-amber-300 hover:bg-zinc-800 rounded-lg transition font-medium cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-amber-400" />
                          <span>+ Cadastrar Novo Usuário</span>
                        </button>
                        <button
                          onClick={() => {
                            setUserModalInitialTab('list');
                            setIsUserModalOpen(true);
                          }}
                          className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 rounded-lg transition font-medium cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-zinc-400" />
                          <span>Listar Policiais & Acessos</span>
                        </button>
                      </>
                    )}

                    <div className="my-1 border-t border-zinc-800" />

                    {/* Logout */}
                    <button
                      onClick={logout}
                      className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sair do Sistema (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Logout Quick Button */}
            <button
              onClick={logout}
              title="Sair do Sistema (Logout)"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-800/80 text-zinc-400 hover:text-rose-400 transition cursor-pointer flex items-center space-x-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-semibold hidden md:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Dynamic Backup Notification Strip */}
        {backupNotification && (
          <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{backupNotification}</span>
            </div>
            <button
              onClick={() => setBackupNotification(null)}
              className="text-emerald-400 hover:text-emerald-200 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Generic Toast Notification */}
        {toastMessage && (
          <div
            className={`px-4 py-2 flex items-center justify-between text-xs font-medium border-b ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/90 border-rose-800 text-rose-200'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800 text-amber-400 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        initialTab={userModalInitialTab}
      />

      {/* User Profile Modal with Delete Account Option */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
};
