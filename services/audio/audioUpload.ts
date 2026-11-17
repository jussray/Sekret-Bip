import * as FileSystem from 'expo-file-system';
import { getSupabase } from '../../src/utils/supabase';

const VOICE_BUCKET = 'voice-notes';

export interface AudioUploadResult {
  storagePath: string;
}

/**
 * Uploads a local audio file to the canonical private Supabase Storage bucket.
 * Bucket: 'voice-notes' with owner-scoped RLS defined in db/storage.sql.
 * Returns only the storage path; callers must use an authenticated/private read path.
 */
export async function uploadAudioToSupabase(
  localUri: string,
  userId: string,
  context: 'pages' | 'voice_bip' | 'circle' | 'bridge'
): Promise<AudioUploadResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured. Audio upload unavailable.');

  const filename = `${userId}/${context}/${Date.now()}.m4a`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([byteArray], { type: 'audio/m4a' });

  const { data, error } = await supabase.storage
    .from(VOICE_BUCKET)
    .upload(filename, blob, {
      contentType: 'audio/m4a',
      upsert: false,
    });

  if (error) throw new Error(`Audio upload failed: ${error.message}`);

  return {
    storagePath: data.path,
  };
}

/**
 * Deletes an uploaded audio file from the canonical private bucket.
 */
export async function deleteAudioFromSupabase(storagePath: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured. Audio delete unavailable.');

  const { error } = await supabase.storage
    .from(VOICE_BUCKET)
    .remove([storagePath]);
  if (error) throw new Error(`Audio delete failed: ${error.message}`);
}
