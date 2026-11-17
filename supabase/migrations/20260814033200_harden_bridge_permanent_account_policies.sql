begin;

-- Bridge permanent-account authorization hardening.
--
-- Phase-1 Bridge rows are private account data. Supabase anonymous Auth sessions
-- are members of `authenticated`, so auth.uid() ownership alone is not a
-- sufficient permanent-account boundary.
--
-- Preserve the intended product contract:
--   * permanent teen accounts can inspect their own requests, source refs,
--     summaries, and delivery preferences;
--   * permanent linked parents can inspect only currently authorized request
--     metadata, generated summaries, and their own view receipts;
--   * parents never receive bridge_share_sources rows or raw source content;
--   * request/source mutation remains RPC-only.

-- Direct request/source mutation must remain RPC-only. The canonical creation
-- RPC validates permanent-account status, active parent link, teen ownership of
-- every selected source, and idempotency intent before writing.
drop policy if exists bridge_share_requests_teen_insert on public.bridge_share_requests;
drop policy if exists bridge_share_requests_teen_update on public.bridge_share_requests;
drop policy if exists bridge_share_sources_teen_insert on public.bridge_share_sources;

-- Teen request history remains readable only by the permanent-account owner.
drop policy if exists bridge_share_requests_teen_select on public.bridge_share_requests;
create policy bridge_share_requests_teen_select
on public.bridge_share_requests for select to authenticated
using (
  public.is_non_anonymous_user()
  and teen_user_id = auth.uid()
);

-- Parent request metadata remains visible only while the exact active link and
-- share authorization are still valid.
drop policy if exists bridge_share_requests_parent_select on public.bridge_share_requests;
create policy bridge_share_requests_parent_select
on public.bridge_share_requests for select to authenticated
using (
  public.is_non_anonymous_user()
  and parent_user_id = auth.uid()
  and status in ('ready','viewed')
  and revoked_at is null
  and (expires_at is null or expires_at > now())
  and exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = bridge_share_requests.teen_user_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
      and pl.is_active = true
  )
);

-- Source references remain teen-only. Parent policies intentionally expose no
-- bridge_share_sources rows.
drop policy if exists bridge_share_sources_teen_select on public.bridge_share_sources;
create policy bridge_share_sources_teen_select
on public.bridge_share_sources for select to authenticated
using (
  public.is_non_anonymous_user()
  and exists (
    select 1 from public.bridge_share_requests r
    where r.id = bridge_share_sources.request_id
      and r.teen_user_id = auth.uid()
  )
);

-- Generated summaries remain visible to the permanent teen owner and to the
-- currently authorized permanent linked parent only.
drop policy if exists bridge_summaries_teen_select on public.bridge_summaries;
create policy bridge_summaries_teen_select
on public.bridge_summaries for select to authenticated
using (
  public.is_non_anonymous_user()
  and exists (
    select 1 from public.bridge_share_requests r
    where r.id = bridge_summaries.request_id
      and r.teen_user_id = auth.uid()
  )
);

drop policy if exists bridge_summaries_parent_select on public.bridge_summaries;
create policy bridge_summaries_parent_select
on public.bridge_summaries for select to authenticated
using (
  public.is_non_anonymous_user()
  and exists (
    select 1
    from public.bridge_share_requests r
    join public.parent_links pl
      on pl.teen_user_id = r.teen_user_id
     and pl.parent_user_id = r.parent_user_id
    where r.id = bridge_summaries.request_id
      and r.parent_user_id = auth.uid()
      and r.status in ('ready','viewed')
      and r.revoked_at is null
      and (r.expires_at is null or r.expires_at > now())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

-- A view receipt is relationship metadata. Do not leave historical receipt rows
-- readable after the parent loses access to the underlying summary.
drop policy if exists bridge_summary_views_parent_select on public.bridge_summary_views;
create policy bridge_summary_views_parent_select
on public.bridge_summary_views for select to authenticated
using (
  public.is_non_anonymous_user()
  and parent_user_id = auth.uid()
  and exists (
    select 1
    from public.bridge_summaries s
    join public.bridge_share_requests r on r.id = s.request_id
    join public.parent_links pl
      on pl.teen_user_id = r.teen_user_id
     and pl.parent_user_id = r.parent_user_id
    where s.id = bridge_summary_views.summary_id
      and r.parent_user_id = auth.uid()
      and r.status in ('ready','viewed')
      and r.revoked_at is null
      and (r.expires_at is null or r.expires_at > now())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists bridge_summary_views_parent_insert on public.bridge_summary_views;
create policy bridge_summary_views_parent_insert
on public.bridge_summary_views for insert to authenticated
with check (
  public.is_non_anonymous_user()
  and parent_user_id = auth.uid()
  and exists (
    select 1
    from public.bridge_summaries s
    join public.bridge_share_requests r on r.id = s.request_id
    join public.parent_links pl
      on pl.teen_user_id = r.teen_user_id
     and pl.parent_user_id = r.parent_user_id
    where s.id = bridge_summary_views.summary_id
      and r.parent_user_id = auth.uid()
      and r.status in ('ready','viewed')
      and r.revoked_at is null
      and (r.expires_at is null or r.expires_at > now())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

-- Delivery preferences remain teen-controlled but require a permanent account.
drop policy if exists bridge_delivery_preferences_owner_all on public.bridge_delivery_preferences;
create policy bridge_delivery_preferences_owner_all
on public.bridge_delivery_preferences for all to authenticated
using (
  public.is_non_anonymous_user()
  and teen_user_id = auth.uid()
)
with check (
  public.is_non_anonymous_user()
  and teen_user_id = auth.uid()
);

-- Revocation is the only client-authorized request mutation path. Match the
-- creation RPC's permanent-account requirement so an anonymous authenticated
-- session can never mutate Bridge consent state.
create or replace function public.revoke_bridge_share_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_teen_user_id uuid := auth.uid();
begin
  if v_teen_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  update public.bridge_share_requests
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now()
  where id = p_request_id
    and teen_user_id = v_teen_user_id
    and status not in ('revoked','deleted');

  return found;
end;
$$;

revoke all on function public.revoke_bridge_share_request(uuid) from public, anon;
grant execute on function public.revoke_bridge_share_request(uuid) to authenticated;

comment on function public.revoke_bridge_share_request(uuid) is
  'Revokes one Bridge share request owned by the authenticated permanent teen account. Anonymous Auth sessions cannot mutate Bridge consent state.';

commit;
