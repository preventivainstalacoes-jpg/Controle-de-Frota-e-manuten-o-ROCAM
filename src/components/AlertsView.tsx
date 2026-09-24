import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import { MaintenanceAlert, MaintenanceRule, VehicleType } from '../types';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Clock,
  Settings,
  Bike,
  Car,
  Shield,
  Plus,
  Filter,
  ArrowRight
} from 'lucide-react';
import { formatKm, getCategoryLabel } from '../utils/formatters';

interface AlertsViewProps {
  onScheduleMaintenance: (viaturaId: string, categoria: any) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onScheduleMaintenance }) => {
  const { alerts, criticalAlertCount, warningAlertCount, rules, updateRule } = useFleet();

  const [typeFilter, setTypeFilter] = useState<'TODAS' | VehicleType>('TODAS');
  const [showConfigRulesModal, setShowConfigRulesModal] = useState(false);

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    if (typeFilter === 'TODAS') return true;
    return a.tipoViatura === typeFilter;
  });

  const criticalAlerts = filteredAlerts.filter((a) => a.severidade === 'CRITICO');
  const warningAlerts = filteredAlerts.filter((a) => a.severidade === 'ATENCAO');
  const normalAlerts = filteredAlerts.filter((a) => a.severidade === 'NORMAL');

  return (
    <div className="space-y-6">
      {/* Top Banner Alertas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className={`p-3 rounded-xl border ${
            criticalAlertCount > 0
              ? 'bg-rose-950/60 border-rose-700/60 text-rose-400'
              : warningAlertCount > 0
              ? 'bg-amber-950/60 border-amber-700/60 text-amber-400'
              : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-100 flex items-center gap-2">
              Alertas Automáticos de Manutenção Preventiva
            </h2>
            <p className="text-xs text-zinc-400">
              Cálculo contínuo por odômetro (KM) e prazo temporal para motocicletas e viaturas 04 rodas
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Rules Config Button */}
          <button
            onClick={() => setShowConfigRulesModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Configurar Intervalos (KM)</span>
          </button>
        </div>
      </div>

      {/* Filter by Vehicle Type */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar por:
        </span>
        {(['TODAS', 'MOTOCICLETA', 'QUATRO_RODAS'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              typeFilter === t
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-750'
            }`}
          >
            {t === 'TODAS' ? 'Todas as Viaturas' : t === 'MOTOCICLETA' ? 'Motocicletas ROCAM' : 'Viaturas 04 Rodas'}
          </button>
        ))}
      </div>

      {/* 1. SEÇÃO DE ALERTAS CRÍTICOS (VENCIDOS) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Manutenções Vencidas (Intervenção Imediata Obrigatória) — {criticalAlerts.length}
          </h3>
        </div>

        {criticalAlerts.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-400 flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Nenhuma viatura com manutenção preventiva vencida no momento!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-zinc-900 border-2 border-rose-700/80 rounded-xl p-4 shadow-lg shadow-rose-950/30 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-1 rounded bg-zinc-800 text-amber-400">
                        {alert.tipoViatura === 'MOTOCICLETA' ? (
                          <Bike className="w-4 h-4" />
                        ) : (
                          <Car className="w-4 h-4" />
                        )}
                      </span>
                      <span className="font-mono font-black text-base text-zinc-100">
                        {alert.prefixoViatura}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">({alert.modeloViatura})</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                      Vencido há {Math.abs(alert.kmRestante).toLocaleString('pt-BR')} km
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-sm font-bold text-rose-300 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{alert.nomeItem}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">KM Atual:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {formatKm(alert.kmAtual)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">KM Limite Programado:</span>
                        <span className="font-mono text-zinc-300">
                          {formatKm(alert.kmProximaTroca)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-rose-400">
                        <span>Excedente Rodado:</span>
                        <span className="font-mono">
                          +{Math.abs(alert.kmRestante).toLocaleString('pt-BR')} km
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onScheduleMaintenance(alert.viaturaId, alert.categoria)}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-md cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Abrir O.S. Preventiva Imediata</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. SEÇÃO DE ALERTAS PRÓXIMOS (ATENÇÃO) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center space-x-2 text-amber-400">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Revisões Próximas do Limite (Planejamento de Garagem) — {warningAlerts.length}
          </h3>
        </div>

        {warningAlerts.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-400">
            Nenhuma viatura na faixa de alerta iminente no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {warningAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-zinc-900 border border-amber-600/70 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-1 rounded bg-zinc-800 text-amber-400">
                        {alert.tipoViatura === 'MOTOCICLETA' ? (
                          <Bike className="w-4 h-4" />
                        ) : (
                          <Car className="w-4 h-4" />
                        )}
                      </span>
                      <span className="font-mono font-black text-base text-zinc-100">
                        {alert.prefixoViatura}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">({alert.modeloViatura})</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-600/40">
                      Restam {alert.kmRestante.toLocaleString('pt-BR')} km
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-sm font-bold text-amber-300 flex items-center space-x-1.5">
                      <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>{alert.nomeItem}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-300 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">KM Atual:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {formatKm(alert.kmAtual)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Próxima Revisão:</span>
                        <span className="font-mono text-zinc-300">
                          {formatKm(alert.kmProximaTroca)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onScheduleMaintenance(alert.viaturaId, alert.categoria)}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Agendar Revisão Preventiva</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SEÇÃO EM DIA (STATUS REGULAR) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Manutenções em Dia ({normalAlerts.length} itens monitorados)
            </h3>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold text-[10px] uppercase border-b border-zinc-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Prefixo / Modelo</th>
                  <th className="py-2.5 px-4">Item de Manutenção</th>
                  <th className="py-2.5 px-4">KM Atual</th>
                  <th className="py-2.5 px-4">Próxima Troca</th>
                  <th className="py-2.5 px-4 text-right">KM Restante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {normalAlerts.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-850/40">
                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-200">
                      {a.prefixoViatura} <span className="text-zinc-400 font-normal">({a.modeloViatura})</span>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-300">{a.nomeItem}</td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">{formatKm(a.kmAtual)}</td>
                    <td className="py-2.5 px-4 font-mono text-zinc-300">{formatKm(a.kmProximaTroca)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                      +{a.kmRestante.toLocaleString('pt-BR')} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Configuração de Intervalos */}
      {showConfigRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Configurar Intervalos de Manutenção Preventiva ROCAM
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Ajuste as quilometragens para disparo automático de alertas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigRulesModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl bg-zinc-950">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-zinc-200">{rule.nomeItem}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono">
                        {rule.tipoViatura}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{rule.descricao}</p>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Intervalo de Troca (KM):
                        </label>
                        <input
                          type="number"
                          value={rule.intervaloKm}
                          onChange={(e) =>
                            updateRule(rule.id, { intervaloKm: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono font-bold text-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Avisar com antecedência (KM):
                        </label>
                        <input
                          type="number"
                          value={rule.avisoAntecipadoKm}
                          onChange={(e) =>
                            updateRule(rule.id, { avisoAntecipadoKm: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono font-bold text-zinc-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 bg-zinc-950">
              <button
                onClick={() => setShowConfigRulesModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition"
              >
                Concluir Configuração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
