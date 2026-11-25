import { getSupabase } from '../../src/utils/supabase';

export interface VideoUploadResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Uploads a local video file to Supabase Storage (voice-entries bucket).
 * Uses fetch → blob instead of base64 to avoid OOM on large video files.
 * Returns the public URL and storage path on success.
 */
export async function uploadVideoToSupabase(
  localUri: string,
  userId: string,
): Promise<VideoUploadResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'mp4';
  const safeExt = ['mp4', 'mov', 'avi'].includes(ext) ? ext : 'mp4';
  const contentType = safeExt === 'mov' ? 'video/quicktime' : 'video/mp4';
  const storagePath = `${userId}/video_bip/${Date.now()}.${safeExt}`;

  const response = await fetch(localUri);
  if (!response.ok) throw new Error('Failed to read local video file');
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from('voice-entries')
    .upload(storagePath, blob, { contentType, upsert: false });

  if (error) throw new Error(`Video upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('voice-entries')
    .getPublicUrl(data.path);

  return { publicUrl: urlData.publicUrl, storagePath: data.path };
}
