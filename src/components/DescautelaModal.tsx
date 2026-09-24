import React, { useState, useEffect } from 'react';
import { CautelaRecord, ChecklistItem, Vehicle, DamagePhoto } from '../types';
import { generateDefaultChecklist } from '../data/defaultChecklist';
import { DamagePhotoManager } from './DamagePhotoManager';
import {
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Bike,
  Car,
  Fuel,
  Gauge,
  Shield,
  Clock,
  Check,
  Wrench
} from 'lucide-react';

interface DescautelaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cautela: CautelaRecord | null;
  onFinalizeDescautela: (
    id: string,
    descautelaData: {
      dataHoraRetorno: string;
      kmRetorno: number;
      combustivelRetorno: 'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO';
      recebedorNome?: string;
      recebedorRE?: string;
      observacoesRetorno?: string;
      checklistRetorno: ChecklistItem[];
      houveAvaria: boolean;
      descricaoAvaria?: string;
      baixarViatura?: boolean;
      motivoBaixa?: string;
      fotosAvariasRetorno?: DamagePhoto[];
    }
  ) => void;
}

export const DescautelaModal: React.FC<DescautelaModalProps> = ({
  isOpen,
  onClose,
  cautela,
  onFinalizeDescautela,
}) => {
  const [dataHoraRetorno, setDataHoraRetorno] = useState<string>('');
  const [kmRetorno, setKmRetorno] = useState<number>(0);
  const [combustivelRetorno, setCombustivelRetorno] = useState<'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO'>('1/2');
  const [observacoesRetorno, setObservacoesRetorno] = useState<string>('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [houveAvaria, setHouveAvaria] = useState<boolean>(false);
  const [descricaoAvaria, setDescricaoAvaria] = useState<string>('');
  const [baixarViatura, setBaixarViatura] = useState<boolean>(false);
  const [fotosAvariasRetorno, setFotosAvariasRetorno] = useState<DamagePhoto[]>([]);
  const [showSaidaPhotos, setShowSaidaPhotos] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen && cautela) {
      setErrorMessage('');
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDataHoraRetorno(localISO);
      setKmRetorno(cautela.kmSaida);
      setCombustivelRetorno('1/2');
      setObservacoesRetorno('');
      setHouveAvaria(false);
      setDescricaoAvaria('');
      setBaixarViatura(false);
      setFotosAvariasRetorno([]);
      setShowSaidaPhotos(false);
      // Initialize checklist matching departure checklist or default
      setChecklist(
        cautela.checklistSaida && cautela.checklistSaida.length > 0
          ? cautela.checklistSaida.map((item) => ({ ...item, id: `ret-${item.id}` }))
          : generateDefaultChecklist()
      );
    }
  }, [isOpen, cautela]);

  if (!isOpen || !cautela) return null;

  const kmPercorrido = Math.max(0, kmRetorno - cautela.kmSaida);

  const handleToggleCheckItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextConforme = !item.conforme;
          return {
            ...item,
            conforme: nextConforme,
            observacao: nextConforme ? '' : (item.observacao || 'Constatada avaria no retorno'),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kmRetorno < cautela.kmSaida) {
      setErrorMessage(`O odômetro de retorno (${kmRetorno} km) não pode ser menor que o de saída (${cautela.kmSaida} km).`);
      return;
    }
    if (houveAvaria && !descricaoAvaria.trim()) {
      setErrorMessage('Por favor, descreva a avaria ou incidente ocorrido durante o serviço.');
      return;
    }

    onFinalizeDescautela(cautela.id, {
      dataHoraRetorno,
      kmRetorno: Number(kmRetorno),
      combustivelRetorno,
      observacoesRetorno: observacoesRetorno.trim() || undefined,
      checklistRetorno: checklist,
      houveAvaria,
      descricaoAvaria: houveAvaria ? descricaoAvaria.trim() : undefined,
      baixarViatura: houveAvaria && baixarViatura,
      motivoBaixa: houveAvaria ? `Avaria no retorno da cautela ${cautela.numeroTermo}: ${descricaoAvaria.trim()}` : undefined,
      fotosAvariasRetorno: fotosAvariasRetorno.length > 0 ? fotosAvariasRetorno : undefined,
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
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <span>Descautela de Viatura • Retorno do Serviço</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                  {cautela.numeroTermo}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Conferência de encerramento de turno, inspeção física e apuração de quilometragem
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

          {/* Dados Resumidos da Cautela de Saída */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded bg-zinc-850 text-amber-400">
                  {cautela.tipoViatura === 'MOTOCICLETA' ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-100">
                    Viatura {cautela.prefixoViatura} • {cautela.modeloViatura}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Placa: {cautela.placaViatura} • {cautela.pelotao}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Em Serviço
                </span>
                <div className="text-[11px] text-zinc-400 font-mono mt-1">
                  Saída: {cautela.dataHoraSaida.replace('T', ' ')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-850 text-xs">
              <div>
                <span className="text-zinc-500 block">Condutor:</span>
                <span className="font-semibold text-zinc-200">
                  {cautela.condutorGraduacao} {cautela.condutorNome}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">RE Condutor:</span>
                <span className="font-mono text-zinc-300">{cautela.condutorRE}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Odômetro Saída:</span>
                <span className="font-mono font-bold text-amber-400">{cautela.kmSaida.toLocaleString('pt-BR')} km</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Combustível Saída:</span>
                <span className="text-zinc-300 font-medium">{cautela.combustivelSaida}</span>
              </div>
            </div>
          </div>

          {/* Dados de Retorno: Odômetro, Combustível, Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Odômetro de Retorno (KM) *
              </label>
              <input
                type="number"
                min={cautela.kmSaida}
                value={kmRetorno}
                onChange={(e) => setKmRetorno(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
              <div className="mt-1 text-xs text-zinc-400 flex items-center justify-between">
                <span>Distância percorrida:</span>
                <span className="font-mono font-bold text-emerald-400">
                  +{kmPercorrido.toLocaleString('pt-BR')} km
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-blue-400" />
                Nível de Combustível no Retorno *
              </label>
              <select
                value={combustivelRetorno}
                onChange={(e) => setCombustivelRetorno(e.target.value as any)}
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
                Data e Horário de Retorno *
              </label>
              <input
                type="datetime-local"
                value={dataHoraRetorno}
                onChange={(e) => setDataHoraRetorno(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Checklist de Descautela (Retorno) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Checklist de Inspeção de Devolução
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
                    Sem Alterações
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
                        placeholder="Descreva a avaria ou alteração constatada no retorno..."
                        className="w-full px-2 py-1 bg-zinc-950 border border-rose-800 rounded text-xs text-rose-200 placeholder:text-rose-400/50 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Registro de Avarias / Incidentes */}
          <div className={`p-4 rounded-xl border transition-all ${houveAvaria ? 'bg-rose-950/40 border-rose-800' : 'bg-zinc-950 border-zinc-800'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`w-4 h-4 ${houveAvaria ? 'text-rose-400' : 'text-zinc-500'}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Houve nova avaria, incidente ou colisão durante o serviço?
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setHouveAvaria(false);
                    setBaixarViatura(false);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    !houveAvaria ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => setHouveAvaria(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    houveAvaria ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sim
                </button>
              </div>
            </div>

            {houveAvaria && (
              <div className="mt-4 pt-3 border-t border-rose-900/60 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-200 mb-1">
                    Descrição Detalhada da Avaria / Ocorrência *
                  </label>
                  <textarea
                    rows={2}
                    value={descricaoAvaria}
                    onChange={(e) => setDescricaoAvaria(e.target.value)}
                    placeholder="Ex: Pneu furado em perseguição tática; barulho excessivo no câmbio; risco na lateral direita..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-rose-800 rounded-lg text-xs text-rose-100 placeholder:text-rose-400/50 focus:outline-none focus:border-rose-500"
                    required={houveAvaria}
                  />
                </div>

                <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80">
                  <input
                    type="checkbox"
                    checked={baixarViatura}
                    onChange={(e) => setBaixarViatura(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs text-rose-200">
                    <span className="font-bold block">Baixar viatura imediatamente (status BAIXADA)</span>
                    <span className="text-[11px] text-rose-300/80">
                      Impedirá nova cautela até que a viatura passe por manutenção corretiva
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Comparativo de Fotos da Saída se existirem */}
          {cautela.fotosAvariasSaida && cautela.fotosAvariasSaida.length > 0 && (
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                  <span className="text-emerald-400">●</span>
                  Fotos Anexadas na Saída ({cautela.fotosAvariasSaida.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowSaidaPhotos(!showSaidaPhotos)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  {showSaidaPhotos ? 'Ocultar fotos prévias' : 'Visualizar fotos prévias da saída'}
                </button>
              </div>

              {showSaidaPhotos && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <DamagePhotoManager
                    photos={cautela.fotosAvariasSaida}
                    momento="SAIDA"
                    readOnly
                    title="Fotos Registradas na Cautela de Saída"
                    subtitle="Fotos tiradas antes do patrulhamento para conferência e comparação de avarias prévias."
                  />
                </div>
              )}
            </div>
          )}

          {/* Registro Fotográfico de Avarias de Retorno */}
          <div className={`p-4 rounded-xl border transition-all ${
            houveAvaria || nonConformeCount > 0
              ? 'bg-rose-950/30 border-rose-800/80'
              : 'bg-zinc-950/70 border-zinc-800'
          }`}>
            <DamagePhotoManager
              photos={fotosAvariasRetorno}
              onChange={setFotosAvariasRetorno}
              momento="RETORNO"
              title="Registro Fotográfico de Avarias no Retorno (Descautela)"
              subtitle="Registre fotos comprobatórias de quaisquer novas avarias, arranhões, mossas ou danos constatados na devolução da viatura."
            />
          </div>

          {/* Observações Gerais do Retorno */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Observações Gerais do Retorno
            </label>
            <textarea
              rows={2}
              value={observacoesRetorno}
              onChange={(e) => setObservacoesRetorno(e.target.value)}
              placeholder="Ex: Viatura entregue limpa, abastecida e com equipamentos táticos íntegros..."
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
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Concluir Descautela & Atualizar Odômetro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
