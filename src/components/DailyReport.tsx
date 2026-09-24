import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import {
  Calendar,
  Printer,
  Download,
  Bike,
  Car,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  RotateCcw,
  Gauge,
  Eye,
  Camera,
  ClipboardCheck
} from 'lucide-react';
import { formatDate, formatKm, getStatusBadgeInfo, getCategoryLabel } from '../utils/formatters';
import { CautelaRecord } from '../types';

interface DailyReportProps {
  onOpenDescautela?: (cautela: CautelaRecord) => void;
  onViewCautelaDetail?: (cautela: CautelaRecord) => void;
}

export const DailyReport: React.FC<DailyReportProps> = ({
  onOpenDescautela,
  onViewCautelaDetail,
}) => {
  const { vehicles, maintenanceRecords, cautelas, stats } = useFleet();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Navigate date
  const changeDateBy = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Vehicles out of service
  const baixadasOrMaintenance = vehicles.filter(
    (v) => v.status === 'BAIXADA' || v.status === 'EM_MANUTENCAO'
  );

  // Operational vehicles
  const operacionais = vehicles.filter((v) => v.status === 'OPERACIONAL' || v.status === 'RESERVA');

  // Daily records movements (entered on selectedDate or concluded on selectedDate)
  const movimentacoesDoDia = maintenanceRecords.filter(
    (r) => r.dataEntrada === selectedDate || r.dataConclusao === selectedDate
  );

  // Cautelas and Descautelas on selectedDate (or active cautelas if selectedDate is today)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const isSelectedDateToday = selectedDate === todayDateStr;

  const [cautelaMovementFilter, setCautelaMovementFilter] = useState<'TODOS' | 'SAIDAS' | 'RETORNOS' | 'EM_CURSO'>('TODOS');

  // All cautela events matching this date
  const cautelasDoDia = cautelas.filter((c) => {
    const isOutOnDate = c.dataHoraSaida.startsWith(selectedDate);
    const isReturnedOnDate = c.dataHoraRetorno && c.dataHoraRetorno.startsWith(selectedDate);
    const isActiveToday = isSelectedDateToday && c.status === 'EM_PATRULHAMENTO';
    return isOutOnDate || isReturnedOnDate || isActiveToday;
  });

  // Filtered movements based on filter tab
  const movimentacoesCautelaFiltradas = cautelasDoDia.filter((c) => {
    if (cautelaMovementFilter === 'SAIDAS') {
      return c.dataHoraSaida.startsWith(selectedDate);
    }
    if (cautelaMovementFilter === 'RETORNOS') {
      return c.dataHoraRetorno && c.dataHoraRetorno.startsWith(selectedDate);
    }
    if (cautelaMovementFilter === 'EM_CURSO') {
      return c.status === 'EM_PATRULHAMENTO';
    }
    return true;
  });

  // Cautelas metrics on this day
  const saidasDoDia = cautelasDoDia.filter((c) => c.dataHoraSaida.startsWith(selectedDate));
  const retornosDoDia = cautelasDoDia.filter((c) => c.dataHoraRetorno && c.dataHoraRetorno.startsWith(selectedDate));
  const cautelasAtivasHoje = cautelasDoDia.filter((c) => c.status === 'EM_PATRULHAMENTO');
  const cautelasConcluidasHoje = cautelasDoDia.filter((c) => c.status === 'CONCLUIDA');
  const totalKmRodadoDia = cautelasConcluidasHoje.reduce((acc, c) => acc + (c.kmPercorrido || 0), 0);
  const cautelasComAvariaDia = cautelasDoDia.filter((c) => c.houveAvaria);

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `BOLETIM DIARIO DE FROTA ROCAM - DATA: ${formatDate(selectedDate)}\n\n`;

    csvContent += `QUADRO DE VIATURAS BAIXADAS / EM MANUTENCAO\n`;
    csvContent += `Prefixo;Tipo;Modelo;Placa;Status;KM Atual;Motivo da Baixa;Condutor\n`;
    baixadasOrMaintenance.forEach((v) => {
      csvContent += `${v.prefixo};${v.tipo};${v.modelo};${v.placa};${v.status};${v.kmAtual};"${v.motivoBaixa || '-'}";"${v.condutorPadrao || '-'}"\n`;
    });

    csvContent += `\nQUADRO DE VIATURAS OPERACIONAIS\n`;
    csvContent += `Prefixo;Tipo;Modelo;Placa;Status;KM Atual;Pelotao;Condutor\n`;
    operacionais.forEach((v) => {
      csvContent += `${v.prefixo};${v.tipo};${v.modelo};${v.placa};${v.status};${v.kmAtual};"${v.pelotao}";"${v.condutorPadrao || '-'}"\n`;
    });

    csvContent += `\nMOVIMENTACOES E CAUTELAS DE VIATURAS NA DATA\n`;
    csvContent += `Termo;Tipo Movimentacao;Status;Prefixo;Modelo;Placa;Condutor;RE;Pelotao;Data/Hora Saida;KM Saida;Data/Hora Retorno;KM Retorno;KM Rodado;Avaria\n`;
    cautelasDoDia.forEach((c) => {
      const isSaida = c.dataHoraSaida.startsWith(selectedDate);
      const isRetorno = c.dataHoraRetorno && c.dataHoraRetorno.startsWith(selectedDate);
      const tipoMov = isSaida && isRetorno ? 'SAIDA E RETORNO' : isSaida ? 'SAIDA (CAUTELA)' : isRetorno ? 'RETORNO (DESCAUTELA)' : 'EM CURSO';
      csvContent += `"${c.numeroTermo}";"${tipoMov}";"${c.status}";"${c.prefixoViatura}";"${c.modeloViatura}";"${c.placaViatura}";"${c.condutorGraduacao} ${c.condutorNome}";"${c.condutorRE}";"${c.pelotao}";"${c.dataHoraSaida.replace('T', ' ')}";${c.kmSaida};"${c.dataHoraRetorno ? c.dataHoraRetorno.replace('T', ' ') : '-'}";${c.kmRetorno || '-'};${c.kmPercorrido || '-'};"${c.houveAvaria ? (c.viaturaBaixadaAposRetorno ? 'SIM (BAIXADA)' : 'SIM') : 'NAO'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `boletim_diario_rocam_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Date Bar & Print Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
              Boletim Diário de Prontidão da Frota ROCAM
            </h2>
            <p className="text-xs text-zinc-400">
              Controle de empenho operacional, cautelas de viaturas, baixadas e movimentação de oficina
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Date Picker controls */}
          <div className="flex items-center bg-zinc-950 border border-zinc-750 rounded-lg p-1">
            <button
              onClick={() => changeDateBy(-1)}
              title="Dia Anterior"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-amber-400 px-2 py-0.5 focus:outline-none"
            />
            <button
              onClick={() => changeDateBy(1)}
              title="Próximo Dia"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
          >
            Hoje
          </button>

          <button
            onClick={handleExportCSV}
            title="Exportar Planilha CSV"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            id="btn-imprimir-boletim-diario"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Boletim</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip for Daily Readiness & Cautelas */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase text-zinc-400">Total da Frota</div>
          <div className="mt-1 text-2xl font-black font-mono text-zinc-100">{vehicles.length}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Viaturas catalogadas</div>
        </div>

        <div className="bg-zinc-900 border border-emerald-900/40 rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase text-emerald-400">Prontidão do Dia</div>
          <div className="mt-1 text-2xl font-black font-mono text-emerald-400">
            {stats.taxaProntidao}%
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Aptas para empenho</div>
        </div>

        {/* Em Patrulhamento (Cautelas Ativas) */}
        <div className="bg-zinc-900 border border-emerald-800/60 rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase text-emerald-400 flex items-center justify-between">
            <span>Em Patrulhamento</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-1 text-2xl font-black font-mono text-emerald-300">
            {cautelasAtivasHoje.length}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Viaturas Cauteladas</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase text-amber-400">Motos Prontas</div>
          <div className="mt-1 text-2xl font-black font-mono text-amber-400">
            {operacionais.filter((v) => v.tipo === 'MOTOCICLETA').length} / {stats.motos}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Motocicletas ativas</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase text-blue-400">04 Rodas Prontas</div>
          <div className="mt-1 text-2xl font-black font-mono text-blue-400">
            {operacionais.filter((v) => v.tipo === 'QUATRO_RODAS').length} / {stats.quatroRodas}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Apoio Tático & CFP</div>
        </div>

        <div className="bg-zinc-900 border border-rose-900/50 rounded-xl p-3.5 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase text-rose-400">Fora de Serviço</div>
          <div className="mt-1 text-2xl font-black font-mono text-rose-400">
            {baixadasOrMaintenance.length}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">Baixadas / Manutenção</div>
        </div>
      </div>

      {/* 1. REGISTRO DE MOVIMENTAÇÕES E CAUTELAS DE VIATURAS DO TURNO OPERACIONAL */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-zinc-200">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <span>Movimentações de Cautela de Viaturas ({cautelasDoDia.length})</span>
                {cautelasAtivasHoje.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {cautelasAtivasHoje.length} em serviço
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Registro detalhado de saídas, descautelas, odômetros e estado da viatura no turno
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Filtros de Tipo de Movimentação */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setCautelaMovementFilter('TODOS')}
                className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                  cautelaMovementFilter === 'TODOS'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todas ({cautelasDoDia.length})
              </button>
              <button
                onClick={() => setCautelaMovementFilter('SAIDAS')}
                className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                  cautelaMovementFilter === 'SAIDAS'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Saídas ({saidasDoDia.length})
              </button>
              <button
                onClick={() => setCautelaMovementFilter('RETORNOS')}
                className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                  cautelaMovementFilter === 'RETORNOS'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Retornos ({retornosDoDia.length})
              </button>
              <button
                onClick={() => setCautelaMovementFilter('EM_CURSO')}
                className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                  cautelaMovementFilter === 'EM_CURSO'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Em Curso ({cautelasAtivasHoje.length})
              </button>
            </div>
          </div>
        </div>

        {cautelasDoDia.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
            <Shield className="w-8 h-8 text-zinc-700 mx-auto" />
            <div>Nenhuma movimentação de cautela ou saída de viatura registrada na data de {formatDate(selectedDate)}.</div>
          </div>
        ) : movimentacoesCautelaFiltradas.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            Nenhuma movimentação de cautela correspondente ao filtro selecionado ({cautelaMovementFilter}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">Movimentação / Termo</th>
                  <th className="py-2.5 px-4">Viatura</th>
                  <th className="py-2.5 px-4">Condutor / Pelotão</th>
                  <th className="py-2.5 px-4">Saída (Data / KM)</th>
                  <th className="py-2.5 px-4">Retorno (Data / KM)</th>
                  <th className="py-2.5 px-4 text-center">KM Rodado</th>
                  <th className="py-2.5 px-4">Avarias / Fotos</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {movimentacoesCautelaFiltradas.map((c) => {
                  const hasPhotos =
                    (c.fotosAvariasSaida && c.fotosAvariasSaida.length > 0) ||
                    (c.fotosAvariasRetorno && c.fotosAvariasRetorno.length > 0);
                  const totalPhotos =
                    (c.fotosAvariasSaida?.length || 0) + (c.fotosAvariasRetorno?.length || 0);

                  const isSaidaOnDate = c.dataHoraSaida.startsWith(selectedDate);
                  const isRetornoOnDate = c.dataHoraRetorno && c.dataHoraRetorno.startsWith(selectedDate);

                  return (
                    <tr key={c.id} className="hover:bg-zinc-850/40">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isSaidaOnDate && isRetornoOnDate ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-950 text-blue-300 border border-blue-800">
                              Saída & Retorno
                            </span>
                          ) : isSaidaOnDate ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-800">
                              Saída
                            </span>
                          ) : isRetornoOnDate ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-800">
                              Retorno
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Em Curso
                            </span>
                          )}
                          <span className="font-mono font-bold text-zinc-200">{c.numeroTermo}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 ${
                            c.status === 'EM_PATRULHAMENTO'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {c.status === 'EM_PATRULHAMENTO' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                          <span>{c.status === 'EM_PATRULHAMENTO' ? 'Em Patrulhamento' : 'Concluída'}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-400">
                            {c.tipoViatura === 'MOTOCICLETA' ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                          </span>
                          <span className="font-mono font-bold text-zinc-100">{c.prefixoViatura}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">{c.modeloViatura} ({c.placaViatura})</div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="text-zinc-200 font-medium">
                          {c.condutorGraduacao} {c.condutorNome}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          RE: {c.condutorRE} | {c.pelotao}
                        </div>
                      </td>

                      <td className="py-2.5 px-4 font-mono text-zinc-300 whitespace-nowrap">
                        <div>{c.dataHoraSaida.replace('T', ' ')}</div>
                        <div className="text-[11px] text-zinc-400">{formatKm(c.kmSaida)}</div>
                      </td>

                      <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                        {c.dataHoraRetorno ? (
                          <>
                            <div className="text-zinc-200">{c.dataHoraRetorno.replace('T', ' ')}</div>
                            <div className="text-[11px] text-zinc-400">{formatKm(c.kmRetorno || 0)}</div>
                          </>
                        ) : (
                          <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Em Patrulhamento</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center font-mono font-bold text-zinc-100">
                        {c.kmPercorrido !== undefined ? `${c.kmPercorrido} km` : '-'}
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {c.houveAvaria ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 block w-max">
                              {c.viaturaBaixadaAposRetorno ? '⚠️ Avaria (Vtr Baixada)' : '⚠️ Avaria Leve'}
                            </span>
                          ) : c.status === 'CONCLUIDA' ? (
                            <span className="text-emerald-400 text-xs font-semibold block">✓ Sem avarias</span>
                          ) : (
                            <span className="text-zinc-500 text-xs block">-</span>
                          )}

                          {hasPhotos && (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
                              <Camera className="w-3 h-3" />
                              <span>{totalPhotos} foto(s)</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {c.status === 'EM_PATRULHAMENTO' && onOpenDescautela && (
                            <button
                              onClick={() => onOpenDescautela(c)}
                              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                              title="Descautelar viatura (retorno de patrulhamento)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Descautelar</span>
                            </button>
                          )}

                          {onViewCautelaDetail && (
                            <button
                              onClick={() => onViewCautelaDetail(c)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                              title="Visualizar Termo de Cautela Completo"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. QUADRO DE VIATURAS BAIXADAS E FORA DE SERVIÇO */}
      <div className="bg-zinc-900 border border-rose-900/40 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Quadro de Viaturas Baixadas & Em Manutenção ({baixadasOrMaintenance.length})
            </h3>
          </div>
          <span className="text-xs text-rose-300 font-mono">
            Data Ref: {formatDate(selectedDate)}
          </span>
        </div>

        {baixadasOrMaintenance.length === 0 ? (
          <div className="p-6 text-center text-xs text-emerald-400 flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Nenhuma viatura baixada! Prontidão operacional de 100%.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">Prefixo / Tipo</th>
                  <th className="py-2.5 px-4">Modelo</th>
                  <th className="py-2.5 px-4">Odômetro</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Motivo da Baixa / Avaria</th>
                  <th className="py-2.5 px-4">O.S. Vinculada</th>
                  <th className="py-2.5 px-4">Condutor / Pelotão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {baixadasOrMaintenance.map((v) => {
                  const statusInfo = getStatusBadgeInfo(v.status);
                  const activeOS = maintenanceRecords.find(
                    (r) =>
                      r.viaturaId === v.id &&
                      (r.status === 'EM_EXECUCAO' || r.status === 'AGUARDANDO_PECAS')
                  );

                  return (
                    <tr key={v.id} className="hover:bg-zinc-850/40">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-400">
                            {v.tipo === 'MOTOCICLETA' ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                          </span>
                          <span>{v.prefixo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                        {v.marca} {v.modelo}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {formatKm(v.kmAtual)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-rose-300 font-medium">
                        {v.motivoBaixa || activeOS?.descricaoProblema || 'Manutenção corretiva em andamento'}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-400 whitespace-nowrap">
                        {activeOS ? (
                          <div>
                            <div>{activeOS.numeroOS}</div>
                            <div className="text-[10px] text-zinc-500">{activeOS.oficinaResponsavel}</div>
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic">Pendente abertura</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                        <div>{v.condutorPadrao || '-'}</div>
                        <div className="text-[10px] text-zinc-500">{v.pelotao}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. QUADRO DE VIATURAS EM OPERAÇÃO (APTO PARA ESCALA) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Viaturas Prontas para Empenho e Patrulhamento ({operacionais.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 font-bold text-[10px] uppercase border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-4">Prefixo / Tipo</th>
                <th className="py-2.5 px-4">Modelo</th>
                <th className="py-2.5 px-4">Placa</th>
                <th className="py-2.5 px-4">Odômetro</th>
                <th className="py-2.5 px-4">Pelotão / Destinação</th>
                <th className="py-2.5 px-4">Condutor Designado</th>
                <th className="py-2.5 px-4">Status Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {operacionais.map((v) => {
                const isOut = cautelasAtivasHoje.some((c) => c.viaturaId === v.id);
                return (
                  <tr key={v.id} className="hover:bg-zinc-850/40">
                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-100 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-amber-400">
                          {v.tipo === 'MOTOCICLETA' ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                        </span>
                        <span>{v.prefixo}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-300 whitespace-nowrap">
                      {v.marca} {v.modelo}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400 whitespace-nowrap">
                      {v.placa || 'OFICIAL'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-amber-400 whitespace-nowrap">
                      {formatKm(v.kmAtual)}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-300">{v.pelotao}</td>
                    <td className="py-2.5 px-4 text-zinc-400">{v.condutorPadrao || 'Equipe de Serviço'}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>Em Patrulhamento</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                          {v.status === 'RESERVA' ? 'Reserva Técnica' : 'Operacional (Disponível)'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MOVIMENTAÇÕES DE OFICINA NO DIA SELECIONADO */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-zinc-300">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Movimentação de Oficina Registrada na Data ({movimentacoesDoDia.length})
            </h3>
          </div>
        </div>

        {movimentacoesDoDia.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            Nenhuma entrada ou saída de oficina registrada na data de {formatDate(selectedDate)}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold text-[10px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">O.S.</th>
                  <th className="py-2.5 px-4">Viatura</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">Serviço / Avaria</th>
                  <th className="py-2.5 px-4">Oficina / Mecânico</th>
                  <th className="py-2.5 px-4">Status Atual</th>
                  <th className="py-2.5 px-4 text-center">Itens / Peças</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {movimentacoesDoDia.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-200">{r.numeroOS}</td>
                    <td className="py-2.5 px-4 font-mono text-zinc-100">{r.prefixoViatura}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          r.tipoManutencao === 'PREVENTIVA'
                            ? 'bg-blue-950 text-blue-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {r.tipoManutencao}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-300 max-w-xs truncate">
                      {r.descricaoProblema}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400">
                      {r.oficinaResponsavel} ({r.mecanicoResponsavel})
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-zinc-200">
                        {getStatusBadgeInfo(r.status).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      {r.pecasSubstituidas && r.pecasSubstituidas.length > 0 ? (
                        <span className="text-zinc-300 font-semibold">
                          {r.pecasSubstituidas.reduce((acc, p) => acc + p.quantidade, 0)} un
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE IMPRESSÃO OFICIAL DO BOLETIM MILITAR */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white text-zinc-900 rounded-xl shadow-2xl p-8 my-8 font-sans">
            {/* Header Documento Militar Oficial */}
            <div className="text-center border-b-2 border-zinc-900 pb-4 mb-6">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-700">
                POLÍCIA MILITAR DO ESTADO DE SÃO PAULO
              </div>
              <div className="text-sm font-black uppercase tracking-widest text-zinc-950 mt-1">
                ROCAM — RONDAS OSTENSIVAS COM APOIO DE MOTOCICLETAS
              </div>
              <div className="text-base font-black uppercase text-zinc-950 mt-2 bg-zinc-100 py-1 border border-zinc-300">
                BOLETIM DIÁRIO DE PRONTIDÃO DA FROTA E REGISTRO DE CAUTELAS
              </div>
              <div className="flex justify-between text-xs font-mono text-zinc-700 mt-2 px-2">
                <span>DATA DE REFERÊNCIA: {formatDate(selectedDate)}</span>
                <span>EMISSÃO: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</span>
              </div>
            </div>

            {/* Resumo de Prontidão */}
            <div className="grid grid-cols-5 gap-2 mb-6 text-center text-xs">
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">FROTA TOTAL</div>
                <div className="text-lg font-black font-mono">{vehicles.length} Viaturas</div>
              </div>
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">OPERACIONAIS</div>
                <div className="text-lg font-black font-mono text-emerald-800">
                  {operacionais.length} ({stats.taxaProntidao}% prontidão)
                </div>
              </div>
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">CAUTELADAS (SERVIÇO)</div>
                <div className="text-lg font-black font-mono text-emerald-700">
                  {cautelasAtivasHoje.length}
                </div>
              </div>
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">BAIXADAS / OFICINA</div>
                <div className="text-lg font-black font-mono text-rose-800">
                  {baixadasOrMaintenance.length}
                </div>
              </div>
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">MOTOS PRONTAS</div>
                <div className="text-lg font-black font-mono">
                  {operacionais.filter((v) => v.tipo === 'MOTOCICLETA').length} / {stats.motos}
                </div>
              </div>
            </div>

            {/* 1. REGISTRO DE MOVIMENTAÇÕES DE CAUTELAS DE VIATURAS NO TURNO (IMPRESSÃO) */}
            <div className="mb-6">
              <h4 className="text-xs font-black uppercase border-b border-zinc-800 pb-1 mb-2">
                1. MOVIMENTAÇÕES DE CAUTELAS E DESCAUTELAS DE VIATURAS NO TURNO ({cautelasDoDia.length})
              </h4>
              {cautelasDoDia.length === 0 ? (
                <div className="text-xs text-zinc-600 italic">Nenhuma movimentação de cautela registrada nesta data.</div>
              ) : (
                <table className="w-full text-left text-[10px] border border-zinc-400">
                  <thead className="bg-zinc-100 border-b border-zinc-400 font-bold">
                    <tr>
                      <th className="p-1 border-r border-zinc-300">Movimentação</th>
                      <th className="p-1 border-r border-zinc-300">Termo</th>
                      <th className="p-1 border-r border-zinc-300">Vtr / Placa</th>
                      <th className="p-1 border-r border-zinc-300">Condutor Militar</th>
                      <th className="p-1 border-r border-zinc-300">Pelotão</th>
                      <th className="p-1 border-r border-zinc-300">Saída (Hora/KM)</th>
                      <th className="p-1 border-r border-zinc-300">Retorno (Hora/KM)</th>
                      <th className="p-1 border-r border-zinc-300 text-center">KM Rod.</th>
                      <th className="p-1">Situação / Avarias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300 font-mono">
                    {cautelasDoDia.map((c) => {
                      const isSaida = c.dataHoraSaida.startsWith(selectedDate);
                      const isRetorno = c.dataHoraRetorno && c.dataHoraRetorno.startsWith(selectedDate);
                      const tipoMov = isSaida && isRetorno ? 'SAÍDA E RETORNO' : isSaida ? 'SAÍDA' : isRetorno ? 'RETORNO' : 'EM CURSO';

                      return (
                        <tr key={c.id}>
                          <td className="p-1 font-bold border-r border-zinc-300 font-sans">{tipoMov}</td>
                          <td className="p-1 font-bold border-r border-zinc-300">{c.numeroTermo}</td>
                          <td className="p-1 border-r border-zinc-300">{c.prefixoViatura} ({c.placaViatura})</td>
                          <td className="p-1 border-r border-zinc-300 font-sans">{c.condutorGraduacao} {c.condutorNome} (RE {c.condutorRE})</td>
                          <td className="p-1 border-r border-zinc-300 font-sans">{c.pelotao}</td>
                          <td className="p-1 border-r border-zinc-300">{c.dataHoraSaida.replace('T', ' ')} | {c.kmSaida}km</td>
                          <td className="p-1 border-r border-zinc-300">
                            {c.dataHoraRetorno ? `${c.dataHoraRetorno.replace('T', ' ')} | ${c.kmRetorno}km` : 'EM SERVIÇO'}
                          </td>
                          <td className="p-1 border-r border-zinc-300 text-center">{c.kmPercorrido !== undefined ? `${c.kmPercorrido}km` : '-'}</td>
                          <td className="p-1 font-sans">
                            {c.houveAvaria ? `AVARIA (${c.viaturaBaixadaAposRetorno ? 'BAIXADA' : 'LEVE'})` : c.status === 'CONCLUIDA' ? 'SEM AVARIAS' : 'EM PATRULHAMENTO'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* 2. Quadro de Viaturas Baixadas para Impressão */}
            <div className="mb-6">
              <h4 className="text-xs font-black uppercase border-b border-zinc-800 pb-1 mb-2">
                2. VIATURAS FORA DE SERVIÇO / BAIXADAS
              </h4>
              {baixadasOrMaintenance.length === 0 ? (
                <div className="text-xs text-zinc-600 italic">Nenhuma viatura baixada nesta data.</div>
              ) : (
                <table className="w-full text-left text-[11px] border border-zinc-400">
                  <thead className="bg-zinc-100 border-b border-zinc-400 font-bold">
                    <tr>
                      <th className="p-1.5 border-r border-zinc-300">Prefixo</th>
                      <th className="p-1.5 border-r border-zinc-300">Tipo / Modelo</th>
                      <th className="p-1.5 border-r border-zinc-300">KM</th>
                      <th className="p-1.5 border-r border-zinc-300">Status</th>
                      <th className="p-1.5 border-r border-zinc-300">Motivo da Baixa</th>
                      <th className="p-1.5">O.S. Vinculada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300 font-mono">
                    {baixadasOrMaintenance.map((v) => (
                      <tr key={v.id}>
                        <td className="p-1.5 font-bold border-r border-zinc-300">{v.prefixo}</td>
                        <td className="p-1.5 border-r border-zinc-300">{v.tipo === 'MOTOCICLETA' ? 'MOTO' : '04 RODAS'} {v.modelo}</td>
                        <td className="p-1.5 border-r border-zinc-300">{v.kmAtual}</td>
                        <td className="p-1.5 border-r border-zinc-300">{v.status}</td>
                        <td className="p-1.5 border-r border-zinc-300 font-sans">{v.motivoBaixa || '-'}</td>
                        <td className="p-1.5">{v.observacoes || 'Em manutenção'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 3. Quadro de Viaturas Prontas para Impressão */}
            <div className="mb-8">
              <h4 className="text-xs font-black uppercase border-b border-zinc-800 pb-1 mb-2">
                3. VIATURAS OPERACIONAIS DISPONÍVEIS PARA ESCALA
              </h4>
              <table className="w-full text-left text-[10px] border border-zinc-400">
                <thead className="bg-zinc-100 border-b border-zinc-400 font-bold">
                  <tr>
                    <th className="p-1 border-r border-zinc-300">Prefixo</th>
                    <th className="p-1 border-r border-zinc-300">Tipo</th>
                    <th className="p-1 border-r border-zinc-300">Modelo</th>
                    <th className="p-1 border-r border-zinc-300">Placa</th>
                    <th className="p-1 border-r border-zinc-300">KM</th>
                    <th className="p-1 border-r border-zinc-300">Pelotão</th>
                    <th className="p-1">Condutor Padrão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-300 font-mono">
                  {operacionais.map((v) => (
                    <tr key={v.id}>
                      <td className="p-1 font-bold border-r border-zinc-300">{v.prefixo}</td>
                      <td className="p-1 border-r border-zinc-300">{v.tipo === 'MOTOCICLETA' ? 'MOTO' : '04 RODAS'}</td>
                      <td className="p-1 border-r border-zinc-300">{v.modelo}</td>
                      <td className="p-1 border-r border-zinc-300">{v.placa || 'OFICIAL'}</td>
                      <td className="p-1 border-r border-zinc-300">{v.kmAtual}</td>
                      <td className="p-1 border-r border-zinc-300 font-sans">{v.pelotao}</td>
                      <td className="p-1 font-sans">{v.condutorPadrao || 'Equipe Escala'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Campo de Assinaturas Oficiais */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-400 text-center text-xs">
              <div>
                <div className="border-t border-zinc-800 w-48 mx-auto mb-1"></div>
                <div className="font-bold">Oficial de Manutenção e Garagem</div>
                <div className="text-[10px] text-zinc-600">Pelotão de Apoio Tático ROCAM</div>
              </div>
              <div>
                <div className="border-t border-zinc-800 w-48 mx-auto mb-1"></div>
                <div className="font-bold">Comandante de Força Patrulha (CFP)</div>
                <div className="text-[10px] text-zinc-600">ROCAM</div>
              </div>
            </div>

            {/* Botões do Modal */}
            <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t border-zinc-300 no-print">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-semibold rounded transition cursor-pointer"
              >
                Fechar Visualização
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded shadow transition cursor-pointer"
              >
                Imprimir Documento Oficial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
