import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { Vehicle, VehicleType, VehicleStatus, CautelaRecord } from '../types';
import {
  Bike,
  Car,
  Search,
  Plus,
  Gauge,
  Wrench,
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

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
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

    return matchQuery && matchType && matchStatus;
  });

  const handleConfirmDelete = () => {
    if (vehicleToDelete) {
      deleteVehicle(vehicleToDelete.id);
      setVehicleToDelete(null);
    }
  };

  const handleOpenStatusModal = (vehicle: Vehicle) => {
    if (vehicle.status === 'OPERACIONAL') {
      setStatusModal({
        vehicle,
        targetStatus: 'BAIXADA',
        reason: '',
      });
    } else {
      setStatusModal({
        vehicle,
        targetStatus: 'OPERACIONAL',
        reason: '',
      });
    }
  };

  const handleConfirmStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal) return;

    if (statusModal.targetStatus === 'BAIXADA') {
      updateVehicle(statusModal.vehicle.id, {
        status: 'BAIXADA',
        motivoBaixa: statusModal.reason.trim() || 'Viatura baixada por determinação operacional.',
      });
    } else {
      updateVehicle(statusModal.vehicle.id, {
        status: 'OPERACIONAL',
        motivoBaixa: undefined,
      });
    }

    setStatusModal(null);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>Frota Total</span>
            <Shield className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-zinc-100">{stats.total}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {stats.motos} Motos • {stats.quatroRodas} 04 Rodas
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase">
            <span>Motocicletas</span>
            <Bike className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-400">{stats.motos}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Especialidade ROCAM</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold uppercase">
            <span>04 Rodas</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-blue-400">{stats.quatroRodas}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Apoio Tático & CFP</div>
        </div>

        <div className="bg-zinc-900 border border-emerald-900/40 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase">
            <span>Operacionais</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">{stats.operacionais}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Prontas para empenho</div>
        </div>

        <div className="bg-zinc-900 border border-rose-900/40 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold uppercase">
            <span>Baixadas</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-400">{stats.baixadas}</div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">Aguardando reparo</div>
        </div>

        <div className="bg-zinc-900 border border-amber-900/40 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold uppercase">
            <span>Em Manutenção</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-300">{stats.emManutencao}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Na oficina / garagem</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
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

            <button
              id="btn-cadastrar-viatura"
              onClick={onOpenNewVehicle}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Viatura</span>
            </button>
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
                Ao término do turno policial, registre a descautela para encerramento de serviço e conferência de avarias.
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
              title="Descautelar viatura que finalizou o turno"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descautelar (Fim de Serviço)</span>
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
                    : vehicle.status === 'BAIXADA'
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

                    {/* Motivo se baixada */}
                    {vehicle.status === 'BAIXADA' && vehicle.motivoBaixa && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Motivo da Baixa:</span> {vehicle.motivoBaixa}
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
                  <div className="flex items-center space-x-1.5">
                    {/* Descautelar Button if active cautela */}
                    {activeCautela && onOpenDescautelaForVehicle && (
                      <button
                        onClick={() => onOpenDescautelaForVehicle(activeCautela)}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                        title="Descautelar viatura ao final do serviço (conferência de retorno)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Descautelar (Fim de Serviço)</span>
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

                    <button
                      onClick={() => onOpenMaintenanceForVehicle(vehicle)}
                      className="flex items-center space-x-1 text-xs font-semibold text-amber-400 hover:text-amber-300 px-2 py-1 transition cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>O.S.</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenStatusModal(vehicle)}
                      title={vehicle.status === 'OPERACIONAL' ? 'Baixar viatura' : 'Liberar como Operacional'}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                        vehicle.status === 'OPERACIONAL'
                          ? 'bg-zinc-800 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-300'
                          : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300'
                      }`}
                    >
                      {vehicle.status === 'OPERACIONAL' ? 'Baixar' : 'Pronta'}
                    </button>

                    <button
                      onClick={() => onEditVehicle(vehicle)}
                      title="Editar viatura"
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setVehicleToDelete(vehicle)}
                      title="Excluir viatura"
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                          <button
                            onClick={() => onOpenMaintenanceForVehicle(vehicle)}
                            title="Nova O.S."
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-750 text-amber-400 transition"
                          >
                            <Wrench className="w-3.5 h-3.5" />
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
              {statusModal.targetStatus === 'BAIXADA' ? (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Motivo da Baixa Operacional *
                  </label>
                  <textarea
                    rows={3}
                    value={statusModal.reason}
                    onChange={(e) =>
                      setStatusModal({ ...statusModal, reason: e.target.value })
                    }
                    placeholder="Ex: Embreagem patinando, pneu dianteiro gasto, sinistro de trânsito..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                    required
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    A viatura constará como BAIXADA e não poderá ser cautelada até sua liberação.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-300">
                  Deseja restabelecer o status da viatura <span className="font-bold text-amber-400">{statusModal.vehicle.prefixo}</span> para <span className="font-bold text-emerald-400">OPERACIONAL</span>? Ela ficará disponível para cautela e patrulhamento.
                </p>
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
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow transition cursor-pointer ${
                    statusModal.targetStatus === 'BAIXADA'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {statusModal.targetStatus === 'BAIXADA'
                    ? 'Confirmar Baixa'
                    : 'Confirmar Liberação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
