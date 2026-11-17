-- ─────────────────────────────────────────────────────────────────────────────
-- 20260710235500_report_own_audit_event_issue.sql
-- Founder Control Room hardening: close the non-founder RPC escalation path
-- and add a narrow, capped self-report primitive.
--
-- Background:
--   upsert_control_room_issue() (added in 20260701_control_room_normalization.sql,
--   later hardened directly against the live DB — that hardening was never
--   captured in a migration file) allowed ANY caller who owned the referenced
--   audit_events row to fully control severity/category/title/summary/metadata
--   on a real control_room_issues row. Because audit_events INSERT has no
--   validation on severity/event_type/message, and issueNormalizer.ts's
--   ingestAuditEvent() calls this RPC automatically from the client on every
--   captureRuntimeError() (used app-wide, for any signed-in account), any user
--   could forge a fake critical-severity issue with an attacker-chosen title.
--
-- This migration:
--   1. Tightens upsert_control_room_issue() to require service_role or
--      is_founder() unconditionally — drops the "caller owns the event" bypass.
--      Grants are unchanged (still granted to `authenticated`): Supabase
--      collapses every signed-in account into the single Postgres role
--      `authenticated`, so the founder's own client-side normalizeRecentEvents()
--      calls also run as `authenticated` and must keep working. The real
--      authorization boundary is the is_founder()/service_role check inside
--      the function body, not the Postgres GRANT.
--   2. Adds a `trust_level` column (unverified / system / confirmed) to
--      control_room_issues so the UI can distinguish user-submitted reports
--      from founder/system-normalized issues.
--   3. Adds a new report_own_audit_event_issue(event_id, note) RPC: a narrow,
--      server-derived, rate-limited replacement for the removed bypass branch.
--      Non-founders can flag their own eligible events; they can never set
--      severity above 'warning', never assign/resolve/escalate, and never see
--      more than a minimal success/report-reference response.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tighten upsert_control_room_issue() ───────────────────────────────────
-- Collapses the two-branch check into one: only service_role or is_founder()
-- may call this function at all, regardless of whether p_event_id is supplied
-- or who owns the referenced event.

create or replace function public.upsert_control_room_issue(
  p_fingerprint text,
  p_source text,
  p_category text,
  p_severity text,
  p_status text,
  p_title text,
  p_summary text,
  p_suggested_fix text,
  p_affected_surface text,
  p_affected_user_id uuid,
  p_event_id uuid,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_issue_id uuid;
  v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if not (v_role = 'service_role' or public.is_founder()) then
    raise exception 'not allowed to normalize this event' using errcode = '42501';
  end if;

  select id into v_issue_id
  from public.control_room_issues
  where fingerprint = p_fingerprint
    and status not in ('resolved','ignored')
  limit 1;

  if v_issue_id is null then
    insert into public.control_room_issues (
      fingerprint, source, category, severity, status, title, summary,
      suggested_fix, affected_surface, affected_users, occurrence_count,
      first_seen_at, last_seen_at, trust_level, metadata
    ) values (
      p_fingerprint, p_source, p_category, p_severity, p_status, p_title, p_summary,
      p_suggested_fix, p_affected_surface,
      case when p_affected_user_id is null then 0 else 1 end,
      1, now(), now(), 'system', coalesce(p_metadata, '{}'::jsonb)
    ) returning id into v_issue_id;
  else
    update public.control_room_issues
    set occurrence_count = occurrence_count + 1,
        last_seen_at = now(),
        severity = case
          when severity = 'critical' or p_severity = 'critical' then 'critical'
          when severity = 'error' or p_severity = 'error' then 'error'
          when severity = 'warning' or p_severity = 'warning' then 'warning'
          else 'info'
        end,
        updated_at = now()
    where id = v_issue_id;
  end if;

  if p_event_id is not null then
    insert into public.control_room_issue_events (issue_id, event_id)
    values (v_issue_id, p_event_id)
    on conflict do nothing;
  end if;

  return v_issue_id;
end;
$function$;

-- Grants unchanged (kept for the founder's own client-side normalizeRecentEvents()
-- calls, which run under the `authenticated` Postgres role). Reasserted here for
-- clarity/auditability now that this is captured in a tracked migration.
revoke all on function public.upsert_control_room_issue(
  text, text, text, text, text, text, text, text, text, uuid, uuid, jsonb
) from public;
grant execute on function public.upsert_control_room_issue(
  text, text, text, text, text, text, text, text, text, uuid, uuid, jsonb
) to authenticated, service_role;

-- ── 2. trust_level classification on control_room_issues ────────────────────
-- Existing rows all came from the (now-founder/service-only) normalization
-- pipeline or founder-side tooling, so they backfill as 'system'.

alter table public.control_room_issues
  add column if not exists trust_level text not null default 'system';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'control_room_issues_trust_level_check'
  ) then
    alter table public.control_room_issues
      add constraint control_room_issues_trust_level_check
      check (trust_level in ('unverified', 'system', 'confirmed'));
  end if;
end $$;

create index if not exists control_room_issues_trust_level_idx
  on public.control_room_issues (trust_level);

-- Helpful for the new RPC's ownership check + rate-limit join; audit_events
-- had no index on user_id before this.
create index if not exists audit_events_user_id_idx
  on public.audit_events (user_id);

-- ── 3. report_own_audit_event_issue() ────────────────────────────────────────
-- Narrow, server-derived self-report primitive. Callers supply only the
-- audit event id (+ optional short note) — everything else is derived
-- server-side. Never assigns, never resolves, never selects critical, never
-- triggers agents/deploys/founder actions, never returns issue content
-- beyond a minimal success/report-reference response.

