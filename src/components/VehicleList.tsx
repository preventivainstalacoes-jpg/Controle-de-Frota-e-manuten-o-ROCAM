import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { useAuth } from '../context/AuthContext';
import { Vehicle, VehicleType, VehicleStatus, CautelaRecord } from '../types';
import {
  Bike,
  Car,
  Search,
  Plus,
  Gauge,
  Wrench,
  History,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Filter,
  LayoutGrid,
  List,
  AlertCircle,
  ClipboardCheck,
  RotateCcw,
  X
} from 'lucide-react';
import { formatKm, getStatusBadgeInfo, formatDate } from '../utils/formatters';

interface VehicleListProps {
  onOpenNewVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onOpenOdometer: (vehicle: Vehicle) => void;
  onOpenMaintenanceForVehicle: (vehicle: Vehicle) => void;
  onOpenNewCautelaForVehicle?: (vehicle: Vehicle) => void;
  onOpenDescautelaForVehicle?: (cautela: CautelaRecord) => void;
}

export const VehicleList: React.FC<VehicleListProps> = ({
  onOpenNewVehicle,
  onEditVehicle,
  onOpenOdometer,
  onOpenMaintenanceForVehicle,
  onOpenNewCautelaForVehicle,
  onOpenDescautelaForVehicle,
}) => {
  const {
    vehicles,
    deleteVehicle,
    maintenanceRecords,
    cautelas,
    alerts,
    stats,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    updateVehicle,
  } = useFleet();
  const { isAdmin, isOperator, currentUser } = useAuth();
  const isMechanic = currentUser?.role === 'MECANICO';
  const canSendToDischarge = isAdmin || isMechanic;

  type DashboardFilter = 'TODOS' | 'MOTOCICLETA' | 'QUATRO_RODAS' | 'BAIXADA' | 'DESCARGA' | 'EM_MANUTENCAO' | 'MANUTENCAO_EXTERNA' | 'CAUTELADAS';
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>('TODOS');
  const dashboardFilterLabels: Record<DashboardFilter, string> = {
    TODOS: 'Frota Total',
    MOTOCICLETA: 'Motocicletas',
    QUATRO_RODAS: 'Viaturas de 04 Rodas',
    BAIXADA: 'Viaturas Baixadas (exceto as destinadas à descarga)',
    DESCARGA: 'Viaturas Destinadas à Descarga',
    EM_MANUTENCAO: 'Viaturas em Manutenção Interna',
    MANUTENCAO_EXTERNA: 'Viaturas em Manutenção Externa',
    CAUTELADAS: 'Viaturas Cauteladas / em Patrulhamento',
  };

  const applyDashboardFilter = (filter: DashboardFilter) => {
    // O cartão selecionado é o filtro principal; limpar todos os filtros
    // anteriores evita que uma busca/tipo/status antigo esconda viaturas.
    setDashboardFilter(filter);
    setSearchQuery('');
    setTypeFilter('TODAS');
    setStatusFilter('TODOS');

    // Levar o usuário diretamente à área da relação de viaturas.
    window.setTimeout(() => {
      document.getElementById('lista-viaturas')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [vehicleToDischargeId, setVehicleToDischargeId] = useState('');
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [vehicleForHistory, setVehicleForHistory] = useState<Vehicle | null>(null);
  const [statusModal, setStatusModal] = useState<{
    vehicle: Vehicle;
    targetStatus: VehicleStatus;
    reason: string;
  } | null>(null);

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchQuery =
      v.prefixo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.placa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.condutorPadrao && v.condutorPadrao.toLowerCase().includes(searchQuery.toLowerCase())) ||
      v.pelotao.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = typeFilter === 'TODAS' || v.tipo === typeFilter;
    const matchStatus = statusFilter === 'TODOS' || v.status === statusFilter;
    const isForDischarge = (v.motivoBaixa || '').toLocaleLowerCase().includes('descarga por inservibilidade');
    const activeCautelaVehicleIds = new Set(cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO').map((c) => c.viaturaId));
    const matchDashboardFilter =
      dashboardFilter === 'TODOS' ||
      (dashboardFilter === 'MOTOCICLETA' && v.tipo === 'MOTOCICLETA') ||
      (dashboardFilter === 'QUATRO_RODAS' && v.tipo === 'QUATRO_RODAS') ||
      (dashboardFilter === 'BAIXADA' && v.status === 'BAIXADA' && !isForDischarge) ||
      (dashboardFilter === 'DESCARGA' && isForDischarge) ||
      (dashboardFilter === 'EM_MANUTENCAO' && v.status === 'EM_MANUTENCAO') ||
      (dashboardFilter === 'MANUTENCAO_EXTERNA' && v.status === 'MANUTENCAO_EXTERNA') ||
      (dashboardFilter === 'CAUTELADAS' && activeCautelaVehicleIds.has(v.id));
    // Viaturas formalmente selecionadas para descarga continuam ocultas aos operadores.
    const visibleToProfile = (isAdmin || isMechanic) || !isForDischarge;

    return matchQuery && matchType && matchStatus && matchDashboardFilter && visibleToProfile;
  });

  const handleConfirmDelete = () => {
    if (vehicleToDelete) {
      deleteVehicle(vehicleToDelete.id);
      setVehicleToDelete(null);
    }
  };

  const handleOpenStatusModal = (vehicle: Vehicle) => {
    setStatusModal({
      vehicle,
      targetStatus: vehicle.status === 'OPERACIONAL' ? 'BAIXADA' : 'OPERACIONAL',
      reason: vehicle.motivoBaixa || '',
    });
  };

  const handleOpenDischargeModal = (vehicle: Vehicle) => {
    setStatusModal({
      vehicle,
      targetStatus: 'BAIXADA',
      reason: 'DESCARGA POR INSERVIBILIDADE',
    });
  };

  // Descargas por inservibilidade abrangem motocicletas e viaturas de 04 rodas.
  const vehiclesForDischarge = vehicles.filter(
    (v) => v.status === 'BAIXADA' &&
      (v.motivoBaixa || '').toLocaleLowerCase().includes('descarga por inservibilidade')
  );
  const motorcyclesForDischarge = vehiclesForDischarge.filter((v) => v.tipo === 'MOTOCICLETA');
  const fourWheelVehiclesForDischarge = vehiclesForDischarge.filter((v) => v.tipo === 'QUATRO_RODAS');

  const handleConfirmStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal) return;

    if (statusModal.targetStatus === 'BAIXADA' || statusModal.targetStatus === 'EM_MANUTENCAO' || statusModal.targetStatus === 'MANUTENCAO_EXTERNA') {
      updateVehicle(statusModal.vehicle.id, {
        status: statusModal.targetStatus,
        motivoBaixa: statusModal.reason.trim() || (statusModal.targetStatus === 'BAIXADA' ? 'Constatada falha operacional / avaria.' : statusModal.targetStatus === 'MANUTENCAO_EXTERNA' ? 'Oficina externa não informada — manutenção em andamento.' : 'Encaminhada para oficina interna / manutenção.'),
      });
    } else {
      updateVehicle(statusModal.vehicle.id, {
        status: statusModal.targetStatus,
        motivoBaixa: undefined,
      });
    }

    setStatusModal(null);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Strip — cards clicáveis para filtrar a frota */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${isAdmin ? 'lg:grid-cols-8' : 'lg:grid-cols-7'} gap-3`}>
        <button type="button" onClick={() => applyDashboardFilter('TODOS')} aria-label="Mostrar frota completa" className={`text-left w-full bg-zinc-900 border rounded-xl p-3.5 shadow-sm transition hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400 ${dashboardFilter === 'TODOS' ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-zinc-800'}`}>
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase"><span>Frota Total</span><Shield className="w-4 h-4 text-zinc-500" /></div>
          <div className="mt-2 text-2xl font-black font-mono text-zinc-100">{stats.total}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{stats.motos} Motos • {stats.quatroRodas} 04 Rodas</div>
          <div className="text-[10px] text-amber-400 mt-1">Toque para ver todas</div>
        </button>

        {canSendToDischarge && (
          <button type="button" onClick={() => applyDashboardFilter('DESCARGA')} aria-label="Mostrar viaturas destinadas à descarga" className={`text-left w-full bg-orange-950/30 border rounded-xl p-3.5 shadow-sm transition hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400 ${dashboardFilter === 'DESCARGA' ? 'border-orange-400 ring-1 ring-orange-400/50' : 'border-orange-800/60'}`}>
            <div className="flex items-center justify-between text-orange-300 text-xs font-semibold uppercase gap-2"><span>Para descarga</span><AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" /></div>
            <div className="mt-2 text-2xl font-black font-mono text-orange-300">{vehiclesForDischarge.length}</div>
            <div className="text-[11px] text-orange-200/70 mt-0.5">{motorcyclesForDischarge.length} motos • {fourWheelVehiclesForDischarge.length} 04 rodas</div>
            <div className="text-[10px] text-orange-300 mt-1">Toque para ver a relação</div>
          </button>
        )}

        <button type="button" onClick={() => applyDashboardFilter('MOTOCICLETA')} aria-label="Mostrar somente motocicletas" className={`text-left w-full bg-zinc-900 border rounded-xl p-3.5 shadow-sm transition hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 ${dashboardFilter === 'MOTOCICLETA' ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-zinc-800'}`}>
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase"><span>Motocicletas</span><Bike className="w-4 h-4 text-amber-500" /></div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-400">{stats.motos}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Especialidade ROCAM</div>
          <div className="text-[10px] text-amber-400 mt-1">Toque para filtrar</div>
        </button>

        <button type="button" onClick={() => applyDashboardFilter('QUATRO_RODAS')} aria-label="Mostrar somente viaturas de quatro rodas" className={`text-left w-full bg-zinc-900 border rounded-xl p-3.5 shadow-sm transition hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${dashboardFilter === 'QUATRO_RODAS' ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-zinc-800'}`}>
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold uppercase"><span>04 Rodas</span><Car className="w-4 h-4 text-blue-400" /></div>
          <div className="mt-2 text-2xl font-black font-mono text-blue-400">{stats.quatroRodas}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Apoio Tático & CFP</div>
          <div className="text-[10px] text-blue-400 mt-1">Toque para filtrar</div>
        </button>

        <button type="button" onClick={() => applyDashboardFilter('CAUTELADAS')} aria-label="Mostrar viaturas cauteladas em patrulhamento" className={`text-left w-full bg-zinc-900 border rounded-xl p-3.5 shadow-sm transition hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${dashboardFilter === 'CAUTELADAS' ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-emerald-900/40'}`}>
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase"><span>Cauteladas / Em Patrulhamento</span><Shield className="w-4 h-4 text-emerald-500" /></div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">{cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO').length}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Saídas registradas e ainda não devolvidas</div>
          <div className="text-[10px] text-emerald-400 mt-1">Toque para ver as cauteladas</div>
        </button>

        <button type="button" onClick={() => applyDashboardFilter('BAIXADA')} aria-label="Mostrar viaturas baixadas" className={`text-left w-full bg-zinc-900 border rounded-xl p-3.5 shadow-sm transition hover:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400 ${dashboardFilter === 'BAIXADA' ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-rose-900/40'}`}>
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold uppercase"><span>Baixadas</span><AlertTriangle className="w-4 h-4 text-rose-500" /></div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-400">{vehicles.filter((v) => v.status === 'BAIXADA' && !(v.motivoBaixa || '').toLocaleLowerCase().includes('descarga por inservibilidade')).length}</div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">Aguardando reparo</div>
          <div className="text-[10px] text-rose-400 mt-1">Toque para ver a relação</div>
        </button>

        <button type="button" onClick={() => applyDashboardFilter('EM_MANUTENCAO')} aria-label="Mostrar viaturas em manutenção interna" className={`text-left w-full bg-zinc-900 border rounded-xl p-3.5 shadow-sm transition hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 ${dashboardFilter === 'EM_MANUTENCAO' ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-amber-900/40'}`}>
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold uppercase"><span>Manutenção Interna</span><Wrench className="w-4 h-4 text-amber-400" /></div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-300">{vehicles.filter((v) => v.status === 'EM_MANUTENCAO').length}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Oficina interna da unidade</div>
          <div className="text-[10px] text-amber-300 mt-1">Toque para ver as viaturas</div>
        </button>

        <button type="button" onClick={() => applyDashboardFilter('MANUTENCAO_EXTERNA')} aria-label="Mostrar viaturas em manutenção externa" className={`text-left w-full bg-sky-950/30 border rounded-xl p-3.5 shadow-sm transition hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 ${dashboardFilter === 'MANUTENCAO_EXTERNA' ? 'border-sky-500 ring-1 ring-sky-500/50' : 'border-sky-900/40'}`}>
          <div className="flex items-center justify-between text-sky-300 text-xs font-semibold uppercase"><span>Manutenção Externa</span><Wrench className="w-4 h-4 text-sky-400" /></div>
          <div className="mt-2 text-2xl font-black font-mono text-sky-300">{vehicles.filter((v) => v.status === 'MANUTENCAO_EXTERNA').length}</div>
          <div className="text-[11px] text-sky-200/80 mt-0.5">Em oficina externa / concessionária</div>
          <div className="text-[10px] text-sky-300 mt-1">Toque para ver as viaturas</div>
        </button>
      </div>

      {/* Indicadores de veículos selecionados para descarga — todos os tipos */}
      <section className="rounded-xl border border-orange-800/60 bg-orange-950/25 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-500/15 p-2 text-orange-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-orange-100">Veículos para descarga por inservibilidade</h2>
            <p className="text-xs text-orange-200/70">Contabiliza motocicletas e viaturas de 04 rodas, independentemente da categoria ou prefixo.</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-black font-mono text-orange-300">{vehiclesForDischarge.length}</div>
            <div className="text-[10px] uppercase tracking-wide text-orange-200/70">total pendente</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-lg border border-orange-800/40 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2 text-orange-200">
              <Bike className="w-4 h-4" />
              <span className="text-xs font-semibold">Motocicletas</span>
            </div>
            <span className="text-lg font-black font-mono text-orange-300">{motorcyclesForDischarge.length}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-orange-800/40 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2 text-orange-200">
              <Car className="w-4 h-4" />
              <span className="text-xs font-semibold">04 rodas</span>
            </div>
            <span className="text-lg font-black font-mono text-orange-300">{fourWheelVehiclesForDischarge.length}</span>
          </div>
        </div>
      </section>

      {/* Ação principal de descarga — sempre visível para o administrador, independentemente do formato da lista */}
      {canSendToDischarge && (
        <section className="rounded-xl border-2 border-orange-500 bg-orange-950/40 p-4 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-orange-100">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-sm font-black">ENCAMINHAR VIATURA PARA DESCARGA</h2>
              <p className="text-xs text-orange-200/80">Selecione a motocicleta ou viatura de 04 rodas inservível.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              aria-label="Selecionar viatura para descarga"
              value={vehicleToDischargeId}
              onChange={(e) => setVehicleToDischargeId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-orange-700 bg-zinc-950 px-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Selecione o prefixo da viatura...</option>
              {vehicles.filter((v) => !(v.motivoBaixa || '').toLocaleLowerCase().includes('descarga por inservibilidade')).map((v) => (
                <option key={v.id} value={v.id}>{v.prefixo} — {v.tipo === 'MOTOCICLETA' ? 'Motocicleta' : '04 rodas'} — {v.marca} {v.modelo}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!vehicleToDischargeId}
              onClick={() => {
                const selectedVehicle = vehicles.find((v) => v.id === vehicleToDischargeId);
                if (selectedVehicle) handleOpenDischargeModal(selectedVehicle);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-500 px-4 py-3 text-sm font-black text-zinc-950 shadow hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AlertTriangle className="w-5 h-5" />
              ENVIAR PARA DESCARGA
            </button>
          </div>
          <p className="text-[11px] text-orange-200/70">As viaturas já encaminhadas para descarga não aparecem nesta seleção e permanecem ocultas para operadores.</p>
        </section>
      )}

      {/* Relação filtrada: o cartão leva diretamente à lista correspondente */}
      <section className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Relação de viaturas</div>
          <h2 className="text-sm font-bold text-zinc-100">{dashboardFilterLabels[dashboardFilter]}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{filteredVehicles.length} viatura(s) encontrada(s). Use o filtro de tipo para ver somente motocicletas ou somente 04 rodas.</p>
        </div>
        {dashboardFilter !== 'TODOS' && (
          <button type="button" onClick={() => applyDashboardFilter('TODOS')} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-amber-400">
            Mostrar frota total
          </button>
        )}
      </section>

      {/* Filter and Control Bar */}
      <div id="lista-viaturas" className="scroll-mt-28 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              id="input-busca-viaturas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Prefixo (M-01201), Placa, Modelo ou Condutor..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-750 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                title="Visualização em Cards"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Visualização em Tabela Tática"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Cadastrar Viatura (Admin Only) */}
            {isAdmin && (
              <button
                id="btn-cadastrar-viatura"
                onClick={onOpenNewVehicle}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Viatura</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800 text-xs">
          <span className="text-zinc-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" /> Tipo:
          </span>

          {(['TODAS', 'MOTOCICLETA', 'QUATRO_RODAS'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                typeFilter === t
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              {t === 'TODAS' ? 'Todas' : t === 'MOTOCICLETA' ? 'Motocicletas' : '04 Rodas'}
            </button>
          ))}

          <span className="text-zinc-600 mx-1">|</span>

          <span className="text-zinc-500 font-semibold uppercase tracking-wider">Status:</span>
          {(['TODOS', 'OPERACIONAL', 'BAIXADA', 'EM_MANUTENCAO', 'RESERVA'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                statusFilter === s
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              {s === 'TODOS'
                ? 'Todos'
                : s === 'OPERACIONAL'
                ? 'Operacionais'
                : s === 'BAIXADA'
                ? 'Baixadas'
                : s === 'EM_MANUTENCAO'
                ? 'Em Manutenção'
                : 'Reserva'}
            </button>
          ))}
        </div>
      </div>

      {/* Banner de Viaturas em Patrulhamento / Final de Serviço */}
      {/* Painel de acompanhamento operacional — Administradores */}
      {isAdmin && (
        <section className="mb-5 rounded-2xl border border-emerald-700/50 bg-emerald-950/30 shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-800/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Viaturas em Operação / Cauteladas</h2>
                <p className="text-[11px] text-emerald-300">
                  Acompanhamento em tempo real das viaturas retiradas para patrulhamento.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-600/40 text-emerald-300 text-xs font-bold">
              {cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO').length} em operação
            </span>
          </div>
          <div className="p-3">
            {cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO').length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500">
                Nenhuma viatura cautelada no momento.
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {cautelas
                  .filter((c) => c.status === 'EM_PATRULHAMENTO')
                  .map((c) => (
                    <div key={c.id} className="rounded-xl border border-emerald-800/50 bg-zinc-950/70 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-white">{c.prefixoViatura}</div>
                          <div className="text-[10px] uppercase text-zinc-500">
                            {c.tipoViatura === 'QUATRO_RODAS' ? '04 rodas' : 'Motocicleta'} • {c.numeroTermo}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400">EM OPERAÇÃO</span>
                      </div>
                      <div className="mt-2 space-y-1 text-[11px]">
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span><strong>Condutor:</strong> {c.condutorGraduacao} {c.condutorNome}</span>
                        </div>
                        {c.condutorRE && (
                          <div className="text-zinc-400 pl-5">RE: {c.condutorRE}</div>
                        )}
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Saída: {formatDate(c.dataHoraSaida)}</span>
                        </div>
                        <div className="text-zinc-400">KM saída: {formatKm(c.kmSaida)}</div>
                      </div>
                      {onOpenDescautelaForVehicle && (
                        <button
                          onClick={() => onOpenDescautelaForVehicle(c)}
                          className="mt-3 w-full rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 py-2 text-[11px] font-bold transition"
                        >
                          DEVOLUÇÃO / VER RETORNO
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

      )}

      {cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO').length > 0 && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-900/60 text-emerald-400 flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-emerald-100">
                {cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO').length} viatura(s) em patrulhamento operacional ativo
              </span>
              <p className="text-[11px] text-emerald-300/80">
                Ao término do turno policial, registre a devolução para encerramento de serviço e conferência de avarias.
              </p>
            </div>
          </div>
          {onOpenDescautelaForVehicle && (
            <button
              onClick={() => {
                const first = cautelas.find((c) => c.status === 'EM_PATRULHAMENTO');
                if (first) onOpenDescautelaForVehicle(first);
              }}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow transition cursor-pointer whitespace-nowrap"
              title="Devolver viatura que finalizou o turno"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>DEVOLVER VIATURA</span>
            </button>
          )}
        </div>
      )}

      {/* Grid or Table of Vehicles */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-1" />
          <h3 className="text-base font-bold text-zinc-300">Nenhuma viatura encontrada</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Não há viaturas que correspondam aos filtros de busca selecionados.
          </p>
          <button
            onClick={onOpenNewVehicle}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Nova Viatura</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => {
            const statusInfo = getStatusBadgeInfo(vehicle.status);
            const activeCautela = cautelas.find(
              (c) => c.viaturaId === vehicle.id && c.status === 'EM_PATRULHAMENTO'
            );
            const vehicleAlerts = alerts.filter(
              (a) => a.viaturaId === vehicle.id && a.severidade !== 'NORMAL'
            );
            const hasCritical = vehicleAlerts.some((a) => a.severidade === 'CRITICO');

            return (
              <div
                key={vehicle.id}
                id={`card-viatura-${vehicle.prefixo}`}
                className={`bg-zinc-900 border rounded-xl overflow-hidden transition hover:shadow-lg flex flex-col justify-between ${
                  activeCautela
                    ? 'border-emerald-600/70 shadow-emerald-950/20'
                    : hasCritical
                    ? 'border-rose-700/60 shadow-rose-950/20'
                    : vehicle.status === 'BAIXADA' || vehicle.status === 'MANUTENCAO_EXTERNA'
                    ? 'border-rose-800/40'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  {/* Top Card Bar */}
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-zinc-850 text-amber-400 border border-zinc-750">
                        {vehicle.tipo === 'MOTOCICLETA' ? (
                          <Bike className="w-4 h-4" />
                        ) : (
                          <Car className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-lg text-zinc-100 tracking-tight">
                            {vehicle.prefixo}
                          </span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {vehicle.placa || 'OFICIAL'}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {vehicle.marca} {vehicle.modelo} ({vehicle.ano})
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-1">
                      {activeCautela ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>EM SERVIÇO</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Active Cautela Banner if in field */}
                    {activeCautela && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-700/70 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                        <div className="flex items-center space-x-2 truncate mr-1">
                          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">
                            <strong className="text-emerald-300">Em Patrulhamento:</strong> {activeCautela.condutorGraduacao} {activeCautela.condutorNome}
                          </span>
                        </div>
                        {onOpenDescautelaForVehicle && (
                          <button
                            onClick={() => onOpenDescautelaForVehicle(activeCautela)}
                            className="flex items-center justify-center space-x-1 px-2 py-1 rounded text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition cursor-pointer whitespace-nowrap shadow"
                            title="Descautelar Viatura no Final do Serviço"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Descautelar (Fim de Turno)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Pelotão & Condutor */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-zinc-500 font-medium">Pelotão:</span>
                        <span className="text-zinc-200 font-medium text-right">{vehicle.pelotao}</span>
                      </div>
                      {vehicle.condutorPadrao && (
                        <div className="flex items-center justify-between text-zinc-400">
                          <span className="text-zinc-500 font-medium">Condutor Padrão:</span>
                          <span className="text-zinc-300 text-right truncate max-w-[180px]">
                            {vehicle.condutorPadrao}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Odômetro Atual e Atualização */}
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-500">Odômetro Atual</div>
                        <div className="text-base font-black font-mono text-amber-400">
                          {formatKm(vehicle.kmAtual)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Atualizado em {formatDate(vehicle.dataUltimaAtualizacaoKm)}
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenOdometer(vehicle)}
                        title="Atualizar odômetro"
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-semibold border border-zinc-700 transition cursor-pointer"
                      >
                        <Gauge className="w-3.5 h-3.5 text-amber-400" />
                        <span>+ KM</span>
                      </button>
                    </div>

                    {/* Motivo da baixa e identificação da oficina */}
                    {(vehicle.status === 'BAIXADA' || vehicle.status === 'EM_MANUTENCAO' || vehicle.status === 'MANUTENCAO_EXTERNA') && vehicle.motivoBaixa && (
                      <div className={`p-2.5 border rounded-lg text-xs flex items-start space-x-2 ${vehicle.status === 'MANUTENCAO_EXTERNA' ? 'bg-sky-950/40 border-sky-800/60 text-sky-200' : vehicle.status === 'EM_MANUTENCAO' ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' : 'bg-rose-950/40 border-rose-800/60 text-rose-300'}`}>
                        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${vehicle.status === 'MANUTENCAO_EXTERNA' ? 'text-sky-400' : vehicle.status === 'EM_MANUTENCAO' ? 'text-amber-400' : 'text-rose-400'}`} />
                        <div>
                          <span className="font-bold">{vehicle.status === 'MANUTENCAO_EXTERNA' ? 'Manutenção externa — oficina / observação:' : vehicle.status === 'EM_MANUTENCAO' ? 'Manutenção interna — observação:' : 'Motivo da Baixa:'}</span> {vehicle.motivoBaixa}
                        </div>
                      </div>
                    )}

                    {/* Alertas Ativos da Viatura */}
                    {vehicleAlerts.length > 0 && (
                      <div className="space-y-1">
                        {vehicleAlerts.map((al) => (
                          <div
                            key={al.id}
                            className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-between ${
                              al.severidade === 'CRITICO'
                                ? 'bg-rose-950/50 text-rose-300 border border-rose-800/50'
                                : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate mr-1">
                              <AlertTriangle
                                className={`w-3.5 h-3.5 flex-shrink-0 ${
                                  al.severidade === 'CRITICO' ? 'text-rose-400' : 'text-amber-400'
                                }`}
                              />
                              <span className="truncate">{al.nomeItem}</span>
                            </div>
                            <span className="font-mono font-bold whitespace-nowrap">
                              {al.kmRestante <= 0 ? 'VENCIDO' : `${al.kmRestante} km`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observações */}
                    {vehicle.observacoes && (
                      <div className="text-[11px] text-zinc-400 italic line-clamp-2">
                        "{vehicle.observacoes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-4 py-2.5 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between gap-1">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <button
                      onClick={() => setVehicleForHistory(vehicle)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs font-semibold text-sky-300 hover:text-sky-200 bg-sky-950/40 hover:bg-sky-900/50 border border-sky-800/60 rounded-lg transition cursor-pointer"
                      title={`Consultar histórico da viatura ${vehicle.prefixo}`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Histórico</span>
                    </button>
                    {/* Descautelar Button if active cautela */}
                    {activeCautela && onOpenDescautelaForVehicle && (
                      <button
                        onClick={() => onOpenDescautelaForVehicle(activeCautela)}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                        title="Descautelar viatura ao final do serviço (conferência de retorno)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>DEVOLVER VIATURA</span>
                      </button>
                    )}

                    {/* Cautelar Button if available */}
                    {!activeCautela && (vehicle.status === 'OPERACIONAL' || vehicle.status === 'RESERVA') && onOpenNewCautelaForVehicle && (
                      <button
                        onClick={() => onOpenNewCautelaForVehicle(vehicle)}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 hover:bg-emerald-950 border border-emerald-800/60 rounded-lg transition cursor-pointer"
                        title="Registrar Cautela de Saída para o Serviço"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Cautelar</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => onOpenMaintenanceForVehicle(vehicle)}
                        className="flex items-center space-x-1 text-xs font-semibold text-amber-400 hover:text-amber-300 px-2 py-1 transition cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>O.S.</span>
                      </button>
                    )}
                  </div>

                  {canSendToDischarge && (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenDischargeModal(vehicle)}
                        title={`Enviar ${vehicle.tipo === 'MOTOCICLETA' ? 'motocicleta' : 'viatura de 04 rodas'} para descarga por inservibilidade`}
                        aria-label={`Enviar ${vehicle.prefixo} para descarga por inservibilidade`}
                        className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                          (vehicle.motivoBaixa || '').toLocaleLowerCase().includes('descarga por inservibilidade')
                            ? 'bg-orange-500/20 border-orange-500/70 text-orange-200'
                            : 'bg-orange-950/50 border-orange-700/60 text-orange-300 hover:bg-orange-900/70 hover:border-orange-500'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Enviar para descarga</span>
                      </button>
                      {vehicle.status === 'BAIXADA' && !(vehicle.motivoBaixa || '').toLocaleLowerCase().includes('descarga por inservibilidade') && (
                        <button
                          type="button"
                          onClick={() => setStatusModal({ vehicle, targetStatus: 'MANUTENCAO_EXTERNA', reason: '' })}
                          title={`Encaminhar ${vehicle.prefixo} para oficina externa`}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-sky-700/70 bg-sky-950/60 text-sky-200 hover:bg-sky-900/70 text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                        >
                          <Wrench className="w-4 h-4" />
                          <span>Enviar para oficina externa</span>
                        </button>
                      )}
                      {!isMechanic && <button
                        onClick={() => handleOpenStatusModal(vehicle)}
                        title={vehicle.status === 'OPERACIONAL' ? 'Baixar viatura' : 'Liberar como Operacional'}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                          vehicle.status === 'OPERACIONAL'
                            ? 'bg-zinc-800 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-300'
                            : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300'
                        }`}
                      >
                        {vehicle.status === 'OPERACIONAL' ? 'Baixar' : 'Pronta'}
                      </button>}

                      {vehicle.status === 'BAIXADA' && !(vehicle.motivoBaixa || '').toLocaleLowerCase().includes('descarga por inservibilidade') && (
                        <button
                          type="button"
                          onClick={() => setStatusModal({ vehicle, targetStatus: 'MANUTENCAO_EXTERNA', reason: '' })}
                          title={`Encaminhar ${vehicle.prefixo} para oficina externa`}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-sky-700/70 bg-sky-950/60 text-sky-200 hover:bg-sky-900/70 text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                        >
                          <Wrench className="w-4 h-4" />
                          <span>Enviar para oficina externa</span>
                        </button>
                      )}
                      {!isMechanic && <button
                        onClick={() => onEditVehicle(vehicle)}
                        title="Editar viatura"
                        className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>}

                      <button
                        onClick={() => setVehicleToDelete(vehicle)}
                        title="Excluir viatura"
                        className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* High Density Tactical Table */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Prefixo / Tipo</th>
                  <th className="py-3 px-4">Modelo / Ano</th>
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-4">Odômetro</th>
                  <th className="py-3 px-4">Pelotão</th>
                  <th className="py-3 px-4">Status / Cautela</th>
                  <th className="py-3 px-4">Alertas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredVehicles.map((vehicle) => {
                  const statusInfo = getStatusBadgeInfo(vehicle.status);
                  const activeCautela = cautelas.find(
                    (c) => c.viaturaId === vehicle.id && c.status === 'EM_PATRULHAMENTO'
                  );
                  const vehicleAlerts = alerts.filter(
                    (a) => a.viaturaId === vehicle.id && a.severidade !== 'NORMAL'
                  );
                  const hasCritical = vehicleAlerts.some((a) => a.severidade === 'CRITICO');

                  return (
                    <tr key={vehicle.id} className="hover:bg-zinc-850/50 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="p-1 rounded bg-zinc-800 text-amber-400">
                            {vehicle.tipo === 'MOTOCICLETA' ? (
                              <Bike className="w-3.5 h-3.5" />
                            ) : (
                              <Car className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span className="font-mono font-bold text-zinc-100">{vehicle.prefixo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-300 font-medium">
                        {vehicle.marca} {vehicle.modelo} ({vehicle.ano})
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">{vehicle.placa || '-'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {formatKm(vehicle.kmAtual)}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">{vehicle.pelotao}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {activeCautela ? (
                          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>EM PATRULHAMENTO</span>
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.label}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasCritical ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-700/50">
                            VENCIDO
                          </span>
                        ) : vehicleAlerts.length > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-700/50">
                            PRÓXIMO
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Em dia</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {activeCautela && onOpenDescautelaForVehicle ? (
                            <button
                              onClick={() => onOpenDescautelaForVehicle(activeCautela)}
                              title="Descautelar viatura ao final do serviço"
                              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm transition cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Descautelar (Fim de Turno)</span>
                            </button>
                          ) : (vehicle.status === 'OPERACIONAL' || vehicle.status === 'RESERVA') && onOpenNewCautelaForVehicle ? (
                            <button
                              onClick={() => onOpenNewCautelaForVehicle(vehicle)}
                              title="Cautelar Viatura"
                              className="p-1 rounded bg-zinc-800 hover:bg-emerald-950 text-emerald-400 transition cursor-pointer"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                            </button>
                          ) : null}

                          <button
                            onClick={() => onOpenOdometer(vehicle)}
                            title="Atualizar odômetro"
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-750 text-amber-400 transition"
                          >
                            <Gauge className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => onOpenMaintenanceForVehicle(vehicle)}
                                title="Nova O.S."
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-750 text-amber-400 transition"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDischargeModal(vehicle)}
                                title={`Enviar ${vehicle.tipo === 'MOTOCICLETA' ? 'motocicleta' : 'viatura de 04 rodas'} para descarga por inservibilidade`}
                                aria-label={`Enviar ${vehicle.prefixo} para descarga por inservibilidade`}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-orange-950/60 hover:bg-orange-900/80 text-orange-300 border border-orange-700/60 font-bold transition"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Descarga</span>
                              </button>
                              <button
                                onClick={() => onEditVehicle(vehicle)}
                                title="Editar"
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setVehicleToDelete(vehicle)}
                                title="Excluir"
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-750 text-rose-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-App Delete Vehicle Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Excluir Viatura da Frota?
                </h3>
                <p className="text-xs text-zinc-400">
                  Prefixo {vehicleToDelete.prefixo} • {vehicleToDelete.modelo}
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Placa:</span>
                <span className="font-mono text-zinc-200">{vehicleToDelete.placa || 'OFICIAL'}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Pelotão:</span>
                <span className="text-zinc-200">{vehicleToDelete.pelotao}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Odômetro:</span>
                <span className="font-mono text-amber-400">{formatKm(vehicleToDelete.kmAtual)}</span>
              </div>
            </div>

            <p className="text-xs text-rose-300">
              Atenção: Esta ação removerá definitivamente a viatura do cadastro da frota e do histórico operacional.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow transition cursor-pointer"
              >
                Sim, Excluir Viatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Status Toggle Modal (Baixar / Liberar) */}

      {/* Histórico individual da viatura */}
      {vehicleForHistory && (() => {
        const vehicle = vehicleForHistory;
        const vehicleMaintenance = maintenanceRecords
          .filter((record) => record.viaturaId === vehicle.id)
          .sort((a, b) => `${b.dataEntrada || ''}`.localeCompare(a.dataEntrada || ''));
        const vehicleCautelas = cautelas
          .filter((record) => record.viaturaId === vehicle.id)
          .sort((a, b) => `${b.dataHoraSaida || ''}`.localeCompare(a.dataHoraSaida || ''));
        const historyItems = [
          ...vehicleMaintenance.map((record) => ({
            id: `maintenance-${record.id}`,
            date: record.dataEntrada || '',
            kind: 'MANUTENÇÃO',
            title: record.numeroOS || 'Ordem de serviço',
            status: record.status.replace(/_/g, ' '),
            details: record.descricaoProblema || 'Sem descrição do problema',
            extra: [
              record.tipoManutencao === 'PREVENTIVA' ? 'Preventiva' : 'Corretiva',
              record.servicosExecutados ? `Serviços: ${record.servicosExecutados}` : '',
              record.oficinaResponsavel ? `Oficina: ${record.oficinaResponsavel}` : '',
              record.mecanicoResponsavel ? `Responsável: ${record.mecanicoResponsavel}` : '',
              `KM: ${Number(record.kmEntrada || 0).toLocaleString('pt-BR')}`,
              record.pecasSubstituidas?.length ? `Peças: ${record.pecasSubstituidas.map((part) => part.nome).join(', ')}` : '',
            ].filter(Boolean).join(' • '),
          })),
          ...vehicleCautelas.map((record) => ({
            id: `cautela-${record.id}`,
            date: record.dataHoraSaida || '',
            kind: 'CAUTELA / DEVOLUÇÃO',
            title: record.numeroTermo || 'Registro de cautela',
            status: record.status === 'EM_PATRULHAMENTO' ? 'EM SERVIÇO' : 'DEVOLVIDA',
            details: `${record.condutorGraduacao || ''} ${record.condutorNome || 'Condutor'} (RE ${record.condutorRE || 'não informado'})`.trim(),
            extra: [
              `Saída: ${record.dataHoraSaida ? record.dataHoraSaida.replace('T', ' ') : '—'}`,
              `KM saída: ${Number(record.kmSaida || 0).toLocaleString('pt-BR')}`,
              record.dataHoraRetorno ? `Devolução: ${record.dataHoraRetorno.replace('T', ' ')}` : 'Ainda não devolvida',
              record.kmRetorno !== undefined ? `KM retorno: ${Number(record.kmRetorno).toLocaleString('pt-BR')}` : '',
              record.kmPercorrido !== undefined ? `Percorrido: ${Number(record.kmPercorrido).toLocaleString('pt-BR')} km` : '',
              record.combustivelSaida ? `Combustível saída: ${record.combustivelSaida}` : '',
              record.combustivelRetorno ? `Combustível retorno: ${record.combustivelRetorno}` : '',
              record.observacoesSaida ? `Obs. saída: ${record.observacoesSaida}` : '',
              record.observacoesRetorno ? `Obs. devolução: ${record.observacoesRetorno}` : '',
              record.houveAvaria ? `AVARIA: ${record.descricaoAvaria || 'registrada no retorno'}` : '',
              record.checklistSaida?.some((item) => !item.conforme) ? 'Checklist de saída contém itens não conformes' : '',
              record.checklistRetorno?.some((item) => !item.conforme) ? 'Checklist de retorno contém itens não conformes' : '',
              (record.fotosAvariasSaida?.length || 0) + (record.fotosAvariasRetorno?.length || 0) > 0
                ? `Fotos de avarias: ${(record.fotosAvariasSaida?.length || 0) + (record.fotosAvariasRetorno?.length || 0)}`
                : '',
            ].filter(Boolean).join(' • '),
          })),
        ].sort((a, b) => b.date.localeCompare(a.date));

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Histórico da viatura ${vehicle.prefixo}`}>
            <div className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl flex flex-col">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sky-300">
                    <History className="w-5 h-5" />
                    <h2 className="text-lg font-bold text-white">Histórico da Viatura {vehicle.prefixo}</h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {vehicle.tipo === 'QUATRO_RODAS' ? 'Viatura de 04 rodas' : 'Motocicleta'} • {vehicle.marca} {vehicle.modelo} • Placa {vehicle.placa || 'não informada'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Situação: <span className="text-amber-300 font-semibold">{vehicle.status.replace(/_/g, ' ')}</span> • KM atual: <span className="text-white font-semibold">{Number(vehicle.kmAtual || 0).toLocaleString('pt-BR')}</span>
                  </p>
                </div>
                <button onClick={() => setVehicleForHistory(null)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800" aria-label="Fechar histórico">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-5 py-3 border-b border-zinc-800 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-zinc-900 p-3"><div className="text-[10px] uppercase text-zinc-500">Manutenções</div><div className="text-xl font-bold text-amber-300">{vehicleMaintenance.length}</div></div>
                <div className="rounded-lg bg-zinc-900 p-3"><div className="text-[10px] uppercase text-zinc-500">Cautelas</div><div className="text-xl font-bold text-emerald-300">{vehicleCautelas.length}</div></div>
                <div className="rounded-lg bg-zinc-900 p-3"><div className="text-[10px] uppercase text-zinc-500">KM atual</div><div className="text-xl font-bold text-white">{Number(vehicle.kmAtual || 0).toLocaleString('pt-BR')}</div></div>
              </div>
              <div className="overflow-y-auto p-5 space-y-3">
                {historyItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
                    <History className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-300">Nenhum histórico registrado para esta viatura</p>
                    <p className="text-xs text-zinc-500 mt-1">As próximas manutenções, cautelas e devoluções vinculadas a esta viatura aparecerão aqui.</p>
                  </div>
                ) : historyItems.map((item) => (
                  <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block rounded px-2 py-1 text-[10px] font-bold tracking-wide ${item.kind === 'MANUTENÇÃO' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>{item.kind}</span>
                        <h3 className="mt-2 text-sm font-bold text-white">{item.title}</h3>
                        <p className="text-xs text-zinc-300 mt-1">{item.details}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">{item.date ? item.date.replace('T', ' ') : 'Data não informada'}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase text-sky-300">{item.status}</div>
                      </div>
                    </div>
                    {item.extra && <p className="mt-3 pt-3 border-t border-zinc-800 text-xs leading-5 text-zinc-400 break-words">{item.extra}</p>}
                  </article>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-zinc-800 flex justify-end">
                <button onClick={() => setVehicleForHistory(null)} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-white">Fechar histórico</button>
              </div>
            </div>
          </div>
        );
      })()}

      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    statusModal.targetStatus === 'BAIXADA'
                      ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                      : 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                  }`}
                >
                  {statusModal.targetStatus === 'BAIXADA' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {statusModal.targetStatus === 'BAIXADA'
                      ? `Baixar Viatura ${statusModal.vehicle.prefixo}`
                      : `Liberar Viatura ${statusModal.vehicle.prefixo}`}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {statusModal.vehicle.modelo} • Pelotão {statusModal.vehicle.pelotao}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatusModal(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Novo Status da Viatura *
                </label>
                <select
                  value={statusModal.targetStatus}
                  onChange={(e) =>
                    setStatusModal({
                      ...statusModal,
                      targetStatus: e.target.value as VehicleStatus,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="OPERACIONAL">OPERACIONAL (Pronta para o serviço)</option>
                  <option value="BAIXADA">BAIXADA (Com falha / avaria mecânica / fora de serviço)</option>
                  <option value="EM_MANUTENCAO">MANUTENÇÃO INTERNA (Oficina da unidade)</option>
                  <option value="MANUTENCAO_EXTERNA">MANUTENÇÃO EXTERNA (Oficina particular / concessionária)</option>
                  <option value="RESERVA">RESERVA TÁTICA (Disponível no quartel)</option>
                </select>
              </div>

              {(statusModal.targetStatus === 'BAIXADA' || statusModal.targetStatus === 'EM_MANUTENCAO' || statusModal.targetStatus === 'MANUTENCAO_EXTERNA') ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      Nome da oficina externa / motivo da baixa / serviço
                    </label>
                    {isAdmin && statusModal.targetStatus === 'BAIXADA' && (
                      <button
                        type="button"
                        onClick={() =>
                          setStatusModal({
                            ...statusModal,
                            reason: statusModal.reason.startsWith('DESCARGA POR INSERVIBILIDADE —')
                              ? statusModal.reason
                              : `DESCARGA POR INSERVIBILIDADE — ${statusModal.reason.trim()}`.trim(),
                          })
                        }
                        className="px-2.5 py-1 rounded-md border border-rose-700/70 bg-rose-950/40 text-rose-200 hover:bg-rose-900/60 text-[10px] font-bold transition"
                      >
                        Registrar descarga por inservibilidade
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={statusModal.reason}
                    onChange={(e) =>
                      setStatusModal({ ...statusModal, reason: e.target.value })
                    }
                    placeholder={statusModal.targetStatus === 'MANUTENCAO_EXTERNA' ? 'Informe o NOME DA OFICINA EXTERNA e o serviço/defeito. Ex.: Oficina Central — reparo do motor.' : statusModal.targetStatus === 'EM_MANUTENCAO' ? 'Informe o defeito e os serviços da manutenção interna.' : 'Informe o defeito ou, para descarga, registre a inservibilidade e a justificativa...'}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    A viatura não poderá ser cautelada enquanto estiver baixada. Para registrar uma descarga por inservibilidade, use a opção acima e descreva a justificativa no campo.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl">
                  <p className="text-xs text-emerald-200">
                    A viatura <strong className="text-white">{statusModal.vehicle.prefixo}</strong> ficará disponível para cautela e patrulhamento tático.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStatusModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg shadow bg-amber-500 hover:bg-amber-400 text-zinc-950 transition cursor-pointer"
                >
                  Salvar Alteração de Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};