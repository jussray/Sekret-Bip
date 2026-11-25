import * as FileSystem from 'expo-file-system';
import { getSupabase } from '../src/utils/supabase';

/**
 * Uploads a photo to Supabase Storage (journal-images bucket).
 * Returns the public URL on success, or throws on failure.
 */
export async function uploadImageToSupabase(
  localUri: string,
  userId: string,
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext) ? ext : 'jpg';
  const contentType = safeExt === 'png' ? 'image/png' : safeExt === 'webp' ? 'image/webp' : 'image/jpeg';
  const filename = `${userId}/${Date.now()}.${safeExt}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([byteArray], { type: contentType });

  const { data, error } = await supabase.storage
    .from('journal-images')
    .upload(filename, blob, { contentType, upsert: false });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('journal-images')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
