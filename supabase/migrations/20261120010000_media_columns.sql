-- Se'kret Bip — media_url columns for circle posts + journal images
-- Enables voice bips in the public circle and photo cloud-sync for journal.

-- Circle post tables: all four need media_url for voice/photo bips
alter table public.circle_posts          add column if not exists media_url text;
alter table public.public_circle_posts   add column if not exists media_url text;
alter table public.friends_circle_posts  add column if not exists media_url text;
alter table public.crew_circle_posts     add column if not exists media_url text;

-- Journal: remote storage URL for attached photos/videos
alter table public.journal_entries       add column if not exists image_url text;
