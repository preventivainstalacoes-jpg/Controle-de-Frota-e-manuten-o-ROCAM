import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
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
  Trash2
} from 'lucide-react';

interface HeaderProps {
  onOpenNewVehicle: () => void;
  onOpenNewMaintenance: () => void;
  onOpenNewCautela?: () => void;
  onOpenDescautelar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewVehicle,
  onOpenNewMaintenance,
  onOpenNewCautela,
  onOpenDescautelar,
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
  } = useFleet();

  const [showConfigMenu, setShowConfigMenu] = useState(false);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          alert('Dados importados com sucesso!');
        } else {
          alert('Arquivo inválido para importação.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const navItems = [
    {
      id: 'frota',
      label: 'Frota ROCAM',
      icon: Bike,
      badge: `${stats.total}`,
      badgeColor: 'bg-zinc-800 text-zinc-300',
    },
    {
      id: 'cautelas',
      label: 'Cautela & Checklist',
      icon: ClipboardCheck,
      badge: activeCautelasCount > 0 ? `${activeCautelasCount} em serviço` : undefined,
      badgeColor: 'bg-emerald-500 text-zinc-950 font-bold',
    },
    {
      id: 'manutencao',
      label: 'Manutenções',
      icon: Wrench,
      badge: undefined,
    },
    {
      id: 'alertas',
      label: 'Alertas de Manutenção',
      icon: AlertTriangle,
      badge: criticalAlertCount > 0 ? `${criticalAlertCount} Crítico${criticalAlertCount > 1 ? 's' : ''}` : warningAlertCount > 0 ? `${warningAlertCount}` : undefined,
      badgeColor: criticalAlertCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-500 text-black font-semibold',
    },
    {
      id: 'relatorio-diario',
      label: 'Relatório Diário',
      icon: FileText,
      badge: stats.baixadas > 0 ? `${stats.baixadas} Baixada${stats.baixadas > 1 ? 's' : ''}` : undefined,
      badgeColor: 'bg-rose-900/80 text-rose-200 border border-rose-700/60',
    },
    {
      id: 'relatorio-mensal',
      label: 'Relatório Mensal',
      icon: Calendar,
      badge: undefined,
    },
  ];

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-30 shadow-xl">
      {/* Top Banner Tático */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 border-b border-zinc-850">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Polícia Militar
                </span>
                <span className="text-zinc-500 text-xs hidden sm:inline">•</span>
                <span className="text-zinc-400 text-xs font-mono hidden sm:inline">Setor de Logística e Manutenção</span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
                ROCAM <span className="text-amber-400 font-semibold text-base sm:text-lg">— Controle de Frota & Manutenção</span>
              </h1>
            </div>
          </div>

          {/* KPI de Prontidão e Ações Rápidas */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Indicador de Prontidão */}
            <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 shadow-inner">
              <div className="mr-2.5">
                <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Prontidão Operacional</div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-base font-black font-mono ${
                    stats.taxaProntidao >= 80 ? 'text-emerald-400' : stats.taxaProntidao >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {stats.taxaProntidao}%
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">
                    ({stats.operacionais + stats.reserva}/{stats.total} Vtr)
                  </span>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                stats.taxaProntidao >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
              }`} />
            </div>

            {/* Nova Cautela Button */}
            {onOpenNewCautela && (
              <button
                id="btn-header-nova-cautela"
                onClick={onOpenNewCautela}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
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
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition active:scale-95 cursor-pointer ${
                  activeCautelasCount > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700'
                }`}
                title="Descautelar viatura ao final do serviço policial (conferência de retorno)"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Descautelar{activeCautelasCount > 0 ? ` (${activeCautelasCount})` : ''}</span>
              </button>
            )}

            {/* Nova O.S. Button */}
            <button
              id="btn-header-nova-os"
              onClick={onOpenNewMaintenance}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova O.S.</span>
            </button>

            {/* Novo Veículo */}
            <button
              id="btn-header-nova-vtr"
              onClick={onOpenNewVehicle}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Viatura</span>
            </button>

            {/* Menu Opções e Backup */}
            <div className="relative">
              <button
                onClick={() => setShowConfigMenu(!showConfigMenu)}
                title="Opções da Base de Dados"
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition cursor-pointer"
              >
                <Layers className="w-4 h-4" />
              </button>

              {showConfigMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-750 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowConfigMenu(false)}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5">
                    Gerenciar Base de Dados
                  </div>
                  <button
                    onClick={exportDatabaseJSON}
                    className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Fazer Backup (JSON)</span>
                  </button>
                  <label className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Restaurar Backup (JSON)</span>
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </label>
                  <div className="my-1 border-t border-zinc-800" />
                  <button
                    onClick={() => {
                      if (window.confirm('Confirma apagar todos os registros de cautelas e manutenções? Todas as viaturas retornarão ao estado operacional.')) {
                        clearAllRecords();
                      }
                    }}
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
                    <span>Restaurar Padrão Limpo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-zinc-800 text-zinc-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
