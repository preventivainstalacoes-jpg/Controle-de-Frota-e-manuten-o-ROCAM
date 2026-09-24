import React from 'react';
import { CautelaRecord } from '../types';
import { DamagePhotoManager } from './DamagePhotoManager';
import {
  X,
  Printer,
  Shield,
  Bike,
  Car,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Gauge,
  Fuel,
  User,
  Check,
  Camera
} from 'lucide-react';

interface CautelaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cautela: CautelaRecord | null;
  onOpenDescautela?: (cautela: CautelaRecord) => void;
}

export const CautelaDetailModal: React.FC<CautelaDetailModalProps> = ({
  isOpen,
  onClose,
  cautela,
  onOpenDescautela,
}) => {
  if (!isOpen || !cautela) return null;

  const handlePrint = () => {
    window.print();
  };

  const isEmServico = cautela.status === 'EM_PATRULHAMENTO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl overflow-hidden my-6 print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none">
        {/* Header Modal - Non-printable controls */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-950 no-print">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-zinc-800 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <span>Ficha de Inspeção & Cautela Diária</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                  {cautela.numeroTermo}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Polícia Militar do Estado de São Paulo • ROCAM
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Ficha</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-4 text-zinc-100 print:text-black">
          {/* Official Document Banner */}
          <div className="text-center pb-4 border-b-2 border-zinc-800 print:border-black space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 print:text-gray-700">
              POLÍCIA MILITAR DO ESTADO DE SÃO PAULO
            </div>
            <div className="text-xs font-bold tracking-wider text-zinc-300 print:text-gray-800">
              COMANDO DE POLICIAMENTO DE CHOQUE • ROCAM
            </div>
            <h1 className="text-base sm:text-lg font-extrabold uppercase text-amber-400 print:text-black pt-1">
              TERMO DE INSPEÇÃO, CAUTELA E DESCAUTELA DIÁRIA DE VIATURA
            </h1>
            <div className="flex items-center justify-center gap-4 text-xs font-mono text-zinc-400 print:text-gray-600 pt-0.5">
              <span>Nº: {cautela.numeroTermo}</span>
              <span>•</span>
              <span>Pelotão: {cautela.pelotao}</span>
              <span>•</span>
              <span className={`font-bold ${isEmServico ? 'text-emerald-400 print:text-black' : 'text-zinc-300 print:text-black'}`}>
                {isEmServico ? 'EM PATRULHAMENTO' : 'SERVIÇO CONCLUÍDO'}
              </span>
            </div>
          </div>

          {/* Viatura Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-950 border border-zinc-800 print:bg-gray-100 print:border-gray-300 text-xs">
            <div>
              <span className="text-zinc-500 print:text-gray-600 block text-[10px] uppercase font-bold">Prefixo Militar</span>
              <span className="text-sm font-black text-amber-400 print:text-black font-mono">{cautela.prefixoViatura}</span>
            </div>
            <div>
              <span className="text-zinc-500 print:text-gray-600 block text-[10px] uppercase font-bold">Tipo / Modelo</span>
              <span className="font-bold text-zinc-200 print:text-black">{cautela.modeloViatura}</span>
            </div>
            <div>
              <span className="text-zinc-500 print:text-gray-600 block text-[10px] uppercase font-bold">Placa</span>
              <span className="font-mono font-bold text-zinc-200 print:text-black">{cautela.placaViatura}</span>
            </div>
            <div>
              <span className="text-zinc-500 print:text-gray-600 block text-[10px] uppercase font-bold">Pelotão Alocado</span>
              <span className="font-medium text-zinc-300 print:text-black">{cautela.pelotao}</span>
            </div>
          </div>

          {/* Two-Column Comparison: Saída (Cautela) vs Retorno (Descautela) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Saída / Cautela */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 print:border-gray-300 print:bg-white space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 print:border-gray-300">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-black flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  1. Cautela de Saída para o Serviço
                </span>
                <span className="text-[10px] font-mono text-zinc-400 print:text-gray-600">
                  {cautela.dataHoraSaida.replace('T', ' ')}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 print:text-gray-600">Policial Condutor:</span>
                  <span className="font-bold text-zinc-200 print:text-black">
                    {cautela.condutorGraduacao} {cautela.condutorNome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 print:text-gray-600">RE do Condutor:</span>
                  <span className="font-mono text-zinc-300 print:text-black">{cautela.condutorRE}</span>
                </div>
                {cautela.encarregadoVtr && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400 print:text-gray-600">Encarregado / Equipe:</span>
                    <span className="text-zinc-300 print:text-black">{cautela.encarregadoVtr}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-zinc-850 print:border-gray-200">
                  <span className="text-zinc-400 print:text-gray-600">Odômetro de Saída:</span>
                  <span className="font-mono font-bold text-amber-400 print:text-black">
                    {cautela.kmSaida.toLocaleString('pt-BR')} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 print:text-gray-600">Combustível na Saída:</span>
                  <span className="font-medium text-zinc-200 print:text-black">{cautela.combustivelSaida}</span>
                </div>
              </div>

              {cautela.observacoesSaida && (
                <div className="pt-2 border-t border-zinc-850 print:border-gray-200 text-xs text-zinc-400 print:text-gray-700">
                  <span className="font-semibold block text-[10px] uppercase text-zinc-500">Observações de Saída:</span>
                  <p className="mt-0.5">{cautela.observacoesSaida}</p>
                </div>
              )}
            </div>

            {/* Retorno / Descautela */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isEmServico
                ? 'bg-zinc-950/50 border-dashed border-zinc-700 print:border-gray-300'
                : 'bg-zinc-950 border-zinc-800 print:border-gray-300 print:bg-white'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 print:border-gray-300">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 print:text-black flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  2. Descautela de Retorno (Base / Garagem)
                </span>
                {!isEmServico && cautela.dataHoraRetorno && (
                  <span className="text-[10px] font-mono text-zinc-400 print:text-gray-600">
                    {cautela.dataHoraRetorno.replace('T', ' ')}
                  </span>
                )}
              </div>

              {isEmServico ? (
                <div className="py-6 text-center space-y-3">
                  <span className="text-xs text-zinc-400 print:text-gray-600 block">
                    Viatura atualmente em patrulhamento operacional.
                  </span>
                  {onOpenDescautela && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenDescautela(cautela);
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition cursor-pointer no-print shadow-md"
                    >
                      Realizar Descautela de Retorno
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {cautela.recebedorNome && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 print:text-gray-600">Recebedor na Base:</span>
                        <span className="font-bold text-zinc-200 print:text-black">{cautela.recebedorNome}</span>
                      </div>
                      {cautela.recebedorRE && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400 print:text-gray-600">RE do Recebedor:</span>
                          <span className="font-mono text-zinc-300 print:text-black">{cautela.recebedorRE}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between pt-1 border-t border-zinc-850 print:border-gray-200">
                    <span className="text-zinc-400 print:text-gray-600">Odômetro de Retorno:</span>
                    <span className="font-mono font-bold text-amber-400 print:text-black">
                      {cautela.kmRetorno?.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 print:text-gray-600">Distância Percorrida:</span>
                    <span className="font-mono font-bold text-emerald-400 print:text-black">
                      +{cautela.kmPercorrido?.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 print:text-gray-600">Combustível no Retorno:</span>
                    <span className="font-medium text-zinc-200 print:text-black">{cautela.combustivelRetorno}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-850 print:border-gray-200">
                    <span className="text-zinc-400 print:text-gray-600">Registro de Avarias:</span>
                    <span className={`font-bold ${cautela.houveAvaria ? 'text-rose-400 print:text-red-700' : 'text-emerald-400 print:text-green-700'}`}>
                      {cautela.houveAvaria ? 'SIM - AVARIA REGISTRADA' : 'NÃO - SEM AVARIAS'}
                    </span>
                  </div>

                  {cautela.descricaoAvaria && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-200 print:bg-red-50 print:border-red-300 print:text-black">
                      <span className="font-bold block text-[10px] uppercase text-rose-400">Detalhe da Avaria:</span>
                      <p>{cautela.descricaoAvaria}</p>
                    </div>
                  )}

                  {cautela.observacoesRetorno && (
                    <div className="pt-2 border-t border-zinc-850 print:border-gray-200 text-xs text-zinc-400 print:text-gray-700">
                      <span className="font-semibold block text-[10px] uppercase text-zinc-500">Observações de Retorno:</span>
                      <p className="mt-0.5">{cautela.observacoesRetorno}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Checklist Completo de Inspeção */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 print:text-black">
              Checklist de Itens Inspecionados na Cautela
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {cautela.checklistSaida.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
                    item.conforme
                      ? 'bg-zinc-950 border-zinc-800 print:bg-white print:border-gray-200'
                      : 'bg-rose-950/30 border-rose-800/80 print:bg-red-50 print:border-red-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[10px] text-zinc-500 font-bold">{idx + 1}.</span>
                      <span className="font-medium text-zinc-200 print:text-black">{item.item}</span>
                    </div>
                    {item.observacao && (
                      <p className="text-[11px] text-rose-400 print:text-red-700 mt-1 pl-4">
                        Obs: {item.observacao}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                      item.conforme
                        ? 'bg-emerald-500/20 text-emerald-400 print:text-black'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {item.conforme ? 'OK' : 'AVARIA'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Registro Fotográfico de Avarias & Inspeção Visual */}
          {((cautela.fotosAvariasSaida && cautela.fotosAvariasSaida.length > 0) ||
            (cautela.fotosAvariasRetorno && cautela.fotosAvariasRetorno.length > 0)) && (
            <div className="space-y-4 pt-4 border-t-2 border-zinc-800 print:border-black">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-amber-400 print:text-black" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 print:text-black">
                  Anexo Fotográfico de Avarias & Inspeção Visual
                </h3>
              </div>

              {cautela.fotosAvariasSaida && cautela.fotosAvariasSaida.length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 print:bg-white print:border-gray-300">
                  <DamagePhotoManager
                    photos={cautela.fotosAvariasSaida}
                    momento="SAIDA"
                    readOnly
                    title="Avarias Constatadas na Saída (Início de Turno)"
                    subtitle="Fotos registradas pelo policial condutor na retirada da viatura."
                  />
                </div>
              )}

              {cautela.fotosAvariasRetorno && cautela.fotosAvariasRetorno.length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 print:bg-white print:border-gray-300">
                  <DamagePhotoManager
                    photos={cautela.fotosAvariasRetorno}
                    momento="RETORNO"
                    readOnly
                    title="Avarias e Danos Constatados no Retorno (Descautela)"
                    subtitle="Fotos comprobatórias de danos ou sinistros ocorridos durante o serviço."
                  />
                </div>
              )}
            </div>
          )}

          {/* Campo Militar de Assinaturas */}
          <div className="pt-6 border-t-2 border-zinc-800 print:border-black mt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-8">
              <div className="border-b border-zinc-600 print:border-black w-4/5 mx-auto" />
              <div>
                <div className="font-bold text-zinc-200 print:text-black">
                  {cautela.condutorGraduacao} {cautela.condutorNome}
                </div>
                <div className="text-[11px] text-zinc-500 print:text-gray-600">
                  RE {cautela.condutorRE} • Policial Condutor
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="border-b border-zinc-600 print:border-black w-4/5 mx-auto" />
              <div>
                <div className="font-bold text-zinc-200 print:text-black">
                  {cautela.recebedorNome || 'Devolução da Viatura'}
                </div>
                <div className="text-[11px] text-zinc-500 print:text-gray-600">
                  {cautela.recebedorRE ? `RE ${cautela.recebedorRE} • Responsável Recebimento` : 'Encerramento de Turno / Base'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal Actions (Non-printable) */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950 no-print">
          <div className="text-xs text-zinc-400">
            Termo registrado no sistema de controle de frota da ROCAM.
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
