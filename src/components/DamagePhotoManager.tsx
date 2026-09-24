import React, { useState, useRef } from 'react';
import { DamagePhoto } from '../types';
import { compressImageFile } from '../utils/imageCompressor';
import {
  Camera,
  Upload,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  ZoomIn,
  Image as ImageIcon,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface DamagePhotoManagerProps {
  photos: DamagePhoto[];
  onChange?: (photos: DamagePhoto[]) => void;
  momento: 'SAIDA' | 'RETORNO';
  readOnly?: boolean;
  title?: string;
  subtitle?: string;
}

export const DamagePhotoManager: React.FC<DamagePhotoManagerProps> = ({
  photos = [],
  onChange,
  momento,
  readOnly = false,
  title = 'Registro Fotográfico de Avarias',
  subtitle = 'Anexe fotos comprobatórias de danos, mossas, riscos, pneus danificados ou componentes avariados.',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<DamagePhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onChange) return;
    setIsProcessing(true);

    try {
      const newPhotos: DamagePhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const compressedDataUrl = await compressImageFile(file, 1200, 1200, 0.75);
        newPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          dataUrl: compressedDataUrl,
          legenda: '',
          momento,
          dataHora: new Date().toISOString(),
        });
      }

      if (newPhotos.length > 0) {
        onChange([...photos, ...newPhotos]);
      }
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('Houve uma falha ao processar uma das fotos. Tente novamente com outra imagem.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    if (!onChange) return;
    onChange(photos.filter((p) => p.id !== id));
    if (previewPhoto?.id === id) {
      setPreviewPhoto(null);
    }
  };

  const handleUpdateLegenda = (id: string, legenda: string) => {
    if (!onChange) return;
    onChange(photos.map((p) => (p.id === id ? { ...p, legenda } : p)));
  };

  return (
    <div className="space-y-3">
      {/* Header and counter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              {title}
            </h4>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                photos.length > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {photos.length} foto{photos.length !== 1 ? 's' : ''}
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Action buttons (if not read-only) */}
        {!readOnly && (
          <div className="flex items-center space-x-2">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />

            {/* Direct Camera Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 hover:border-amber-500/50 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Abrir câmera do dispositivo"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Tirar Foto</span>
            </button>

            {/* Gallery Upload Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Carregar fotos salvas na galeria ou computador"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Galeria / Arquivo</span>
            </button>
          </div>
        )}
      </div>

      {/* Processing Loader */}
      {isProcessing && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center space-x-2 text-xs text-amber-300 animate-pulse">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Otimizando e comprimindo imagens... Aguarde.</span>
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && !isProcessing && (
        <div
          onClick={() => !readOnly && fileInputRef.current?.click()}
          className={`p-5 rounded-xl border border-dashed text-center transition ${
            readOnly
              ? 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
              : 'bg-zinc-950/70 border-zinc-800 hover:border-amber-500/40 cursor-pointer text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-1.5" />
          <div className="text-xs font-medium">
            {readOnly
              ? 'Nenhum registro fotográfico de avaria anexado a este termo.'
              : 'Nenhuma foto anexada. Clique para carregar ou use a câmera acima.'}
          </div>
          {!readOnly && (
            <div className="text-[10px] text-zinc-500 mt-1">
              Formatos aceitos: JPG, PNG, WEBP • Otimização automática
            </div>
          )}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition hover:border-zinc-700"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                <img
                  src={photo.dataUrl}
                  alt={photo.legenda || `Foto de avaria ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer transition group-hover:scale-105 duration-200"
                  onClick={() => setPreviewPhoto(photo)}
                />

                {/* Badge momento */}
                <div className="absolute top-1.5 left-1.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase ${
                      photo.momento === 'SAIDA'
                        ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60'
                        : 'bg-rose-950/90 text-rose-300 border border-rose-700/60'
                    }`}
                  >
                    {photo.momento === 'SAIDA' ? 'Saída' : 'Retorno'}
                  </span>
                </div>

                {/* Action overlays */}
                <div className="absolute top-1.5 right-1.5 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(photo)}
                    className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-zinc-200 hover:text-white transition cursor-pointer backdrop-blur-xs"
                    title="Ampliar foto"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemove(photo.id)}
                      className="p-1 rounded-md bg-rose-950/80 hover:bg-rose-700 text-rose-200 hover:text-white transition cursor-pointer backdrop-blur-xs"
                      title="Excluir foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Caption field */}
              <div className="p-2 flex-1 flex flex-col justify-between bg-zinc-900/60">
                {!readOnly ? (
                  <input
                    type="text"
                    value={photo.legenda || ''}
                    onChange={(e) => handleUpdateLegenda(photo.id, e.target.value)}
                    placeholder="Legenda da avaria..."
                    className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <div className="text-[11px] text-zinc-300 italic min-h-[1.5rem]">
                    {photo.legenda ? `"${photo.legenda}"` : 'Sem legenda informada'}
                  </div>
                )}
                <div className="text-[9px] text-zinc-500 font-mono mt-1 flex items-center justify-between">
                  <span>Foto #{index + 1}</span>
                  <span>{new Date(photo.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-zinc-900 border border-zinc-750 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase text-zinc-200">
                  Visualização de Avaria • {previewPhoto.momento === 'SAIDA' ? 'Inspeção de Saída' : 'Inspeção de Retorno'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High Res Image */}
            <div className="p-3 bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewPhoto.dataUrl}
                alt={previewPhoto.legenda || 'Avaria da viatura'}
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>

            {/* Bottom Caption and Info */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-zinc-100">
                  {previewPhoto.legenda || 'Avaria fotografada sem descrição'}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  Registrado em: {new Date(previewPhoto.dataHora).toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={previewPhoto.dataUrl}
                  download={`avaria_rocam_${previewPhoto.id}.jpg`}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                >
                  Baixar Imagem
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
