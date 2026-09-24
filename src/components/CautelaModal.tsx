import React, { useState, useEffect } from 'react';
import { Vehicle, ChecklistItem, CautelaRecord, DamagePhoto } from '../types';
import { STANDARD_CHECKLIST_ITEMS, generateDefaultChecklist } from '../data/defaultChecklist';
import { DamagePhotoManager } from './DamagePhotoManager';
import {
  X,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Bike,
  Car,
  Fuel,
  Gauge,
  User,
  Shield,
  Calendar,
  Clock,
  Check,
  AlertTriangle
} from 'lucide-react';

interface CautelaModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  activeCautelas: CautelaRecord[];
  initialVehicleId?: string;
  onSaveCautela: (cautelaData: Omit<CautelaRecord, 'id' | 'numeroTermo' | 'status'>) => void;
}

export const CautelaModal: React.FC<CautelaModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  activeCautelas,
  initialVehicleId,
  onSaveCautela,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [dataHoraSaida, setDataHoraSaida] = useState<string>('');
  const [kmSaida, setKmSaida] = useState<number>(0);
  const [combustivelSaida, setCombustivelSaida] = useState<'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO'>('CHEIO');
  const [condutorGraduacao, setCondutorGraduacao] = useState<string>('CB PM');
  const [condutorNome, setCondutorNome] = useState<string>('');
  const [condutorRE, setCondutorRE] = useState<string>('');
  const [encarregadoVtr, setEncarregadoVtr] = useState<string>('');
  const [observacoesSaida, setObservacoesSaida] = useState<string>('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [fotosAvariasSaida, setFotosAvariasSaida] = useState<DamagePhoto[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Selected vehicle object
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Active cautela for selected vehicle, if any
  const selectedVehicleActiveCautela = activeCautelas.find(
    (c) => c.viaturaId === selectedVehicleId && c.status === 'EM_PATRULHAMENTO'
  );

  // Set initial default date/time and vehicle
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      const now = new Date();
      // Format YYYY-MM-DDTHH:mm
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDataHoraSaida(localISO);

      // Find all vehicles eligible for cautela (OPERATIONAL or RESERVA and not already out)
      const eligibleVehicles = vehicles.filter(
        (v) =>
          (v.status === 'OPERACIONAL' || v.status === 'RESERVA') &&
          !activeCautelas.some((c) => c.viaturaId === v.id && c.status === 'EM_PATRULHAMENTO')
      );

      // Choose vehicle: if initialVehicleId is provided and NOT currently out
      const isInitialVehicleOut = initialVehicleId
        ? activeCautelas.some((c) => c.viaturaId === initialVehicleId && c.status === 'EM_PATRULHAMENTO')
        : false;

      if (initialVehicleId && !isInitialVehicleOut) {
        setSelectedVehicleId(initialVehicleId);
        const v = vehicles.find((veh) => veh.id === initialVehicleId);
        if (v) {
          setKmSaida(v.kmAtual);
          if (v.condutorPadrao) {
            // Try extracting graduacao, nome, re
            const parts = v.condutorPadrao.split(' ');
            if (parts.length >= 2) {
              setCondutorGraduacao(parts[0] + ' PM');
              setCondutorNome(parts.slice(1).join(' ').replace(/\(RE.*\)/, '').trim());
            }
          }
        }
      } else if (eligibleVehicles.length > 0) {
        setSelectedVehicleId(eligibleVehicles[0].id);
        setKmSaida(eligibleVehicles[0].kmAtual);
        if (eligibleVehicles[0].condutorPadrao) {
          const parts = eligibleVehicles[0].condutorPadrao.split(' ');
          if (parts.length >= 2) {
            setCondutorGraduacao(parts[0] + ' PM');
            setCondutorNome(parts.slice(1).join(' ').replace(/\(RE.*\)/, '').trim());
          }
        }
      } else if (vehicles.length > 0) {
        setSelectedVehicleId(vehicles[0].id);
        setKmSaida(vehicles[0].kmAtual);
      }
    }

    setChecklist(generateDefaultChecklist());
    setFotosAvariasSaida([]);
  }, [isOpen, initialVehicleId, vehicles, activeCautelas]);

  // When vehicle changes, update KM
  const handleVehicleChange = (newId: string) => {
    setSelectedVehicleId(newId);
    const v = vehicles.find((veh) => veh.id === newId);
    if (v) {
      setKmSaida(v.kmAtual);
    }
  };

  const handleToggleCheckItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextConforme = !item.conforme;
          return {
            ...item,
            conforme: nextConforme,
            observacao: nextConforme ? '' : (item.observacao || 'Constatada avaria/alteração visual'),
          };
        }
        return item;
      })
    );
  };

  const handleItemObsChange = (id: string, obs: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, observacao: obs } : item))
    );
  };

  const handleMarkAllConforme = () => {
    setChecklist((prev) =>
      prev.map((item) => ({
        ...item,
        conforme: true,
        observacao: '',
      }))
    );
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      setErrorMessage('Selecione uma viatura para cautelar.');
      return;
    }

    // Bloqueio rigoroso: não permitir que viatura cautelada seja cautelada novamente
    if (selectedVehicleActiveCautela) {
      setErrorMessage(
        `A viatura ${selectedVehicle.prefixo} já possui cautela ativa em andamento com o policial ${selectedVehicleActiveCautela.condutorGraduacao} ${selectedVehicleActiveCautela.condutorNome} (${selectedVehicleActiveCautela.numeroTermo}). Realize a descautela de retorno antes de retirá-la novamente.`
      );
      return;
    }

    if (selectedVehicle.status === 'BAIXADA') {
      setErrorMessage(
        `A viatura ${selectedVehicle.prefixo} está BAIXADA (${selectedVehicle.motivoBaixa || 'manutenção'}) e não pode ser cautelada.`
      );
      return;
    }

    if (!condutorNome.trim()) {
      setErrorMessage('Informe o nome de guerra do condutor da viatura.');
      return;
    }
    if (!condutorRE.trim()) {
      setErrorMessage('Informe o RE (Registro Estatístico) do militar condutor.');
      return;
    }
    if (kmSaida < 0) {
      setErrorMessage('O odômetro de saída não pode ser negativo.');
      return;
    }

    onSaveCautela({
      viaturaId: selectedVehicle.id,
      prefixoViatura: selectedVehicle.prefixo,
      tipoViatura: selectedVehicle.tipo,
      modeloViatura: selectedVehicle.modelo,
      placaViatura: selectedVehicle.placa,
      pelotao: selectedVehicle.pelotao,
      dataHoraSaida,
      kmSaida: Number(kmSaida),
      combustivelSaida,
      condutorGraduacao,
      condutorNome: condutorNome.trim().toUpperCase(),
      condutorRE: condutorRE.trim().toUpperCase(),
      encarregadoVtr: encarregadoVtr.trim() || undefined,
      observacoesSaida: observacoesSaida.trim() || undefined,
      checklistSaida: checklist,
      fotosAvariasSaida: fotosAvariasSaida.length > 0 ? fotosAvariasSaida : undefined,
    });

    onClose();
  };

  const nonConformeCount = checklist.filter((c) => !c.conforme).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <span>Cautela de Viatura • Saída Operacional</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  ROCAM
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Inspeção prévia obrigatória, conferência de odômetro e liberação para patrulhamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-700/80 text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Viatura Selection and Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Viatura a Cautelar *
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className={`w-full px-3 py-2 bg-zinc-900 border rounded-lg text-sm text-zinc-100 focus:outline-none ${
                  selectedVehicleActiveCautela
                    ? 'border-rose-600 focus:border-rose-500'
                    : 'border-zinc-700 focus:border-amber-500'
                }`}
              >
                {/* Viaturas disponíveis para cautela */}
                <optgroup label="Disponíveis para Cautela">
                  {vehicles
                    .filter(
                      (v) =>
                        (v.status === 'OPERACIONAL' || v.status === 'RESERVA') &&
                        !activeCautelas.some((c) => c.viaturaId === v.id && c.status === 'EM_PATRULHAMENTO')
                    )
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.prefixo} • {v.modelo} ({v.placa}) - {v.status} [DISPONÍVEL]
                      </option>
                    ))}
                </optgroup>

                {/* Viaturas já cauteladas em patrulhamento (bloqueadas) */}
                {vehicles.some((v) =>
                  activeCautelas.some((c) => c.viaturaId === v.id && c.status === 'EM_PATRULHAMENTO')
                ) && (
                  <optgroup label="Indisponíveis - Já Cauteladas (Em Patrulhamento)">
                    {vehicles
                      .filter((v) =>
                        activeCautelas.some((c) => c.viaturaId === v.id && c.status === 'EM_PATRULHAMENTO')
                      )
                      .map((v) => {
                        const cautelaAtiva = activeCautelas.find(
                          (c) => c.viaturaId === v.id && c.status === 'EM_PATRULHAMENTO'
                        );
                        return (
                          <option key={v.id} value={v.id} disabled>
                            ⛔ {v.prefixo} • {v.modelo} - JÁ CAUTELADA ({cautelaAtiva?.condutorGraduacao} {cautelaAtiva?.condutorNome})
                          </option>
                        );
                      })}
                  </optgroup>
                )}

                {/* Viaturas baixadas */}
                {vehicles.some((v) => v.status === 'BAIXADA') && (
                  <optgroup label="Indisponíveis - Baixadas para Manutenção">
                    {vehicles
                      .filter((v) => v.status === 'BAIXADA')
                      .map((v) => (
                        <option key={v.id} value={v.id} disabled>
                          ⚠️ {v.prefixo} • {v.modelo} - BAIXADA
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedVehicle && (
              <div className={`flex items-center space-x-3 text-xs p-2.5 rounded-lg border ${
                selectedVehicleActiveCautela
                  ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300'
              }`}>
                <div className={`p-2 rounded ${selectedVehicleActiveCautela ? 'bg-rose-900/60 text-rose-300' : 'bg-zinc-800 text-amber-400'}`}>
                  {selectedVehicle.tipo === 'MOTOCICLETA' ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-zinc-100 flex items-center gap-2">
                    <span>{selectedVehicle.prefixo} • {selectedVehicle.modelo}</span>
                    {selectedVehicleActiveCautela ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        JÁ EM SERVIÇO
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        DISPONÍVEL
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-400">Placa: {selectedVehicle.placa} • {selectedVehicle.pelotao}</div>
                  <div className="text-zinc-500 font-mono">KM Atual Registrado: {selectedVehicle.kmAtual.toLocaleString('pt-BR')} km</div>
                </div>
              </div>
            )}
          </div>

          {/* Banner de Bloqueio se viatura selecionada já estiver cautelada */}
          {selectedVehicleActiveCautela && (
            <div className="p-4 rounded-xl bg-rose-950/80 border-2 border-rose-600/80 text-rose-100 flex items-start space-x-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Bloqueio Operacional: Viatura Já Cautelada
                </div>
                <div className="text-xs">
                  A viatura <strong>{selectedVehicle?.prefixo}</strong> está atualmente em serviço (cautela <strong>{selectedVehicleActiveCautela.numeroTermo}</strong>) sob a responsabilidade de <strong>{selectedVehicleActiveCautela.condutorGraduacao} {selectedVehicleActiveCautela.condutorNome}</strong> (RE: {selectedVehicleActiveCautela.condutorRE}).
                </div>
                <div className="text-[11px] text-rose-300 font-medium pt-1">
                  Não é permitido cautelar uma viatura que já se encontra em patrulhamento. Realize a descautela de retorno antes de expedir um novo termo de saída.
                </div>
              </div>
            </div>
          )}

          {/* Saída Info: Odômetro, Combustível, Data/Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                Odômetro de Saída (KM) *
              </label>
              <input
                type="number"
                min="0"
                value={kmSaida}
                onChange={(e) => setKmSaida(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-blue-400" />
                Nível de Combustível *
              </label>
              <select
                value={combustivelSaida}
                onChange={(e) => setCombustivelSaida(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="CHEIO">Tanque Cheio (100%)</option>
                <option value="3/4">3/4 Tanque</option>
                <option value="1/2">1/2 Tanque (Meio)</option>
                <option value="1/4">1/4 Tanque</option>
                <option value="RESERVA">Na Reserva</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Data e Horário de Saída *
              </label>
              <input
                type="datetime-local"
                value={dataHoraSaida}
                onChange={(e) => setDataHoraSaida(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Dados do Militar Condutor */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Policial Militar Condutor / Responsável</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Posto / Graduação *
                </label>
                <select
                  value={condutorGraduacao}
                  onChange={(e) => setCondutorGraduacao(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="SD PM">SD PM (Soldado)</option>
                  <option value="CB PM">CB PM (Cabo)</option>
                  <option value="3º SGT PM">3º SGT PM (3º Sargento)</option>
                  <option value="2º SGT PM">2º SGT PM (2º Sargento)</option>
                  <option value="1º SGT PM">1º SGT PM (1º Sargento)</option>
                  <option value="SUBTEN PM">SUBTEN PM (Subtenente)</option>
                  <option value="2º TEN PM">2º TEN PM (2º Tenente)</option>
                  <option value="1º TEN PM">1º TEN PM (1º Tenente)</option>
                  <option value="CAP PM">CAP PM (Capitão)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nome de Guerra *
                </label>
                <input
                  type="text"
                  value={condutorNome}
                  onChange={(e) => setCondutorNome(e.target.value)}
                  placeholder="Ex: ALENCAR"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 uppercase focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Registro Estatístico (RE) *
                </label>
                <input
                  type="text"
                  value={condutorRE}
                  onChange={(e) => setCondutorRE(e.target.value)}
                  placeholder="Ex: 184.201-3"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Encarregado / Comandante da Equipe (Opcional)
              </label>
              <input
                type="text"
                value={encarregadoVtr}
                onChange={(e) => setEncarregadoVtr(e.target.value)}
                placeholder="Ex: 1º SGT PM Prado (RE 122.901-4) ou Equipe ROCAM Alpha"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Checklist de Cautela (Saída) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Checklist de Inspeção Prévia (Saída)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  {checklist.length} itens
                </span>
                {nonConformeCount > 0 ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    {nonConformeCount} Não Conforme{nonConformeCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    100% Conforme
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleMarkAllConforme}
                className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/60 rounded-lg transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Marcar Todos Conformes (OK)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {checklist.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    item.conforme
                      ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                      : 'bg-rose-950/30 border-rose-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2">
                      <span className="text-[10px] font-mono text-zinc-500 font-bold mt-0.5">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="text-xs font-medium text-zinc-200 leading-tight">
                        {item.item}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleCheckItem(item.id)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer whitespace-nowrap transition ${
                        item.conforme
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-rose-600 text-white shadow-sm hover:bg-rose-500'
                      }`}
                    >
                      {item.conforme ? 'OK' : 'AVARIA'}
                    </button>
                  </div>

                  {!item.conforme && (
                    <div className="mt-2 pt-2 border-t border-rose-900/50">
                      <input
                        type="text"
                        value={item.observacao || ''}
                        onChange={(e) => handleItemObsChange(item.id, e.target.value)}
                        placeholder="Descreva a inconformidade / avaria..."
                        className="w-full px-2 py-1 bg-zinc-950 border border-rose-800 rounded text-xs text-rose-200 placeholder:text-rose-400/50 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Registro Fotográfico de Avarias Pré-existentes */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <DamagePhotoManager
              photos={fotosAvariasSaida}
              onChange={setFotosAvariasSaida}
              momento="SAIDA"
              title="Registro Fotográfico de Avarias Pré-existentes (Saída)"
              subtitle="Registre fotos de eventuais avarias prévias na viatura antes do início do turno operacional (riscos, mossas, pneus, carenagens)."
            />
          </div>

          {/* Observações Gerais */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Observações Gerais da Cautela / Destinação da Viatura
            </label>
            <textarea
              rows={2}
              value={observacoesSaida}
              onChange={(e) => setObservacoesSaida(e.target.value)}
              placeholder="Ex: Saída para patrulhamento tático ostensivo de rotina na área central..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={Boolean(selectedVehicleActiveCautela) || selectedVehicle?.status === 'BAIXADA'}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>
                {selectedVehicleActiveCautela
                  ? 'Viatura Indisponível (Já Cautelada)'
                  : selectedVehicle?.status === 'BAIXADA'
                  ? 'Viatura Indisponível (Baixada)'
                  : 'Confirmar Cautela & Saída da Viatura'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
