import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { CautelaRecord, VehicleType } from '../types';
import {
  ClipboardCheck,
  RotateCcw,
  Search,
  Filter,
  Plus,
  Bike,
  Car,
  Clock,
  Gauge,
  Fuel,
  User,
  Shield,
  FileText,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Eye,
  Check,
  Camera
} from 'lucide-react';

interface CautelaListProps {
  onOpenNewCautela: () => void;
  onOpenDescautela: (cautela: CautelaRecord) => void;
  onViewCautelaDetail: (cautela: CautelaRecord) => void;
}

export const CautelaList: React.FC<CautelaListProps> = ({
  onOpenNewCautela,
  onOpenDescautela,
  onViewCautelaDetail,
}) => {
  const { cautelas, deleteCautela, activeCautelasCount, vehicles } = useFleet();

  const [activeSubTab, setActiveSubTab] = useState<'ativas' | 'historico'>('ativas');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'TODAS' | VehicleType>('TODAS');
  const [cautelaToDelete, setCautelaToDelete] = useState<CautelaRecord | null>(null);

  // Filtered cautelas
  const filteredCautelas = cautelas.filter((c) => {
    // Sub-tab filter
    if (activeSubTab === 'ativas' && c.status !== 'EM_PATRULHAMENTO') return false;
    if (activeSubTab === 'historico' && c.status !== 'CONCLUIDA') return false;

    // Type filter
    if (filterType !== 'TODAS' && c.tipoViatura !== filterType) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPrefix = c.prefixoViatura.toLowerCase().includes(q);
      const matchModel = c.modeloViatura.toLowerCase().includes(q);
      const matchPlate = c.placaViatura.toLowerCase().includes(q);
      const matchDriver = c.condutorNome.toLowerCase().includes(q);
      const matchRE = c.condutorRE.toLowerCase().includes(q);
      const matchTerm = c.numeroTermo.toLowerCase().includes(q);
      const matchPlatoon = c.pelotao.toLowerCase().includes(q);
      return matchPrefix || matchModel || matchPlate || matchDriver || matchRE || matchTerm || matchPlatoon;
    }

    return true;
  });

  const activeCautelas = cautelas.filter((c) => c.status === 'EM_PATRULHAMENTO');
  const historicoCautelas = cautelas.filter((c) => c.status === 'CONCLUIDA');

  // KPI Calculations
  const motosEmServico = activeCautelas.filter((c) => c.tipoViatura === 'MOTOCICLETA').length;
  const carrosEmServico = activeCautelas.filter((c) => c.tipoViatura === 'QUATRO_RODAS').length;
  const kmTotalHoje = historicoCautelas.reduce((acc, c) => acc + (c.kmPercorrido || 0), 0);
  const cautelasComAvaria = historicoCautelas.filter((c) => c.houveAvaria).length;
  const viaturasDisponiveisParaCautela = vehicles.filter(
    (v) =>
      (v.status === 'OPERACIONAL' || v.status === 'RESERVA') &&
      !activeCautelas.some((c) => c.viaturaId === v.id)
  ).length;

  const handleConfirmDelete = () => {
    if (cautelaToDelete) {
      deleteCautela(cautelaToDelete.id);
      setCautelaToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase">
            <span>Em Patrulhamento</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">{activeCautelas.length}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Viaturas Cauteladas</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase">
            <span>Motos ROCAM</span>
            <Bike className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-400">{motosEmServico}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Motocicletas em Campo</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold uppercase">
            <span>Apoio 04 Rodas</span>
            <Car className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-blue-400">{carrosEmServico}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Viaturas Pesadas</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>KM Concluídos</span>
            <Gauge className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-zinc-100">
            {kmTotalHoje.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            KM Rodados Registrados
          </div>
        </div>
      </div>

      {/* Action Controls & Navigation Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        {/* Sub-Tabs: Ativas vs Histórico */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('ativas')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'ativas'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Viaturas em Patrulhamento</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeSubTab === 'ativas' ? 'bg-zinc-950 text-emerald-400' : 'bg-zinc-900 text-zinc-400'
            }`}>
              {activeCautelas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('historico')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'historico'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Histórico de Cautelas Concluídas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeSubTab === 'historico' ? 'bg-zinc-950 text-amber-400' : 'bg-zinc-900 text-zinc-400'
            }`}>
              {historicoCautelas.length}
            </span>
          </button>
        </div>

        {/* Search, Type Filter and New Cautela Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por prefixo, militar, RE..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="TODAS">Todos os Tipos</option>
            <option value="MOTOCICLETA">Motocicletas</option>
            <option value="QUATRO_RODAS">04 Rodas</option>
          </select>

          <button
            onClick={onOpenNewCautela}
            disabled={viaturasDisponiveisParaCautela === 0}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition ml-auto md:ml-0 ${
              viaturasDisponiveisParaCautela === 0
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer'
            }`}
            title={
              viaturasDisponiveisParaCautela === 0
                ? 'Todas as viaturas operacionais já estão cauteladas em patrulhamento ou baixadas.'
                : `${viaturasDisponiveisParaCautela} viatura(s) disponível(is) para cautela.`
            }
          >
            <Plus className="w-4 h-4" />
            <span>
              + Nova Cautela
              {viaturasDisponiveisParaCautela > 0
                ? ` (${viaturasDisponiveisParaCautela} disp.)`
                : ' (0 disp.)'}
            </span>
          </button>

          {activeCautelas.length > 0 && (
            <button
              onClick={() => onOpenDescautela(activeCautelas[0])}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
              title="Descautelar viatura ao final do serviço"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Descautelar Viatura ({activeCautelas.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredCautelas.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-200">
              {activeSubTab === 'ativas'
                ? 'Nenhuma viatura cautelada em patrulhamento no momento'
                : 'Nenhum registro de cautela encontrado no histórico'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
              {activeSubTab === 'ativas'
                ? 'Todas as viaturas disponíveis estão atualmente aquarteladas na base ou em manutenção. Clique abaixo para registrar uma nova saída.'
                : 'Altere os filtros de busca ou cadastre uma nova saída operacional com checklist.'}
            </p>
          </div>
          <button
            onClick={onOpenNewCautela}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nova Cautela de Saída</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCautelas.map((cautela) => {
            const isEmPatrulhamento = cautela.status === 'EM_PATRULHAMENTO';
            const nonConformeSaida = cautela.checklistSaida.filter((c) => !c.conforme).length;

            return (
              <div
                key={cautela.id}
                className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all shadow-sm ${
                  isEmPatrulhamento
                    ? 'bg-zinc-900/90 border-emerald-800/60 hover:border-emerald-700/80 shadow-emerald-950/20'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  {/* Top card bar */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-zinc-800 text-amber-400">
                        {cautela.tipoViatura === 'MOTOCICLETA' ? (
                          <Bike className="w-5 h-5" />
                        ) : (
                          <Car className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-black text-amber-400 font-mono tracking-tight">
                            {cautela.prefixoViatura}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {cautela.placaViatura}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-zinc-200">
                          {cautela.modeloViatura}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isEmPatrulhamento ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Em Serviço
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                          <Check className="w-3 h-3 text-emerald-400" />
                          Concluída
                        </span>
                      )}
                      <div className="text-[10px] font-mono text-zinc-500 mt-1">
                        {cautela.numeroTermo}
                      </div>
                    </div>
                  </div>

                  {/* Policial Condutor Info */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-zinc-300">
                      <User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      <span className="font-semibold text-zinc-100">
                        {cautela.condutorGraduacao} {cautela.condutorNome}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500">
                        (RE {cautela.condutorRE})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Pelotão:</span>
                      <span className="text-zinc-300 truncate max-w-[180px]">{cautela.pelotao}</span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Horário de Saída:</span>
                      <span className="font-mono text-zinc-200">
                        {cautela.dataHoraSaida.replace('T', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Odômetro Saída:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {cautela.kmSaida.toLocaleString('pt-BR')} km
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Combustível Saída:</span>
                      <span className="text-zinc-200 font-medium">{cautela.combustivelSaida}</span>
                    </div>

                    {/* Retorno info if completed */}
                    {!isEmPatrulhamento && (
                      <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                          <span>Horário de Retorno:</span>
                          <span className="font-mono text-zinc-300">
                            {cautela.dataHoraRetorno?.replace('T', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                          <span>KM Percorrido no Turno:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            +{cautela.kmPercorrido?.toLocaleString('pt-BR')} km
                          </span>
                        </div>
                        {cautela.recebedorNome && (
                          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                            <span>Recebedor na Base:</span>
                            <span className="text-zinc-300 truncate max-w-[160px]">
                              {cautela.recebedorNome}
                            </span>
                          </div>
                        )}
                        {cautela.houveAvaria && (
                          <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-[11px] text-rose-300 flex items-start gap-1.5 mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">Avaria: {cautela.descricaoAvaria}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Checklist summary tag */}
                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Inspeção Checklist:</span>
                      {nonConformeSaida > 0 ? (
                        <span className="text-rose-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {nonConformeSaida} avaria(s) prévia(s)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          100% Conforme na saída
                        </span>
                      )}
                    </div>

                    {/* Fotos de avarias se existirem */}
                    {((cautela.fotosAvariasSaida?.length || 0) + (cautela.fotosAvariasRetorno?.length || 0) > 0) && (
                      <div className="pt-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">Fotos de Avarias:</span>
                        <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px]">
                          <Camera className="w-3 h-3 text-amber-400" />
                          {(cautela.fotosAvariasSaida?.length || 0) + (cautela.fotosAvariasRetorno?.length || 0)} foto(s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewCautelaDetail(cautela)}
                    className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Ver Ficha</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    {isEmPatrulhamento ? (
                      <button
                        onClick={() => onOpenDescautela(cautela)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow transition cursor-pointer"
                        title="Descautelar viatura ao final do serviço"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Descautelar (Fim de Serviço)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setCautelaToDelete(cautela)}
                        title="Excluir Registro"
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Cautela Confirmation Modal */}
      {cautelaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Excluir Registro de Cautela?
                </h3>
                <p className="text-xs text-zinc-400">
                  {cautelaToDelete.numeroTermo} • Viatura {cautelaToDelete.prefixoViatura}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Tem certeza que deseja remover este termo de cautela ({cautelaToDelete.condutorGraduacao} {cautelaToDelete.condutorNome}) do histórico? Esta ação é irreversível.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setCautelaToDelete(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow transition cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
