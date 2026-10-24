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

  // Navigate date safely without timezone offset drift
  const changeDateBy = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  // Vehicles out of service
  const baixadasOrMaintenance = vehicles.filter(
    (v) => v.status === 'BAIXADA' || v.status === 'EM_MANUTENCAO' || v.status === 'MANUTENCAO_EXTERNA'
  );

  // Operational vehicles
  const operacionais = vehicles.filter((v) => v.status === 'OPERACIONAL' || v.status === 'RESERVA');

  // Relatório por eventos registrados na data, não apenas pelo status atual do painel.
  // startsWith aceita datas no formato YYYY-MM-DD e timestamps ISO com horário.
  const movimentacoesDoDia = maintenanceRecords.filter(
    (r) => r.dataEntrada?.startsWith(selectedDate) || r.dataConclusao?.startsWith(selectedDate) || r.dataHoraSaidaOficina?.startsWith(selectedDate) || r.dataHoraRetornoOficina?.startsWith(selectedDate) || r.liberadoEm?.startsWith(selectedDate)
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

  // Resumo consolidado da frota de motocicletas para o boletim diário.
  const motos = vehicles.filter((v) => v.tipo === 'MOTOCICLETA');
  const motosEmDescarga = motos.filter((v) =>
    (v.motivoBaixa || '').toLocaleLowerCase('pt-BR').includes('descarga')
    || (v.observacoes || '').toLocaleLowerCase('pt-BR').includes('destinada à descarga')
  );
  const motosBaixadas = motos.filter((v) =>
    !motosEmDescarga.some((d) => d.id === v.id)
    && (v.status === 'BAIXADA' || v.status === 'EM_MANUTENCAO' || v.status === 'MANUTENCAO_EXTERNA')
  );
  const motosProntas = motos.filter((v) => v.status === 'OPERACIONAL' || v.status === 'RESERVA');
  const resumoPorAreaPatrulhamento = Object.entries(
    cautelasDoDia.reduce<Record<string, number>>((acc, cautela) => {
      const area = (cautela.areaPatrulhamento || '').trim() || 'Área não informada';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));


  // Export CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `BOLETIM DIARIO DE FROTA ROCAM - DATA: ${formatDate(selectedDate)}\n\n`;

    csvContent += 'RESUMO QUANTITATIVO DA FROTA DE MOTOCICLETAS\\n';
    csvContent += 'Motos baixadas / em manutenção;' + motosBaixadas.length + '\\n';
    csvContent += 'Motos destinadas à descarga;' + motosEmDescarga.length + '\\n';
    csvContent += 'Motos prontas para o serviço;' + motosProntas.length + '\\n\\n';
    csvContent += 'MOVIMENTAÇÃO DE VIATURAS NA DATA\\n';
    csvContent += 'Cautelas / saídas;' + saidasDoDia.length + '\\n';
    csvContent += 'Devoluções / retornos;' + retornosDoDia.length + '\\n';
    csvContent += 'Viaturas ainda em serviço;' + cautelasAtivasHoje.length + '\\n\\n';    csvContent += 'MOVIMENTAÇÃO POR ÁREA DE PATRULHAMENTO\\n';
    csvContent += 'Área de Patrulhamento;Quantidade de registros\\n';
    resumoPorAreaPatrulhamento.forEach(([area, total]) => {
      csvContent += '"' + area.replace(/"/g, '""') + '";' + total + '\\n';
    });
    csvContent += '\\n';
    csvContent += 'MANUTENÇÕES REGISTRADAS NA DATA;' + movimentacoesDoDia.length + '\\n\\n';

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
              Relatório por data: registra cada saída/cautela, devolução/descautela e movimentação de manutenção lançada no dia. Pode ser consultado e impresso a qualquer momento do turno; o quadro de status é apenas complementar.
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-xs text-zinc-400">Cautelas / saídas do dia</div><div className="text-2xl font-black">{saidasDoDia.length}</div></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-xs text-zinc-400">Devoluções / retornos do dia</div><div className="text-2xl font-black">{retornosDoDia.length}</div></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-xs text-zinc-400">Viaturas ainda em serviço</div><div className="text-2xl font-black">{cautelasAtivasHoje.length}</div></div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
        <h3 className="text-sm font-bold text-zinc-100 mb-3">Movimentação por área de patrulhamento</h3>
        {resumoPorAreaPatrulhamento.length === 0 ? <p className="text-xs text-zinc-400">Nenhuma movimentação registrada na data.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {resumoPorAreaPatrulhamento.map(([area, total]) => <div key={area} className="flex justify-between gap-3 border border-zinc-800 rounded p-2 text-sm"><span>{area}</span><strong>{total}</strong></div>)}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-xs text-zinc-400">Motocicletas baixadas / manutenção</div><div className="text-2xl font-black">{motosBaixadas.length}</div></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-xs text-zinc-400">Motocicletas destinadas à descarga</div><div className="text-2xl font-black">{motosEmDescarga.length}</div></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-xs text-zinc-400">Motocicletas prontas para o serviço</div><div className="text-2xl font-black">{motosProntas.length}</div></div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5">
        <h3 className="text-sm font-bold text-zinc-100 mb-3">Movimentação diária de cautelas e devoluções</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><div className="text-xs text-zinc-400">Cautelas / saídas</div><div className="text-2xl font-black">{saidasDoDia.length}</div></div>
          <div><div className="text-xs text-zinc-400">Devoluções / retornos</div><div className="text-2xl font-black">{retornosDoDia.length}</div></div>
          <div><div className="text-xs text-zinc-400">Em serviço</div><div className="text-2xl font-black">{cautelasAtivasHoje.length}</div></div>
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
                    <td className="py-2.5 px-4 text-zinc-300 max-w-xs">
                      <div className="font-semibold">{r.descricaoProblema || 'Sem descrição'}</div>
                      {r.servicosExecutados && (
                        <div className="mt-1 whitespace-normal text-emerald-300">
                          Executado: {r.servicosExecutados}
                        </div>
                      )}
                      {r.dataConclusao && (
                        <div className="mt-1 text-[10px] text-zinc-500">
                          Conclusão: {formatDate(r.dataConclusao)}
                        </div>
                      )}
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
                POLÍCIA MILITAR DO ESTADO DO RIO GRANDE DO NORTE
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

            <div className="mb-6">
              <h4 className="text-xs font-black uppercase border-b border-zinc-800 pb-1 mb-2">RESUMO DIÁRIO CONSOLIDADO</h4>
              <table className="w-full text-left text-xs border border-zinc-400">
                <thead className="bg-zinc-100 border-b border-zinc-400 font-bold"><tr><th className="p-2 border-r border-zinc-300">Indicador</th><th className="p-2">Quantidade</th></tr></thead>
                <tbody className="divide-y divide-zinc-300">
                  <tr><td className="p-2 border-r border-zinc-300">Motocicletas baixadas / em manutenção</td><td className="p-2">{motosBaixadas.length}</td></tr>
                  <tr><td className="p-2 border-r border-zinc-300">Motocicletas destinadas à descarga</td><td className="p-2">{motosEmDescarga.length}</td></tr>
                  <tr><td className="p-2 border-r border-zinc-300">Motocicletas prontas para o serviço</td><td className="p-2">{motosProntas.length}</td></tr>
                  <tr><td className="p-2 border-r border-zinc-300">Cautelas / saídas no dia</td><td className="p-2">{saidasDoDia.length}</td></tr>
                  <tr><td className="p-2 border-r border-zinc-300">Devoluções / retornos no dia</td><td className="p-2">{retornosDoDia.length}</td></tr>
                  <tr><td className="p-2 border-r border-zinc-300">Viaturas ainda em serviço</td><td className="p-2">{cautelasAtivasHoje.length}</td></tr>
                  <tr><td colSpan={2} className="p-2 font-bold bg-zinc-100">MOVIMENTAÇÃO POR ÁREA DE PATRULHAMENTO</td></tr>
                  {resumoPorAreaPatrulhamento.map(([area, total]) => <tr key={area}><td className="p-2 border-r border-zinc-300">{area}</td><td className="p-2">{total}</td></tr>)}
                </tbody>
              </table>
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
