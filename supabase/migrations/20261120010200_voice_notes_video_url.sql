-- Se'kret Bip — add video_url to voice_notes
-- Stores the remote Supabase Storage URL for Video Bips.
-- audio_url was already present; this mirrors that pattern for video.

alter table public.voice_notes add column if not exists video_url text;
