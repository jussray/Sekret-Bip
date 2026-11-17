-- Fixes a pre-existing bug in trigger_safety_scan(), confirmed by testing:
-- the static CASE (_col_name mapping to NEW.text / NEW.body) requires
-- Postgres to resolve BOTH branches against NEW's actual row type at plan
-- time, regardless of which branch executes - standard SQL CASE semantics.
-- Since no attached table has both a `text` and a `body` column, this
-- function has never actually worked on any table (journal_entries,
-- circle_posts, public_circle_posts all lack `body`; posts lacks `text`).
-- Confirmed via direct testing in a rolled-back transaction, on both an
-- existing table (circle_posts) and the newly-added posts attachment.
--
-- Same bug, same fix, applies to `NEW.user_id::text` in the http_post body:
-- posts has no `user_id` column (only `author_user_id`), so that reference
-- would fail the same way once the _content resolution was fixed.
--
-- Fix: resolve both fields dynamically via to_jsonb(NEW), which doesn't
-- require the column to exist at plan time - falls back to NULL instead,
-- handled explicitly below (skip scan if either is missing).
--
-- Applied to tbsevonvegdnlyjgplmm via apply_migration on 2026-07-01;
-- this file brings the repo migration history in line with that.

create or replace function public.trigger_safety_scan()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  _col_name text := TG_ARGV[0];  -- 'text' | 'body'
  _content  text;
  _user_id  text;
  _secret   text;
  _row      jsonb;
begin
  _row := to_jsonb(NEW);

  _content := _row ->> _col_name;
  _user_id := coalesce(_row ->> 'user_id', _row ->> 'author_user_id');

  IF _content IS NULL OR length(trim(_content)) = 0 THEN
    RETURN NEW;
  END IF;

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
    url     := 'https://tbsevonvegdnlyjgplmm.supabase.co/functions/v1/safety-scan',
    body    := jsonb_build_object(
                 'record_id',    NEW.id::text,
                 'user_id',      _user_id,
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
