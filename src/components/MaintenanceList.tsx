import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { MaintenanceRecord, MaintenanceType, MaintenanceStatus } from '../types';
import {
  Wrench,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bike,
  Car,
  FileText,
  Trash2,
  Edit2,
  Eye,
  Printer,
  X,
  CheckCheck,
  Building2,
  Shield
} from 'lucide-react';
import { formatDate, formatKm, getCategoryLabel, getStatusBadgeInfo } from '../utils/formatters';

interface MaintenanceListProps {
  onOpenNewMaintenance: () => void;
  onEditMaintenance: (record: MaintenanceRecord) => void;
  onPrintOS?: (record: MaintenanceRecord) => void;
}

export const MaintenanceList: React.FC<MaintenanceListProps> = ({
  onOpenNewMaintenance,
  onEditMaintenance,
  onPrintOS,
}) => {
  const { maintenanceRecords, deleteMaintenanceRecord, vehicles } = useFleet();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | MaintenanceType>('TODOS');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | MaintenanceStatus>('TODOS');
  const [filterVehicleType, setFilterVehicleType] = useState<'TODAS' | 'MOTOCICLETA' | 'QUATRO_RODAS'>('TODAS');
  const [filterOficina, setFilterOficina] = useState<'TODAS' | 'INTERNA' | 'EXTERNA'>('TODAS');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<MaintenanceRecord | null>(null);

  // Filtered records
  const filteredRecords = maintenanceRecords.filter((rec) => {
    const query = search.toLowerCase();
    const matchSearch =
      rec.numeroOS.toLowerCase().includes(query) ||
      rec.prefixoViatura.toLowerCase().includes(query) ||
      rec.descricaoProblema.toLowerCase().includes(query) ||
      rec.oficinaResponsavel.toLowerCase().includes(query) ||
      rec.policialSolicitante.toLowerCase().includes(query);

    const matchType = filterType === 'TODOS' || rec.tipoManutencao === filterType;
    const matchStatus = filterStatus === 'TODOS' || rec.status === filterStatus;
    const matchVtrType = filterVehicleType === 'TODAS' || rec.tipoViatura === filterVehicleType;
    
    const isExterna = rec.tipoOficina === 'EXTERNA' || (!rec.oficinaResponsavel.toLowerCase().includes('rocam') && !rec.oficinaResponsavel.toLowerCase().includes('central'));
    const matchOficina =
      filterOficina === 'TODAS' ||
      (filterOficina === 'EXTERNA' ? isExterna : !isExterna);

    return matchSearch && matchType && matchStatus && matchVtrType && matchOficina;
  });

  const totalPreventivas = filteredRecords.filter((r) => r.tipoManutencao === 'PREVENTIVA').length;
  const totalCorretivas = filteredRecords.filter((r) => r.tipoManutencao === 'CORRETIVA').length;
  const totalConcluidas = filteredRecords.filter((r) => r.status === 'CONCLUIDA').length;
  const totalExternas = filteredRecords.filter(
    (r) => r.tipoOficina === 'EXTERNA' || (!r.oficinaResponsavel.toLowerCase().includes('rocam') && !r.oficinaResponsavel.toLowerCase().includes('central'))
  ).length;
  const emAndamento = filteredRecords.filter(
    (r) => r.status === 'EM_EXECUCAO' || r.status === 'AGUARDANDO_PECAS'
  ).length;

  const handleDelete = (id: string, numeroOS: string) => {
    if (window.confirm(`Confirma a exclusão da ordem de serviço ${numeroOS}?`)) {
      deleteMaintenanceRecord(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Operational Volume & Status KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase text-zinc-400">Total de O.S.</div>
          <div className="mt-1 text-2xl font-black font-mono text-zinc-100">
            {filteredRecords.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {totalPreventivas} Prev • {totalCorretivas} Corr • {totalExternas} Ext
          </div>
        </div>

        <div className="bg-zinc-900 border border-amber-900/40 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase text-amber-400">Em Execução</div>
          <div className="mt-1 text-2xl font-black font-mono text-amber-400">{emAndamento}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Na oficina no momento</div>
        </div>

        <div className="bg-zinc-900 border border-blue-900/40 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase text-blue-400">Preventivas</div>
          <div className="mt-1 text-2xl font-black font-mono text-blue-400">{totalPreventivas}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Revisões programadas</div>
        </div>

        <div className="bg-zinc-900 border border-emerald-900/40 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-semibold uppercase text-emerald-400">O.S. Concluídas</div>
          <div className="mt-1 text-2xl font-black font-mono text-emerald-400">
            {totalConcluidas}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {filteredRecords.length > 0
              ? `${Math.round((totalConcluidas / filteredRecords.length) * 100)}% finalizadas`
              : 'Nenhum registro'}
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              id="input-busca-manutencao"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por Nº da O.S., Prefixo, Problema, Peça ou Responsável..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-750 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            id="btn-nova-os-lista"
            onClick={onOpenNewMaintenance}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-sm font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Nova O.S.</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800 text-xs">
          <span className="text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Tipo O.S.:
          </span>
          {(['TODOS', 'PREVENTIVA', 'CORRETIVA'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                filterType === t
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              {t === 'TODOS' ? 'Todas' : t === 'PREVENTIVA' ? 'Preventivas' : 'Corretivas'}
            </button>
          ))}

          <span className="text-zinc-600 mx-1">|</span>

          <span className="text-zinc-500 font-semibold uppercase tracking-wider">Viatura:</span>
          {(['TODAS', 'MOTOCICLETA', 'QUATRO_RODAS'] as const).map((vt) => (
            <button
              key={vt}
              onClick={() => setFilterVehicleType(vt)}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                filterVehicleType === vt
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              {vt === 'TODAS' ? 'Todas' : vt === 'MOTOCICLETA' ? 'Motos' : '04 Rodas'}
            </button>
          ))}

          <span className="text-zinc-600 mx-1">|</span>

          <span className="text-zinc-500 font-semibold uppercase tracking-wider">Status:</span>
          {(['TODOS', 'EM_EXECUCAO', 'AGUARDANDO_PECAS', 'CONCLUIDA', 'AGENDADA'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                filterStatus === st
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              {st === 'TODOS'
                ? 'Todos'
                : st === 'EM_EXECUCAO'
                ? 'Em Execução'
                : st === 'AGUARDANDO_PECAS'
                ? 'Aguardando Peças'
                : st === 'CONCLUIDA'
                ? 'Concluídas'
                : 'Agendadas'}
            </button>
          ))}

          <span className="text-zinc-600 mx-1">|</span>

          <span className="text-zinc-500 font-semibold uppercase tracking-wider">Local:</span>
          {(['TODAS', 'INTERNA', 'EXTERNA'] as const).map((loc) => (
            <button
              key={loc}
              onClick={() => setFilterOficina(loc)}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                filterOficina === loc
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
              }`}
            >
              {loc === 'EXTERNA' && <Building2 className="w-3 h-3" />}
              {loc === 'INTERNA' && <Shield className="w-3 h-3" />}
              <span>{loc === 'TODAS' ? 'Todas Oficinas' : loc === 'INTERNA' ? 'Interna ROCAM' : 'Oficina Externa'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Maintenance Records Table */}
      {filteredRecords.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <Wrench className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-300">Nenhum registro de manutenção</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Não foram encontradas Ordens de Serviço com os critérios selecionados.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">O.S. / Data</th>
                  <th className="py-3 px-4">Viatura</th>
                  <th className="py-3 px-4">Tipo & Categoria</th>
                  <th className="py-3 px-4">Descrição do Serviço / Avaria</th>
                  <th className="py-3 px-4">Oficina / Mecânico</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Itens / Peças</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRecords.map((rec) => {
                  const statusInfo = getStatusBadgeInfo(rec.status);
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-zinc-850/50 transition cursor-pointer"
                      onClick={() => setSelectedRecordForDetail(rec)}
                    >
                      {/* O.S. e Data */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-zinc-100">{rec.numeroOS}</div>
                        <div className="text-[10px] text-zinc-500">{formatDate(rec.dataEntrada)}</div>
                      </td>

                      {/* Viatura */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="p-1 rounded bg-zinc-800 text-amber-400">
                            {rec.tipoViatura === 'MOTOCICLETA' ? (
                              <Bike className="w-3.5 h-3.5" />
                            ) : (
                              <Car className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span className="font-mono font-bold text-zinc-100">
                            {rec.prefixoViatura}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          KM: {rec.kmEntrada.toLocaleString('pt-BR')}
                        </div>
                      </td>

                      {/* Tipo & Categoria */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                            rec.tipoManutencao === 'PREVENTIVA'
                              ? 'bg-blue-950/80 text-blue-300 border border-blue-700/50'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
                          }`}
                        >
                          {rec.tipoManutencao}
                        </span>
                        <div className="text-zinc-300 font-medium">
                          {getCategoryLabel(rec.categoria)}
                        </div>
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-zinc-200 line-clamp-1 font-medium">
                          {rec.descricaoProblema}
                        </div>
                        {rec.pecasSubstituidas && rec.pecasSubstituidas.length > 0 && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1">
                            Peças: {rec.pecasSubstituidas.map((p) => p.nome).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Oficina / Mecânico */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {rec.tipoOficina === 'EXTERNA' || (!rec.oficinaResponsavel.toLowerCase().includes('rocam') && !rec.oficinaResponsavel.toLowerCase().includes('central')) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              <Building2 className="w-2.5 h-2.5" /> Externa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-800 text-zinc-400">
                              <Shield className="w-2.5 h-2.5" /> Interna
                            </span>
                          )}
                          <span className="text-zinc-300 font-medium truncate max-w-[180px]">{rec.oficinaResponsavel}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Mec: {rec.mecanicoResponsavel}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Itens / Peças */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {rec.pecasSubstituidas && rec.pecasSubstituidas.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-xs font-semibold text-zinc-300">
                            {rec.pecasSubstituidas.reduce((acc, p) => acc + p.quantidade, 0)} un ({rec.pecasSubstituidas.length} {rec.pecasSubstituidas.length === 1 ? 'item' : 'itens'})
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">-</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedRecordForDetail(rec)}
                            title="Ver Detalhes"
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditMaintenance(rec)}
                            title="Editar O.S."
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-750 text-amber-400 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rec.id, rec.numeroOS)}
                            title="Excluir O.S."
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-750 text-rose-400 transition cursor-pointer"
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

      {/* Modal de Detalhe Completo da O.S. */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header Modal Detalhe */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {selectedRecordForDetail.numeroOS} — {selectedRecordForDetail.prefixoViatura}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Ficha Tática de Manutenção Militar • ROCAM
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Detalhe */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block font-semibold">Tipo de Manutenção</span>
                  <span
                    className={`font-bold ${
                      selectedRecordForDetail.tipoManutencao === 'PREVENTIVA'
                        ? 'text-blue-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {selectedRecordForDetail.tipoManutencao}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-semibold">Status</span>
                  <span className="font-bold text-zinc-200">
                    {getStatusBadgeInfo(selectedRecordForDetail.status).label}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-semibold">Data Entrada</span>
                  <span className="font-mono text-zinc-200">
                    {formatDate(selectedRecordForDetail.dataEntrada)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-semibold">KM Entrada</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {formatKm(selectedRecordForDetail.kmEntrada)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-semibold block uppercase mb-1">
                  Problema Relatado / Motivo
                </span>
                <p className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-200 text-sm">
                  {selectedRecordForDetail.descricaoProblema}
                </p>
              </div>

              {selectedRecordForDetail.servicosExecutados && (
                <div>
                  <span className="text-zinc-400 font-semibold block uppercase mb-1">
                    Serviços Executados pelo Mecânico
                  </span>
                  <p className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-200">
                    {selectedRecordForDetail.servicosExecutados}
                  </p>
                </div>
              )}

              {/* Peças */}
              {selectedRecordForDetail.pecasSubstituidas?.length > 0 && (
                <div>
                  <span className="text-zinc-400 font-semibold block uppercase mb-1">
                    Peças & Insumos Utilizados
                  </span>
                  <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-950 text-zinc-400 text-[10px] font-bold border-b border-zinc-800">
                        <tr>
                          <th className="py-2 px-3">Item / Peça</th>
                          <th className="py-2 px-3">Cód. Almoxarifado / Ref.</th>
                          <th className="py-2 px-3 text-center">Qtd Aplicada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {selectedRecordForDetail.pecasSubstituidas.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 text-zinc-200 font-medium">{p.nome}</td>
                            <td className="py-2 px-3 text-zinc-400 font-mono text-xs">{p.codigoPeca || '-'}</td>
                            <td className="py-2 px-3 text-center font-mono text-amber-400 font-bold">
                              {p.quantidade} un
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detalhes Operacionais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">KM Registro</span>
                  <span className="font-mono font-bold text-zinc-200 text-sm">
                    {formatKm(selectedRecordForDetail.kmEntrada)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Urgência</span>
                  <span className="font-bold text-zinc-200 text-sm">
                    {selectedRecordForDetail.urgencia}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Data Entrada</span>
                  <span className="font-mono text-zinc-200 text-sm">
                    {formatDate(selectedRecordForDetail.dataEntrada)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Data Conclusão</span>
                  <span className="font-mono text-amber-400 text-sm font-bold">
                    {selectedRecordForDetail.dataConclusao
                      ? formatDate(selectedRecordForDetail.dataConclusao)
                      : 'Em aberto'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-zinc-400">
                <div>
                  <span className="text-zinc-500">Local / Oficina:</span>{' '}
                  <span className="text-zinc-200 font-medium">{selectedRecordForDetail.oficinaResponsavel}</span>
                  {selectedRecordForDetail.tipoOficina === 'EXTERNA' && (
                    <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      Oficina Externa
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-zinc-500">Mecânico / Técnico:</span> {selectedRecordForDetail.mecanicoResponsavel}
                </div>
                {selectedRecordForDetail.cnpjOficina && (
                  <div>
                    <span className="text-zinc-500">CNPJ da Oficina:</span> {selectedRecordForDetail.cnpjOficina}
                  </div>
                )}
                {selectedRecordForDetail.numeroContratoEmpenho && (
                  <div>
                    <span className="text-zinc-500">Contrato / Empenho:</span> {selectedRecordForDetail.numeroContratoEmpenho}
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Solicitante:</span> {selectedRecordForDetail.policialSolicitante}
                </div>
                <div>
                  <span className="text-zinc-500">RE / Matrícula:</span> {selectedRecordForDetail.matriculaRE}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-950">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Imprimir O.S.</span>
              </button>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
