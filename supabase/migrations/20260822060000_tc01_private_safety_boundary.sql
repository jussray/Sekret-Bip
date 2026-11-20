-- TC-01: private or mixed-visibility child writing must not automatically enter
-- the safety-scan pipeline. Public-only content may retain automatic scanning.
--
-- Barrier A removes ingress from confirmed private/mixed-capability sources:
--   journal_entries  owner-only private journal
--   circle_posts     owner-only legacy circle content
--   posts            unified public/friends/crew content, so source type alone
--                    cannot prove the row is public
--
-- The trigger function is also made fail-closed and metadata-only. Even if a
-- stale private trigger attachment survived somewhere, it returns before any
-- outbound HTTP. The surviving public-only trigger sends no content body.

DROP TRIGGER IF EXISTS safety_scan_journal ON public.journal_entries;
DROP TRIGGER IF EXISTS safety_scan_circle ON public.circle_posts;
DROP TRIGGER IF EXISTS safety_scan_posts ON public.posts;

CREATE OR REPLACE FUNCTION public.trigger_safety_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id text;
  _secret text;
  _row jsonb;
BEGIN
  IF TG_TABLE_NAME::text <> 'public_circle_posts' THEN
    RETURN NEW;
  END IF;

  _row := to_jsonb(NEW);
  _user_id := coalesce(_row ->> 'user_id', _row ->> 'author_user_id');
  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret
    INTO _secret
    FROM vault.decrypted_secrets
   WHERE name = 'safety_scan_secret'
   LIMIT 1;

  IF _secret IS NULL OR _secret = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://tbsevonvegdnlyjgplmm.supabase.co/functions/v1/safety-scan',
    body := jsonb_build_object(
      'record_id', NEW.id::text,
      'user_id', _user_id,
      'source_table', TG_TABLE_NAME::text
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scan-secret', _secret
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.journal_entries.safety_flagged IS
  'Legacy safety marker. TC-01 forbids automatic safety scanning of private journal_entries.';
COMMENT ON COLUMN public.circle_posts.safety_flagged IS
  'Legacy safety marker. TC-01 forbids automatic safety scanning of owner-only circle_posts.';
COMMENT ON COLUMN public.posts.safety_flagged IS
  'Legacy safety marker. TC-01 forbids automatic scanning when source visibility cannot be proven public.';
