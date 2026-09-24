import React, { useState } from 'react';
import { Vehicle } from '../types';
import { Gauge, ArrowRight, Check, X, AlertTriangle } from 'lucide-react';
import { formatKm } from '../utils/formatters';

interface OdometerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onUpdate: (id: string, newKm: number, observacao?: string) => void;
}

export const OdometerModal: React.FC<OdometerModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onUpdate,
}) => {
  if (!isOpen || !vehicle) return null;

  const [newKm, setNewKm] = useState<number>(vehicle.kmAtual);
  const [observacao, setObservacao] = useState('');

  const kmDiff = newKm - vehicle.kmAtual;
  const isValid = newKm >= vehicle.kmAtual;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      alert('O novo odômetro não pode ser menor do que a quilometragem atual registrada.');
      return;
    }
    onUpdate(vehicle.id, newKm, observacao.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Atualizar Odômetro (KM)</h2>
              <p className="text-xs text-zinc-400 font-mono">
                {vehicle.prefixo} • {vehicle.modelo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>KM Anterior Registrado</span>
              <span>Novo KM Registrado</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold font-mono text-zinc-300">
                {formatKm(vehicle.kmAtual)}
              </span>
              <ArrowRight className="w-5 h-5 text-amber-500" />
              <div className="w-36">
                <input
                  type="number"
                  min={vehicle.kmAtual}
                  autoFocus
                  required
                  value={newKm}
                  onChange={(e) => setNewKm(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-amber-500/50 rounded-lg text-lg font-bold font-mono text-amber-400 focus:outline-none focus:border-amber-400 text-right"
                />
              </div>
            </div>
          </div>

          {/* KM Rodados no Turno */}
          <div className="flex items-center justify-between text-xs px-2 py-1">
            <span className="text-zinc-400">Distância percorrida no turno:</span>
            <span className={`font-mono font-bold ${kmDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              +{kmDiff.toLocaleString('pt-BR')} km
            </span>
          </div>

          {!isValid && (
            <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/60">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>O novo KM deve ser igual ou superior ao atual ({vehicle.kmAtual} km).</span>
            </div>
          )}

          {/* Observações da Passagem de Turno */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Registro / Observação do Turno (Opcional)
            </label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Turno Noturno 19h às 07h - Sem avarias"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 transition shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar KM</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