create or replace function public.report_own_audit_event_issue(
  p_event_id uuid,
  p_note text default null
)
returns table (reported boolean, report_ref uuid, message text)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_auth_user     uuid := auth.uid();
  v_event         record;
  v_note          text;
  v_category      text;
  v_fingerprint   text;
  v_issue_id      uuid;
  v_recent_count  integer;
  v_already_counted boolean;
begin
  if v_auth_user is null then
    return query select false, null::uuid, 'authentication required';
    return;
  end if;

  -- Ownership check: only the event's own owner may report it. Same generic
  -- response whether the event doesn't exist or belongs to someone else.
  select id, user_id, event_type, screen, severity
    into v_event
    from public.audit_events
   where id = p_event_id
     and user_id = v_auth_user;

  if v_event.id is null then
    return query select false, null::uuid, 'event not found';
    return;
  end if;

  -- Eligibility gate: only events already flagged warning/error/critical by
  -- the app itself are reportable. There is no maintained event_type
  -- allowlist to draw from (most event types are built dynamically), so this
  -- uses the event's own severity as the more defensible axis.
  if v_event.severity not in ('warning', 'error', 'critical') then
    return query select false, null::uuid, 'this event is not eligible for reporting';
    return;
  end if;

  -- Idempotency: this exact event was already linked to a report.
  select cie.issue_id into v_issue_id
    from public.control_room_issue_events cie
   where cie.event_id = p_event_id
   limit 1;

  if v_issue_id is not null then
    return query select true, v_issue_id, 'already reported';
    return;
  end if;

  -- Per-user rolling 24h rate limit.
  select count(*) into v_recent_count
    from public.control_room_issue_events cie
    join public.audit_events ae on ae.id = cie.event_id
   where ae.user_id = v_auth_user
     and cie.linked_at > now() - interval '24 hours';

  if v_recent_count >= 15 then
    return query select false, null::uuid, 'daily report limit reached, try again tomorrow';
    return;
  end if;

  v_note := left(coalesce(btrim(p_note), ''), 240);
  if v_note = '' then
    v_note := null;
  end if;

  v_category := case
    when v_event.event_type ilike '%voice%' then 'voice'
    when v_event.event_type ilike '%memory%' then 'memory'
    when v_event.event_type ilike '%companion%' or v_event.event_type ilike '%openai%' or v_event.event_type ilike '%ai_%' then 'companion'
    when v_event.event_type ilike '%reward%' or v_event.event_type ilike '%point%' or v_event.event_type ilike '%shopify%' then 'rewards'
    when v_event.event_type ilike '%safety%' or v_event.event_type ilike '%flagged%' then 'safety'
    when v_event.event_type ilike '%behavior%' or v_event.event_type ilike '%signal%' then 'behavior'
    when v_event.event_type ilike '%asset%' or v_event.event_type ilike '%route%' or v_event.event_type ilike '%navigation%' then 'structure'
    when v_event.event_type ilike '%worker%' or v_event.event_type ilike '%cloudflare%' or v_event.event_type ilike '%deploy%' then 'infra'
    when v_event.event_type ilike '%rls%' or v_event.event_type ilike '%policy%' or v_event.event_type ilike '%auth%' then 'rls'
    else 'runtime'
  end;

  v_fingerprint := 'user_report:' || lower(btrim(v_event.event_type)) || ':'
    || coalesce(nullif(btrim(v_event.screen), ''), 'unknown');

  -- Group repeated self-reports of the same kind of problem into one issue.
  -- Never escalates severity on repeat, never touches status beyond 'reported'.
  select id into v_issue_id
    from public.control_room_issues
   where fingerprint = v_fingerprint
     and status not in ('resolved', 'ignored')
   limit 1;

  if v_issue_id is null then
    insert into public.control_room_issues (
      fingerprint, source, category, severity, status,
      title, summary, suggested_fix, affected_surface,
      affected_users, occurrence_count,
      first_seen_at, last_seen_at, trust_level, metadata
    ) values (
      v_fingerprint, 'user_report', v_category, 'warning', 'reported',
      'User-reported: ' || v_event.event_type,
      'Reported by a user from their own app experience. Not independently verified.',
      null,
      v_event.screen,
      1, 1,
      now(), now(), 'unverified',
      jsonb_build_object('first_note', v_note)
    )
    returning id into v_issue_id;
  else
    select exists (
      select 1
        from public.control_room_issue_events cie2
        join public.audit_events ae2 on ae2.id = cie2.event_id
       where cie2.issue_id = v_issue_id
         and ae2.user_id = v_auth_user
    ) into v_already_counted;

    update public.control_room_issues
       set occurrence_count = occurrence_count + 1,
           last_seen_at = now(),
           affected_users = affected_users + case when v_already_counted then 0 else 1 end,
           updated_at = now()
     where id = v_issue_id;
  end if;

  insert into public.control_room_issue_events (issue_id, event_id)
  values (v_issue_id, p_event_id)
  on conflict (issue_id, event_id) do nothing;

  return query select true, v_issue_id, 'reported';
end;
$function$;

-- Supabase's schema-level default privileges auto-grant EXECUTE on new
-- functions to `anon` (a direct role grant, not a PUBLIC-pseudo-role grant,
-- so `revoke all ... from public` alone does not remove it). Revoke it
-- explicitly so unauthenticated callers cannot invoke this function at all.
revoke all on function public.report_own_audit_event_issue(uuid, text) from public;
revoke all on function public.report_own_audit_event_issue(uuid, text) from anon;
grant execute on function public.report_own_audit_event_issue(uuid, text) to authenticated, service_role;
