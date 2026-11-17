-- 20260619_safety_scan.sql
-- Se'kret Bip — Item 10 Safety Scan: schema fixes + trigger
--
-- Audit fixes applied:
--   • Drop content_preview from safety_alerts — parents must never see content text
--   • Add scan_metadata jsonb (reduced shape only)
--   • Add safety_flagged boolean to journal_entries, circle_posts, public_circle_posts
--   • s2tell_entries deferred — not shipping yet (see Section 4)
--   • Enable pg_net idempotently
--   • trigger_safety_scan() — AFTER INSERT, SECURITY DEFINER, bigint-safe id cast
--   • Uses net.http_post() (correct pg_net schema) with jsonb body + headers
--   • Shared secret via app.safety_scan_secret (superuser-only config)
--
-- Depends on: 0001_init.sql, 0002_circle_v1.sql, 0003_oracle_parentlinks_period_safety.sql


-- ── 1. pg_net extension ───────────────────────────────────────────────────────
-- Required for async HTTP calls from triggers.
-- Safe no-op if already present. Verify with:
--   SELECT * FROM pg_extension WHERE extname = 'pg_net';
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;


-- ── 2. Fix safety_alerts ──────────────────────────────────────────────────────
--
-- DROP content_preview:
--   It stored up to 200 chars of flagged teen content.
--   A false-positive would expose private journal text to a linked parent.
--   Parents now see only: severity, alert_type, source_table, created_at.
--
ALTER TABLE public.safety_alerts
  DROP COLUMN IF EXISTS content_preview;

-- ADD scan_metadata:
--   Stores reduced moderation result only:
--   { "flagged": bool, "top_category": text|null, "top_score": float, "provider": text }
--   Never stores full OpenAI response or any content text.
ALTER TABLE public.safety_alerts
  ADD COLUMN IF NOT EXISTS scan_metadata jsonb;


-- ── 3. Add safety_flagged to source tables ────────────────────────────────────
-- Lets the app show a soft in-app wellness prompt to the teen
-- without revealing any moderation details.
-- Service role sets this; authenticated users can only read their own row.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS safety_flagged boolean NOT NULL DEFAULT false;

ALTER TABLE public.circle_posts
  ADD COLUMN IF NOT EXISTS safety_flagged boolean NOT NULL DEFAULT false;

ALTER TABLE public.public_circle_posts
  ADD COLUMN IF NOT EXISTS safety_flagged boolean NOT NULL DEFAULT false;


