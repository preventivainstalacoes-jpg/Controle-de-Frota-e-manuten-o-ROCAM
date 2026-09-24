import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleType, VehicleStatus } from '../types';
import { X, Bike, Car, Shield, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Vehicle, 'id' | 'dataUltimaAtualizacaoKm'>) => void;
  onDelete?: (id: string) => void;
  vehicleToEdit?: Vehicle | null;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  vehicleToEdit,
}) => {
  const [prefixo, setPrefixo] = useState('');
  const [placa, setPlaca] = useState('');
  const [tipo, setTipo] = useState<VehicleType>('MOTOCICLETA');
  const [marca, setMarca] = useState('Triumph');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [kmAtual, setKmAtual] = useState<number>(0);
  const [status, setStatus] = useState<VehicleStatus>('OPERACIONAL');
  const [pelotao, setPelotao] = useState('1º Pelotão ROCAM - Alpha');
  const [batalhao, setBatalhao] = useState('ROCAM');
  const [condutorPadrao, setCondutorPadrao] = useState('');
  const [motivoBaixa, setMotivoBaixa] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setShowDeleteConfirm(false);
    setFormError('');
    if (vehicleToEdit) {
      setPrefixo(vehicleToEdit.prefixo);
      setPlaca(vehicleToEdit.placa);
      setTipo(vehicleToEdit.tipo);
      setMarca(vehicleToEdit.marca);
      setModelo(vehicleToEdit.modelo);
      setAno(vehicleToEdit.ano);
      setKmAtual(vehicleToEdit.kmAtual);
      setStatus(vehicleToEdit.status);
      setPelotao(vehicleToEdit.pelotao);
      setBatalhao(vehicleToEdit.batalhao);
      setCondutorPadrao(vehicleToEdit.condutorPadrao || '');
      setMotivoBaixa(vehicleToEdit.motivoBaixa || '');
      setObservacoes(vehicleToEdit.observacoes || '');
    } else {
      setPrefixo(tipo === 'MOTOCICLETA' ? 'M-' : 'I-');
      setPlaca('');
      setMarca(tipo === 'MOTOCICLETA' ? 'Triumph' : 'Chevrolet');
      setModelo(tipo === 'MOTOCICLETA' ? 'Tiger 900 Rally Pro' : 'Trailblazer V6 4x4');
      setAno(new Date().getFullYear());
      setKmAtual(0);
      setStatus('OPERACIONAL');
      setPelotao('1º Pelotão ROCAM - Alpha');
      setBatalhao('ROCAM');
      setCondutorPadrao('');
      setMotivoBaixa('');
      setObservacoes('');
    }
  }, [vehicleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefixo.trim() || !modelo.trim()) {
      setFormError('Por favor, preencha o Prefixo Militar e o Modelo da viatura.');
      return;
    }

    onSave({
      prefixo: prefixo.trim().toUpperCase(),
      placa: placa.trim().toUpperCase(),
      tipo,
      marca: marca.trim(),
      modelo: modelo.trim(),
      ano: Number(ano),
      kmAtual: Number(kmAtual),
      status,
      pelotao: pelotao.trim(),
      batalhao: batalhao.trim(),
      condutorPadrao: condutorPadrao.trim() || undefined,
      motivoBaixa: status === 'BAIXADA' || status === 'EM_MANUTENCAO' ? motivoBaixa.trim() : undefined,
      observacoes: observacoes.trim() || undefined,
    });
    onClose();
  };

  const handleConfirmDelete = () => {
    if (vehicleToEdit && onDelete) {
      onDelete(vehicleToEdit.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              {tipo === 'MOTOCICLETA' ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {vehicleToEdit ? `Editar Viatura ${vehicleToEdit.prefixo}` : 'Cadastrar Nova Viatura ROCAM'}
              </h2>
              <p className="text-xs text-zinc-400">
                Controle de dados patrimoniais, odômetro e alocação tática
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Tipo de Viatura */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Tipo de Viatura Militar *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTipo('MOTOCICLETA');
                  if (!vehicleToEdit) {
                    setPrefixo('M-');
                    setMarca('Triumph');
                    setModelo('Tiger 900 Rally Pro');
                  }
                }}
                className={`flex items-center justify-center space-x-2.5 p-3 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                  tipo === 'MOTOCICLETA'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-400 shadow-sm'
                    : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Bike className="w-5 h-5" />
                <span>Motocicleta ROCAM</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipo('QUATRO_RODAS');
                  if (!vehicleToEdit) {
                    setPrefixo('I-');
                    setMarca('Chevrolet');
                    setModelo('Trailblazer V6 4x4');
                  }
                }}
                className={`flex items-center justify-center space-x-2.5 p-3 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                  tipo === 'QUATRO_RODAS'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-400 shadow-sm'
                    : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Car className="w-5 h-5" />
                <span>Viatura 04 Rodas (Apoio / CFP)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Prefixo */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Prefixo Militar *
              </label>
              <input
                type="text"
                required
                value={prefixo}
                onChange={(e) => setPrefixo(e.target.value)}
                placeholder={tipo === 'MOTOCICLETA' ? 'M-01201' : 'I-01250'}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Placa */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Placa Oficial / Mercosul
              </label>
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                placeholder="BRA-2A19"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Ano */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Ano Fabricação
              </label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                min={2000}
                max={2030}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Marca */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Marca / Fabricante
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Triumph, BMW, Yamaha, Honda..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Modelo da Viatura *
              </label>
              <input
                type="text"
                required
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Tiger 900 Rally Pro, F 850 GS, Hilux 4x4..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Km Atual */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Odômetro Atual (KM) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={kmAtual}
                onChange={(e) => setKmAtual(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Status Operacional
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="OPERACIONAL">OPERACIONAL (Pronta para patrulhamento)</option>
                <option value="BAIXADA">BAIXADA (Fora de serviço / avaria)</option>
                <option value="EM_MANUTENCAO">EM MANUTENÇÃO (Na mecânica/oficina)</option>
                <option value="RESERVA">RESERVA TÁTICA (Disponível)</option>
              </select>
            </div>
          </div>

          {/* Se baixada ou em manutenção: motivo */}
          {(status === 'BAIXADA' || status === 'EM_MANUTENCAO') && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-1">
              <label className="flex items-center space-x-1.5 text-xs font-bold text-rose-300 uppercase">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Motivo da Baixa / Manutenção *</span>
              </label>
              <input
                type="text"
                required
                value={motivoBaixa}
                onChange={(e) => setMotivoBaixa(e.target.value)}
                placeholder="Ex: Vazamento de bengala, pane elétrica chicote, colisão leve..."
                className="w-full px-3 py-2 bg-zinc-900 border border-rose-700/60 rounded-lg text-sm text-rose-100 placeholder-rose-400/50 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pelotão */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Pelotão / Fração
              </label>
              <input
                type="text"
                value={pelotao}
                onChange={(e) => setPelotao(e.target.value)}
                placeholder="1º Pelotão ROCAM - Alpha"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Condutor Padrão */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Condutor Militar Padrão / RE
              </label>
              <input
                type="text"
                value={condutorPadrao}
                onChange={(e) => setCondutorPadrao(e.target.value)}
                placeholder="Ex: CB PM Alencar (RE 184.201-3)"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Observações / Acessórios Táticos
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Equipada com sirene tática, baús laterais, protetor de motor reforçado..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Form Error Display */}
          {formError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700/60 text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Delete Confirmation Box */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-100 space-y-3 animate-in fade-in">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-rose-200">
                    Confirma a exclusão da viatura {vehicleToEdit?.prefixo}?
                  </div>
                  <div className="text-xs text-rose-300/80 mt-1">
                    Esta ação removerá esta viatura ({vehicleToEdit?.modelo} - {vehicleToEdit?.placa}) da frota da ROCAM e seu histórico associado.
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow transition cursor-pointer"
                >
                  Sim, Excluir Viatura Definitivamente
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <div>
              {vehicleToEdit && onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-rose-900/60 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Viatura</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
              >
                {vehicleToEdit ? 'Salvar Alterações' : 'Cadastrar Viatura'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
