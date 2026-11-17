-- Migration: add sekret_reply column to journal_entries
-- File:      supabase/migrations/add_sekret_reply.sql
-- Safe:      IF NOT EXISTS guard prevents failure on re-run
-- Apply:     supabase db push  OR  paste into Supabase SQL editor
--
-- After running this migration, utils/sync.ts will write sekretReply
-- text to this column on every journal upsert, and pullAll() will
-- hydrate sekretReply on device restore.

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS sekret_reply text;

-- Confirm:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'journal_entries'
-- AND   column_name = 'sekret_reply';
