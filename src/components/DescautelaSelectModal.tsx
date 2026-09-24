import React from 'react';
import { CautelaRecord } from '../types';
import {
  X,
  RotateCcw,
  Bike,
  Car,
  User,
  Shield,
  Clock,
  Gauge,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatKm } from '../utils/formatters';

interface DescautelaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCautelas: CautelaRecord[];
  onSelectCautela: (cautela: CautelaRecord) => void;
  onOpenNewCautela?: () => void;
}

export const DescautelaSelectModal: React.FC<DescautelaSelectModalProps> = ({
  isOpen,
  onClose,
  activeCautelas,
  onSelectCautela,
  onOpenNewCautela,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
                Descautelar Viatura (Final do Serviço)
              </h2>
              <p className="text-xs text-zinc-400">
                Selecione a viatura que retornou à base para conferência de checklist, KM e encerramento do turno
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeCautelas.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-200">
                Nenhuma viatura em patrulhamento no momento
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Todas as viaturas operacionais estão aquarteladas na base ou em manutenção.
              </p>
              {onOpenNewCautela && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenNewCautela();
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition cursor-pointer"
                  >
                    + Registrar Nova Saída (Cautela)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>
                  {activeCautelas.length} viatura{activeCautelas.length > 1 ? 's' : ''} aguardando encerramento de turno:
                </span>
                <span className="text-emerald-400 font-medium">Em Serviço</span>
              </div>

              {activeCautelas.map((cautela) => (
                <div
                  key={cautela.id}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 rounded-xl bg-zinc-850 text-amber-400 border border-zinc-750 flex-shrink-0 mt-0.5">
                      {cautela.tipoViatura === 'MOTOCICLETA' ? (
                        <Bike className="w-5 h-5" />
                      ) : (
                        <Car className="w-5 h-5" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-base text-zinc-100">
                          {cautela.prefixoViatura}
                        </span>
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {cautela.placaViatura}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {cautela.modeloViatura}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-zinc-300">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-semibold text-zinc-200">
                          {cautela.condutorGraduacao} {cautela.condutorNome}
                        </span>
                        <span className="font-mono text-zinc-500 text-[11px]">
                          (RE {cautela.condutorRE})
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 pt-1">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>Saída: {cautela.dataHoraSaida.replace('T', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-1 font-mono">
                          <Gauge className="w-3 h-3 text-amber-500" />
                          <span>KM Saída: {formatKm(cautela.kmSaida)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Shield className="w-3 h-3 text-zinc-500" />
                          <span>{cautela.pelotao}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:self-center">
                    <button
                      onClick={() => {
                        onClose();
                        onSelectCautela(cautela);
                      }}
                      className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Descautelar Esta Viatura</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-zinc-950 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
