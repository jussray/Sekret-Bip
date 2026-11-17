-- ─────────────────────────────────────────────────────────────────────────────
-- 20260701_control_room_normalization.sql
-- PR 2: Issue normalization pipeline for Se'kret Bip Founder Control Room
--
-- Builds on the control_room_issues stub from 20240702_control_room_issues.sql.
-- Adds:
--   · full column set on control_room_issues
--   · control_room_issue_events  (links raw audit_events → issues)
--   · control_room_fingerprints  (deduplication key registry)
--   · upsert_control_room_issue() function (fingerprint-keyed upsert)
--   · auto-resolve trigger on audit_events
--   · founder-only RLS on all new objects
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helpers ──────────────────────────────────────────────────────────────────

create or replace function public.is_founder()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.app_profiles
    where user_id = auth.uid()
      and role in ('founder', 'admin', 'developer')
      and can_view_audits = true
  );
$$;

-- ── Expand control_room_issues ───────────────────────────────────────────────
-- The stub table already exists from 20240702_control_room_issues.sql.
-- Add missing columns idempotently.

alter table public.control_room_issues
  add column if not exists source             text not null default 'runtime',
  add column if not exists fingerprint        text,
  add column if not exists affected_surface   text,
  add column if not exists affected_users     integer not null default 0,
  add column if not exists occurrence_count   integer not null default 1,
  add column if not exists first_seen_at      timestamptz not null default now(),
  add column if not exists last_seen_at       timestamptz not null default now(),
  add column if not exists suggested_fix      text,
  add column if not exists owner              text,
  add column if not exists linked_release     text,
  add column if not exists assigned_to        text,
  add column if not exists resolved_at        timestamptz,
  add column if not exists resolved_by        uuid references auth.users(id),
  add column if not exists notes              text;

-- Unique fingerprint index — one issue per (source, event_type, surface)
create unique index if not exists control_room_issues_fingerprint_idx
  on public.control_room_issues (fingerprint)
  where fingerprint is not null;

-- Performance indexes
create index if not exists control_room_issues_severity_idx
  on public.control_room_issues (severity);
create index if not exists control_room_issues_status_idx
  on public.control_room_issues (status);
create index if not exists control_room_issues_last_seen_idx
  on public.control_room_issues (last_seen_at desc);
create index if not exists control_room_issues_source_idx
  on public.control_room_issues (source);

-- RLS (drop old policy first to avoid duplicate-name error)
alter table public.control_room_issues enable row level security;

drop policy if exists "Founder: control room issues" on public.control_room_issues;
create policy "Founder: control room issues"
  on public.control_room_issues
  for all
  using (public.is_founder())
  with check (public.is_founder());

-- ── control_room_issue_events ─────────────────────────────────────────────────
-- Join table: links one audit_events row to the issue it was grouped into.
-- Keeps audit_events append-only; issues are the mutable layer.

create table if not exists public.control_room_issue_events (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references public.control_room_issues(id) on delete cascade,
  event_id    uuid not null references public.audit_events(id) on delete cascade,
  linked_at   timestamptz not null default now(),
  constraint control_room_issue_events_unique unique (issue_id, event_id)
);

create index if not exists crie_issue_id_idx on public.control_room_issue_events (issue_id);
create index if not exists crie_event_id_idx on public.control_room_issue_events (event_id);

alter table public.control_room_issue_events enable row level security;

create policy "Founder: issue events"
  on public.control_room_issue_events
  for all
  using (public.is_founder())
  with check (public.is_founder());

-- ── control_room_fingerprints ────────────────────────────────────────────────
-- Registry of known fingerprint keys and their suggested fix copy.
-- Populated at ingest time; updated by the normalization service.

