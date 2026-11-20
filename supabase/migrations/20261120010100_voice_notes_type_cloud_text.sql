-- Se'kret Bip — add type and cloud_text to voice_notes
-- type: 'voice' | 'video' | 'text' | 'cloud' — matches VoiceNote.type
-- cloud_text: full thought text for Cloud Bips (title holds the preview truncation)

alter table public.voice_notes add column if not exists type       text;
alter table public.voice_notes add column if not exists cloud_text text;
