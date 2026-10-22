import { supabase } from './supabase';
import type { DamagePhoto } from '../types';

const BUCKET = 'damage-photos';

/**
 * Uploads newly-added data URLs only after a real Supabase Auth session is verified.
 * Legacy base64 photos remain readable until a separately verified backfill is run.
 */
export async function persistDamagePhotos(
  photos: DamagePhoto[] | undefined,
  cautelaId: string,
): Promise<DamagePhoto[]> {
  const items = photos || [];
  if (!items.length) return [];

  const needsUpload = items.filter((photo) => photo.dataUrl?.startsWith('data:') && !photo.storagePath);
  if (needsUpload.length) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Entre com sua conta ROCAM autenticada para salvar fotos de avarias.');
    }
  }

  const persisted: DamagePhoto[] = [];
  for (const photo of items) {
    if (!photo.dataUrl?.startsWith('data:') || photo.storagePath) {
      persisted.push(photo);
      continue;
    }
    const match = photo.dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
    if (!match) throw new Error('Formato de imagem inválido. Selecione a foto novamente.');
    const mimeType = match[1];
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const path = `${cautelaId}/${photo.id}.${extension}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([bytes], { type: mimeType }), {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw new Error(`Não foi possível guardar a foto no armazenamento privado: ${error.message}`);
    persisted.push({ ...photo, dataUrl: undefined, storagePath: path });
  }
  return persisted;
}

export async function getDamagePhotoUrl(photo: DamagePhoto): Promise<string> {
  if (photo.storagePath) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(photo.storagePath, 60 * 30);
    if (error || !data?.signedUrl) throw new Error('Não foi possível abrir a foto privada.');
    return data.signedUrl;
  }
  return photo.dataUrl || '';
}
