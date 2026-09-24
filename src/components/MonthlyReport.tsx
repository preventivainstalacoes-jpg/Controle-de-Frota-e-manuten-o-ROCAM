import React, { useState, useMemo } from 'react';
import { useFleet } from '../context/FleetContext';
import { MaintenanceCategory, VehicleType } from '../types';
import {
  Calendar,
  Wrench,
  Bike,
  Car,
  BarChart2,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  PackageCheck,
  CheckCheck
} from 'lucide-react';
import { formatKm, getCategoryLabel, formatDate } from '../utils/formatters';

export const MonthlyReport: React.FC = () => {
  const { maintenanceRecords, vehicles } = useFleet();

  // Current year-month default
  const today = new Date();
  const defaultYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultYearMonth);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filter records for this month (by dataEntrada)
  const monthRecords = useMemo(() => {
    return maintenanceRecords.filter((r) => r.dataEntrada.startsWith(selectedMonth));
  }, [maintenanceRecords, selectedMonth]);

  // Operational metrics and statistics
  const stats = useMemo(() => {
    const totalServicos = monthRecords.length;
    const preventivas = monthRecords.filter((r) => r.tipoManutencao === 'PREVENTIVA').length;
    const corretivas = monthRecords.filter((r) => r.tipoManutencao === 'CORRETIVA').length;
    const concluidas = monthRecords.filter((r) => r.status === 'CONCLUIDA').length;
    const emAndamento = monthRecords.filter(
      (r) => r.status === 'EM_EXECUCAO' || r.status === 'AGUARDANDO_PECAS'
    ).length;

    const servicosMotos = monthRecords.filter((r) => r.tipoViatura === 'MOTOCICLETA').length;
    const servicosQuatroRodas = monthRecords.filter((r) => r.tipoViatura === 'QUATRO_RODAS').length;

    let totalPecasAplicadas = 0;
    monthRecords.forEach((r) => {
      r.pecasSubstituidas?.forEach((p) => {
        totalPecasAplicadas += p.quantidade;
      });
    });

    // Demands by category
    const porCategoria: Record<string, { count: number; percent: number }> = {};
    monthRecords.forEach((r) => {
      if (!porCategoria[r.categoria]) {
        porCategoria[r.categoria] = { count: 0, percent: 0 };
      }
      porCategoria[r.categoria].count += 1;
    });

    Object.keys(porCategoria).forEach((cat) => {
      porCategoria[cat].percent =
        totalServicos > 0 ? Math.round((porCategoria[cat].count / totalServicos) * 100) : 0;
    });

    // Vehicles with highest maintenance frequency
    const porViatura: Record<
      string,
      {
        prefixo: string;
        tipo: VehicleType;
        modelo: string;
        count: number;
        preventivas: number;
        corretivas: number;
      }
    > = {};

    monthRecords.forEach((r) => {
      if (!porViatura[r.viaturaId]) {
        const v = vehicles.find((veh) => veh.id === r.viaturaId);
        porViatura[r.viaturaId] = {
          prefixo: r.prefixoViatura,
          tipo: r.tipoViatura,
          modelo: v?.modelo || '',
          count: 0,
          preventivas: 0,
          corretivas: 0,
        };
      }
      porViatura[r.viaturaId].count += 1;
      if (r.tipoManutencao === 'PREVENTIVA') {
        porViatura[r.viaturaId].preventivas += 1;
      } else {
        porViatura[r.viaturaId].corretivas += 1;
      }
    });

    const rankingViaturas = Object.values(porViatura).sort((a, b) => b.count - a.count);

    // Consumed parts (volume and occurrences)
    const pecasConsumo: Record<string, { nome: string; qtd: number; osCount: number }> = {};
    monthRecords.forEach((r) => {
      r.pecasSubstituidas?.forEach((p) => {
        if (!pecasConsumo[p.nome]) {
          pecasConsumo[p.nome] = { nome: p.nome, qtd: 0, osCount: 0 };
        }
        pecasConsumo[p.nome].qtd += p.quantidade;
        pecasConsumo[p.nome].osCount += 1;
      });
    });

    const rankingPecas = Object.values(pecasConsumo).sort((a, b) => b.qtd - a.qtd);

    return {
      totalServicos,
      preventivas,
      corretivas,
      concluidas,
      emAndamento,
      servicosMotos,
      servicosQuatroRodas,
      totalPecasAplicadas,
      porCategoria,
      rankingViaturas,
      rankingPecas,
    };
  }, [monthRecords, vehicles]);

  const [ano, mes] = selectedMonth.split('-');
  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const nomeMesExtenso = `${mesesNomes[parseInt(mes, 10) - 1]} de ${ano}`;

  // Export CSV without financial data
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `RELATORIO MENSAL OPERACIONAL DE MANUTENCAO ROCAM - ${nomeMesExtenso}\n\n`;
    csvContent += `RESUMO OPERACIONAL\n`;
    csvContent += `Total de Ordens de Servico;${stats.totalServicos}\n`;
    csvContent += `Manutencoes Preventivas;${stats.preventivas}\n`;
    csvContent += `Manutencoes Corretivas;${stats.corretivas}\n`;
    csvContent += `Servicos Concluidos;${stats.concluidas}\n`;
    csvContent += `Servicos em Andamento;${stats.emAndamento}\n`;
    csvContent += `Atendimentos Motocicletas;${stats.servicosMotos}\n`;
    csvContent += `Atendimentos 04 Rodas;${stats.servicosQuatroRodas}\n`;
    csvContent += `Total de Pecas e Insumos Aplicados;${stats.totalPecasAplicadas}\n\n`;

    csvContent += `ORDENS DE SERVICO DO MES\n`;
    csvContent += `Nro OS;Data;Prefixo;Tipo Vtr;Tipo OS;Categoria;Status;Qtd Pecas;Oficina;Mecanico\n`;
    monthRecords.forEach((r) => {
      const qtdPecas = r.pecasSubstituidas ? r.pecasSubstituidas.reduce((acc, p) => acc + p.quantidade, 0) : 0;
      csvContent += `${r.numeroOS};${r.dataEntrada};${r.prefixoViatura};${r.tipoViatura};${r.tipoManutencao};${r.categoria};${r.status};${qtdPecas};"${r.oficinaResponsavel}";"${r.mecanicoResponsavel}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_mensal_operacional_rocam_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
              Relatório Mensal de Manutenção & Prontidão
            </h2>
            <p className="text-xs text-zinc-400">
              Balanço gerencial de intervenções preventivas, corretivas, peças aplicadas e disponibilidade
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Seletor Mês */}
          <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-750 rounded-lg px-3 py-1.5">
            <span className="text-xs text-zinc-400 font-semibold">Mês:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-amber-400 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportCSV}
            title="Exportar Planilha Mensal (CSV)"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            id="btn-imprimir-relatorio-mensal"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Main Operational KPI Cards for the Month */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-zinc-400">Total de O.S. no Mês</div>
          <div className="mt-1 text-2xl font-black font-mono text-zinc-100">
            {stats.totalServicos}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {stats.concluidas} concluídas • {stats.emAndamento} em execução
          </div>
        </div>

        <div className="bg-zinc-900 border border-amber-900/40 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-amber-400">Motocicletas</div>
          <div className="mt-1 text-2xl font-black font-mono text-amber-400">
            {stats.servicosMotos}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {stats.totalServicos > 0
              ? `${Math.round((stats.servicosMotos / stats.totalServicos) * 100)}% das O.S.`
              : '0%'}
          </div>
        </div>

        <div className="bg-zinc-900 border border-blue-900/40 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-blue-400">Viaturas 04 Rodas</div>
          <div className="mt-1 text-2xl font-black font-mono text-blue-400">
            {stats.servicosQuatroRodas}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {stats.totalServicos > 0
              ? `${Math.round((stats.servicosQuatroRodas / stats.totalServicos) * 100)}% das O.S.`
              : '0%'}
          </div>
        </div>

        <div className="bg-zinc-900 border border-emerald-900/40 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-emerald-400">Peças / Insumos Aplicados</div>
          <div className="mt-1 text-2xl font-black font-mono text-emerald-400">
            {stats.totalPecasAplicadas} <span className="text-xs font-normal">unidades</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {stats.rankingPecas.length} itens distintos consumidos
          </div>
        </div>
      </div>

      {/* Visual Proportional Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preventiva vs Corretiva */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Proporção: Preventiva vs Corretiva
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              Total: {stats.totalServicos} O.S.
            </span>
          </div>

          {stats.totalServicos > 0 ? (
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
                <div
                  style={{ width: `${(stats.preventivas / stats.totalServicos) * 100}%` }}
                  className="bg-blue-500 transition-all duration-500"
                  title={`Preventivas: ${stats.preventivas}`}
                />
                <div
                  style={{ width: `${(stats.corretivas / stats.totalServicos) * 100}%` }}
                  className="bg-rose-500 transition-all duration-500"
                  title={`Corretivas: ${stats.corretivas}`}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-zinc-300">
                    Preventivas: <strong className="text-blue-400">{stats.preventivas}</strong> (
                    {Math.round((stats.preventivas / stats.totalServicos) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-zinc-300">
                    Corretivas: <strong className="text-rose-400">{stats.corretivas}</strong> (
                    {Math.round((stats.corretivas / stats.totalServicos) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 py-3 text-center">
              Sem dados de O.S. no mês selecionado.
            </div>
          )}
        </div>

        {/* Distribuição Motocicletas vs 04 Rodas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Distribuição: Motocicletas vs 04 Rodas
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400">
              {stats.totalServicos} Atendimentos
            </span>
          </div>

          {stats.totalServicos > 0 ? (
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
                <div
                  style={{ width: `${(stats.servicosMotos / stats.totalServicos) * 100}%` }}
                  className="bg-amber-500 transition-all duration-500"
                />
                <div
                  style={{ width: `${(stats.servicosQuatroRodas / stats.totalServicos) * 100}%` }}
                  className="bg-blue-500 transition-all duration-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-zinc-300">
                    Motocicletas: <strong className="text-amber-400">{stats.servicosMotos}</strong> (
                    {Math.round((stats.servicosMotos / stats.totalServicos) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-zinc-300">
                    04 Rodas: <strong className="text-blue-400">{stats.servicosQuatroRodas}</strong> (
                    {Math.round((stats.servicosQuatroRodas / stats.totalServicos) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 py-3 text-center">
              Sem manutenções no mês selecionado.
            </div>
          )}
        </div>
      </div>

      {/* Demandas por Categoria de Manutenção */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <span>Frequência por Categoria de Serviço no Mês</span>
        </h3>

        {Object.keys(stats.porCategoria).length === 0 ? (
          <div className="text-xs text-zinc-500 py-4 text-center">
            Nenhuma manutenção realizada neste mês.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stats.porCategoria).map(([catKey, val]) => (
              <div
                key={catKey}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">
                    {getCategoryLabel(catKey)}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-bold">
                    {val.count} O.S.
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-400">
                  {val.percent}% do volume total
                </div>
                {/* Visual mini bar */}
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: `${val.percent}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Tables: Ranking de Viaturas & Peças Mais Consumidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ranking Viaturas */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              <span>Viaturas com Maior Frequência de Oficina</span>
            </h4>
          </div>

          {stats.rankingViaturas.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">Sem registros no mês.</div>
          ) : (
            <div className="divide-y divide-zinc-850 text-xs">
              {stats.rankingViaturas.slice(0, 5).map((item, idx) => (
                <div key={item.prefixo} className="p-3.5 flex items-center justify-between hover:bg-zinc-850/40">
                  <div className="flex items-center space-x-3">
                    <span className="w-5 text-center font-bold text-zinc-500">#{idx + 1}</span>
                    <div>
                      <div className="font-mono font-bold text-zinc-100 flex items-center gap-1.5">
                        <span>{item.prefixo}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">({item.modelo})</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {item.preventivas} Prev • {item.corretivas} Corr
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-amber-400">
                    {item.count} {item.count === 1 ? 'O.S.' : 'O.S.'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peças e Insumos Mais Utilizados */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              <span>Peças & Insumos Mais Consumidos</span>
            </h4>
          </div>

          {stats.rankingPecas.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">Nenhuma peça registrada no mês.</div>
          ) : (
            <div className="divide-y divide-zinc-850 text-xs">
              {stats.rankingPecas.slice(0, 5).map((peca) => (
                <div key={peca.nome} className="p-3.5 flex items-center justify-between hover:bg-zinc-850/40">
                  <div>
                    <div className="font-semibold text-zinc-200">{peca.nome}</div>
                    <div className="text-[10px] text-zinc-500">Empregada em {peca.osCount} O.S.</div>
                  </div>
                  <div className="text-right font-mono font-bold text-emerald-400">
                    {peca.qtd} un
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE IMPRESSÃO OFICIAL DO BALANÇO MENSAL */}
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
                RELATÓRIO MENSAL GERENCIAL DE MANUTENÇÃO E PRONTIDÃO DA FROTA
              </div>
              <div className="flex justify-between text-xs font-mono text-zinc-700 mt-2 px-2">
                <span>MÊS DE REFERÊNCIA: {nomeMesExtenso.toUpperCase()}</span>
                <span>EMISSÃO: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Resumo Operacional */}
            <div className="grid grid-cols-4 gap-2 mb-6 text-center text-xs">
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">TOTAL DE O.S.</div>
                <div className="text-lg font-black font-mono">{stats.totalServicos}</div>
              </div>
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">PREVENTIVAS</div>
                <div className="text-lg font-black font-mono text-blue-800">{stats.preventivas}</div>
              </div>
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">CORRETIVAS</div>
                <div className="text-lg font-black font-mono text-rose-800">{stats.corretivas}</div>
              </div>
              <div className="p-2 border border-zinc-400 rounded">
                <div className="text-[10px] text-zinc-600 font-bold uppercase">PEÇAS APLICADAS</div>
                <div className="text-lg font-black font-mono text-emerald-800">{stats.totalPecasAplicadas} un</div>
              </div>
            </div>

            {/* Quadro de Serviços do Mês */}
            <div className="mb-6">
              <h4 className="text-xs font-black uppercase border-b border-zinc-800 pb-1 mb-2">
                RELAÇÃO DE ORDENS DE SERVIÇO EXECUTADAS NO MÊS
              </h4>
              {monthRecords.length === 0 ? (
                <div className="text-xs text-zinc-600 italic">Nenhum serviço registrado no mês selecionado.</div>
              ) : (
                <table className="w-full text-left text-[10px] border border-zinc-400">
                  <thead className="bg-zinc-100 border-b border-zinc-400 font-bold">
                    <tr>
                      <th className="p-1 border-r border-zinc-300">Nº O.S.</th>
                      <th className="p-1 border-r border-zinc-300">Data</th>
                      <th className="p-1 border-r border-zinc-300">Vtr</th>
                      <th className="p-1 border-r border-zinc-300">Tipo</th>
                      <th className="p-1 border-r border-zinc-300">Categoria</th>
                      <th className="p-1 border-r border-zinc-300">Descrição</th>
                      <th className="p-1 border-r border-zinc-300">Oficina</th>
                      <th className="p-1 text-center">Itens / Peças</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300 font-mono">
                    {monthRecords.map((r) => {
                      const qtdPecas = r.pecasSubstituidas
                        ? r.pecasSubstituidas.reduce((acc, p) => acc + p.quantidade, 0)
                        : 0;
                      return (
                        <tr key={r.id}>
                          <td className="p-1 font-bold border-r border-zinc-300">{r.numeroOS}</td>
                          <td className="p-1 border-r border-zinc-300">{formatDate(r.dataEntrada)}</td>
                          <td className="p-1 border-r border-zinc-300">{r.prefixoViatura}</td>
                          <td className="p-1 border-r border-zinc-300">{r.tipoManutencao}</td>
                          <td className="p-1 border-r border-zinc-300 font-sans">{getCategoryLabel(r.categoria)}</td>
                          <td className="p-1 border-r border-zinc-300 font-sans">{r.descricaoProblema}</td>
                          <td className="p-1 border-r border-zinc-300 font-sans">
                            {r.oficinaResponsavel}
                            {r.tipoOficina === 'EXTERNA' && (
                              <span className="ml-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-1 py-0.2 rounded border border-blue-300">
                                Ext
                              </span>
                            )}
                          </td>
                          <td className="p-1 text-center font-bold">
                            {qtdPecas > 0 ? `${qtdPecas} un` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-400 text-center text-xs">
              <div>
                <div className="border-t border-zinc-800 w-48 mx-auto mb-1"></div>
                <div className="font-bold">Oficial Chefe de Logística e Manutenção</div>
                <div className="text-[10px] text-zinc-600">Pelotão de Apoio Tático ROCAM</div>
              </div>
              <div>
                <div className="border-t border-zinc-800 w-48 mx-auto mb-1"></div>
                <div className="font-bold">Comandante da Subunidade ROCAM</div>
                <div className="text-[10px] text-zinc-600">Polícia Militar do Estado de São Paulo</div>
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
                Imprimir Relatório Oficial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