create table if not exists public.control_room_fingerprints (
  fingerprint       text primary key,
  source            text not null default 'runtime',
  category          text not null default 'runtime',
  default_severity  text not null default 'error',
  title_template    text not null,
  summary_template  text,
  suggested_fix     text,
  affected_surface  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.control_room_fingerprints enable row level security;

create policy "Founder: fingerprints"
  on public.control_room_fingerprints
  for all
  using (public.is_founder())
  with check (public.is_founder());

-- ── control_room_issue_history ───────────────────────────────────────────────
-- Immutable log of every status/assignment/notes change on an issue.

create table if not exists public.control_room_issue_history (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references public.control_room_issues(id) on delete cascade,
  changed_by  uuid references auth.users(id),
  field       text not null,
  old_value   text,
  new_value   text,
  changed_at  timestamptz not null default now()
);

create index if not exists crih_issue_id_idx on public.control_room_issue_history (issue_id);
create index if not exists crih_changed_at_idx on public.control_room_issue_history (changed_at desc);

alter table public.control_room_issue_history enable row level security;

create policy "Founder: issue history"
  on public.control_room_issue_history
  for all
  using (public.is_founder());

-- ── upsert_control_room_issue() ───────────────────────────────────────────────
-- Called by the normalization Edge Function or the TypeScript ingest service.
-- On conflict (fingerprint): increments counters, updates severity/last_seen.
-- Inserts fresh if no matching fingerprint exists.

create or replace function public.upsert_control_room_issue(
  p_fingerprint        text,
  p_source             text,
  p_category           text,
  p_severity           text,
  p_status             text,
  p_title              text,
  p_summary            text,
  p_suggested_fix      text,
  p_affected_surface   text,
  p_affected_user_id   uuid,        -- single user from this event (may be null)
  p_event_id           uuid,        -- audit_events.id being ingested
  p_metadata           jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_issue_id       uuid;
  v_existing_users uuid[];
begin
  -- Try to find an existing open/active issue with this fingerprint
  select id
    into v_issue_id
    from public.control_room_issues
   where fingerprint = p_fingerprint
     and status not in ('resolved', 'ignored')
   limit 1;

  if v_issue_id is not null then
    -- Increment occurrence counter, update last_seen, possibly escalate severity
    update public.control_room_issues
       set occurrence_count = occurrence_count + 1,
           last_seen_at     = now(),
           severity         = case
                                when p_severity = 'critical' then 'critical'
                                when severity   = 'critical' then 'critical'
                                when p_severity = 'error'    then 'error'
                                when severity   = 'error'    then 'error'
                                else p_severity
                              end,
           updated_at       = now()
     where id = v_issue_id;

    -- Update affected_users count if this is a new user for this issue
    if p_affected_user_id is not null then
      select coalesce(
        (select array_agg(distinct (aie.event_id)::text::uuid)
           from public.control_room_issue_events aie
           join public.audit_events ae on ae.id = aie.event_id
          where aie.issue_id = v_issue_id
            and ae.user_id = p_affected_user_id),
        '{}'
      ) into v_existing_users;

      if array_length(v_existing_users, 1) is null then
        update public.control_room_issues
           set affected_users = affected_users + 1
         where id = v_issue_id;
      end if;
    end if;

  else
    -- Insert new issue
    insert into public.control_room_issues (
      fingerprint, source, category, severity, status,
      title, summary, suggested_fix, affected_surface,
      affected_users, occurrence_count,
      first_seen_at, last_seen_at, metadata
    ) values (
      p_fingerprint, p_source, p_category, p_severity, p_status,
      p_title, p_summary, p_suggested_fix, p_affected_surface,
      case when p_affected_user_id is not null then 1 else 0 end,
      1,
      now(), now(), p_metadata
    )
    returning id into v_issue_id;
  end if;

  -- Link the raw event to the issue (ignore duplicates)
  if p_event_id is not null then
    insert into public.control_room_issue_events (issue_id, event_id)
    values (v_issue_id, p_event_id)
    on conflict (issue_id, event_id) do nothing;
  end if;

  return v_issue_id;
end;
$$;

-- ── Auto-resolve trigger ──────────────────────────────────────────────────────
-- When an audit_events row is marked resolved=true, find the open issue
-- linked to it and check if ALL linked events are now resolved. If so,
-- close the issue automatically.

create or replace function public.auto_resolve_issue_on_event_resolve()
returns trigger
language plpgsql
security definer
as $$
declare
  v_issue_id      uuid;
  v_unresolved    integer;
begin
  -- Only act when resolved flips to true
  if new.resolved = true and (old.resolved = false or old.resolved is null) then

    -- Find the issue this event belongs to
    select issue_id into v_issue_id
      from public.control_room_issue_events
     where event_id = new.id
     limit 1;

    if v_issue_id is not null then
      -- Count remaining unresolved events on the same issue
      select count(*) into v_unresolved
        from public.control_room_issue_events cie
        join public.audit_events ae on ae.id = cie.event_id
       where cie.issue_id = v_issue_id
         and ae.resolved = false;

      -- If all events resolved, mark the issue resolved too
      if v_unresolved = 0 then
        update public.control_room_issues
           set status      = 'resolved',
               resolved_at = now(),
               updated_at  = now()
         where id = v_issue_id
           and status not in ('resolved', 'ignored');
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_resolve_issue on public.audit_events;
create trigger trg_auto_resolve_issue
  after update of resolved on public.audit_events
  for each row
  execute function public.auto_resolve_issue_on_event_resolve();

-- ── Seed fingerprint registry ─────────────────────────────────────────────────
-- Known event_types that will start arriving once PR 3 adds the shared logger.
-- Upsert so re-running the migration is safe.

insert into public.control_room_fingerprints
  (fingerprint, source, category, default_severity, title_template, summary_template, suggested_fix, affected_surface)
values
  ('runtime:voice_bip_request_failed:VoiceBip',
   'runtime', 'voice', 'error',
   'Voice Bip request failed',
   'Voice Bip is returning errors from the AI/Worker pipeline.',
   'Check Cloudflare Worker logs for the bip-voice route. Verify OpenAI API key and timeout setting.',
   'VoiceBip'),

  ('runtime:worker_request_failed:*',
   'runtime', 'runtime', 'error',
   'Cloudflare Worker request failed',
   'One or more Worker routes are returning failures.',
   'Open Cloudflare dashboard → Workers → Logs. Check for 5xx responses and timeout spikes.',
   null),

  ('runtime:supabase_write_failed:*',
   'runtime', 'runtime', 'error',
   'Supabase write failure',
   'A database write is failing. May be an RLS policy rejection or connectivity issue.',
   'Check Supabase logs. Verify the row''s user_id matches auth.uid() and that the RLS policy allows this operation.',
   null),

  ('runtime:circle_post_failed:Circle',
   'runtime', 'runtime', 'error',
   'Circle post creation failed',
   'Teen tried to create a Circle post but the operation failed.',
   'Check the circle_posts RLS policy and the Worker route. Look for network timeout patterns.',
   'Circle'),

  ('runtime:parent_share_failed:Bridge',
   'runtime', 'runtime', 'error',
   'Parent Bridge share failed',
   'A teen-to-parent share delivery is failing.',
   'Check parent_links table for missing or expired link tokens. Verify bridge_shares RLS.',
   'Bridge'),

  ('runtime:memory_write_blocked:*',
   'runtime', 'memory', 'warning',
   'Memory write blocked',
   'A companion memory write was blocked, likely by a privacy gate.',
   'Verify the memory write policy. Ensure no sensitive content (transcripts, raw audio) is in the payload.',
   null),

  ('runtime:missing_asset:*',
   'runtime', 'structure', 'warning',
   'Missing app asset',
   'A required asset (image, audio, font) could not be loaded.',
   'Run the asset audit script. Verify all referenced assets exist in the assets/ directory.',
   null),

  ('runtime:reward_redemption_failed:Store',
   'runtime', 'rewards', 'error',
   'Reward redemption failed',
   'A reward redemption attempt returned an error.',
   'Check point_transactions for the user. Verify Shopify webhook is responding.',
   'Store'),

  ('runtime:navigation_failed:*',
   'runtime', 'structure', 'warning',
   'Route navigation failed',
   'A route push or replace call threw an error or landed on a missing screen.',
   'Check expo-router logs. Verify the target route exists in app/ directory.',
   null),

  ('runtime:openai_request_failed:*',
   'runtime', 'companion', 'error',
   'OpenAI request failed',
   'An AI companion request to OpenAI returned an error or timed out.',
   'Check OpenAI status page. Verify API key is set in Worker secrets. Check rate limits.',
   null)
on conflict (fingerprint) do update
  set title_template   = excluded.title_template,
      summary_template = excluded.summary_template,
      suggested_fix    = excluded.suggested_fix,
      updated_at       = now();