-- ── 4. s2tell_entries — DEFERRED (S2Tell is not shipping yet) ─────────────────
--
-- Uncomment this entire block when S2Tell ships as part of Pages (Phase 5).
-- Do NOT run this section until the S2Tell UI is ready.
--
-- CREATE TABLE IF NOT EXISTS public.s2tell_entries (
--   id             bigint      NOT NULL,
--   user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   body           text        NOT NULL,
--   mood           text,
--   safety_flagged boolean     NOT NULL DEFAULT false,
--   created_at     timestamptz NOT NULL DEFAULT now(),
--   PRIMARY KEY (user_id, id)
-- );
--
-- ALTER TABLE public.s2tell_entries ENABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "s2tell: owner all" ON public.s2tell_entries;
-- CREATE POLICY "s2tell: owner all"
--   ON public.s2tell_entries FOR ALL
--   USING     (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
--
-- CREATE INDEX IF NOT EXISTS idx_s2tell_user_created
--   ON public.s2tell_entries (user_id, created_at DESC);
--
-- -- Also uncomment the s2tell trigger at the bottom of Section 6.


-- ── 5. trigger_safety_scan() ──────────────────────────────────────────────────
--
-- Fires AFTER INSERT on each scanned table.
-- TG_ARGV[0] carries the content column name so one function serves all tables.
-- NEW.id is cast to TEXT — safe for bigint, bigserial, and uuid source tables.
--
-- URL is hardcoded (project ref is stable and not sensitive).
-- Shared secret is read from Supabase Vault (vault.decrypted_secrets) — no
-- superuser config needed. If the secret hasn't been stored in Vault yet the
-- trigger returns immediately without blocking the user write.
--
-- SECURITY DEFINER: allows the function to read vault.decrypted_secrets
--   without granting Vault access to the calling session role.
-- search_path pinned to public: prevents search_path injection attacks.
--
-- Uses net.http_post() — the correct pg_net schema.
--   pg_net installs into the 'net' schema even when the extension itself is
--   created in 'extensions'. body and headers are passed as jsonb.

CREATE OR REPLACE FUNCTION public.trigger_safety_scan()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  _col_name text := TG_ARGV[0];  -- 'text' | 'body'
  _content  text;
  _secret   text;
BEGIN
  -- Resolve content column
  _content := CASE _col_name
    WHEN 'text' THEN NEW.text
    WHEN 'body' THEN NEW.body
    ELSE NULL
  END;

  -- Skip empty / whitespace-only content
  IF _content IS NULL OR length(trim(_content)) = 0 THEN
    RETURN NEW;
  END IF;

  -- Read shared secret from Supabase Vault (no superuser required).
  -- Store it with: SELECT vault.create_secret('<value>', 'safety_scan_secret');
  SELECT decrypted_secret
    INTO _secret
    FROM vault.decrypted_secrets
   WHERE name = 'safety_scan_secret'
   LIMIT 1;

  -- Silently skip if secret not yet stored in Vault
  IF _secret IS NULL OR _secret = '' THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget async HTTP POST via pg_net.
  -- AFTER INSERT: user write is already committed before this runs.
  -- net.http_post() is non-blocking — result is queued, not awaited.
  PERFORM net.http_post(
    url     := 'https://tbsevonvegdnlyjgplmm.supabase.co/functions/v1/safety-scan',
    body    := jsonb_build_object(
                 'record_id',    NEW.id::text,
                 'user_id',      NEW.user_id::text,
                 'source_table', TG_TABLE_NAME::text,
                 'content',      _content
               ),
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-scan-secret', _secret
               )
  );

  RETURN NEW;
END;
$$;


-- ── 6. Attach triggers ────────────────────────────────────────────────────────
-- Only attached to tables that exist now.
-- s2tell trigger is commented — uncomment when S2Tell ships (Phase 5).

DROP TRIGGER IF EXISTS safety_scan_journal ON public.journal_entries;
CREATE TRIGGER safety_scan_journal
  AFTER INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_safety_scan('text');

DROP TRIGGER IF EXISTS safety_scan_circle ON public.circle_posts;
CREATE TRIGGER safety_scan_circle
  AFTER INSERT ON public.circle_posts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_safety_scan('text');

DROP TRIGGER IF EXISTS safety_scan_public_circle ON public.public_circle_posts;
CREATE TRIGGER safety_scan_public_circle
  AFTER INSERT ON public.public_circle_posts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_safety_scan('text');

-- Uncomment when s2tell_entries table is created (Phase 5):
-- DROP TRIGGER IF EXISTS safety_scan_s2tell ON public.s2tell_entries;
-- CREATE TRIGGER safety_scan_s2tell
--   AFTER INSERT ON public.s2tell_entries
--   FOR EACH ROW EXECUTE FUNCTION public.trigger_safety_scan('body');


-- ── 7. Post-deploy config — run MANUALLY in Supabase SQL editor ───────────────
--
-- NOTE: ALTER DATABASE SET requires superuser — Supabase does not grant this.
-- Instead the trigger reads the secret from Supabase Vault and the URL is
-- hardcoded. Follow these steps after running this migration:
--
-- Step 1: deploy the Edge Function (run from your local machine with Supabase CLI)
--   supabase functions deploy safety-scan --no-verify-jwt
--
-- Step 2: set Edge Function env secrets (local CLI)
--   supabase secrets set SAFETY_SCAN_SECRET=<random-32+-char-secret>
--   supabase secrets set OPENAI_API_KEY=<your-key>
--
-- Step 3: store the shared secret in Supabase Vault (paste into SQL editor)
--   SELECT vault.create_secret('<same-value-as-SAFETY_SCAN_SECRET>', 'safety_scan_secret');
--
-- That's it — no ALTER DATABASE needed. The trigger reads from Vault and the
-- URL (https://tbsevonvegdnlyjgplmm.supabase.co/functions/v1/safety-scan)
-- is already hardcoded in the function above.
