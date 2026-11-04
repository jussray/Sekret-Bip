-- Migration: Add ai_disclosure_accepted_at to profiles
-- Tracks when the user accepted the AI companion disclosure.
-- NULL = not yet shown. Non-null = shown and accepted.
-- Apple App Store requirement: §2.5.16 AI content disclosure.
-- Run: supabase db push

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_disclosure_accepted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN profiles.ai_disclosure_accepted_at IS
  'Timestamp when the user accepted the AI companion disclosure modal. NULL = not yet shown. Apple App Store §2.5.16 requirement.';
