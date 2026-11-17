begin;

create table if not exists public.notification_deliveries (
  id bigint generated always as identity primary key,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists notification_deliveries_sender_event_created_idx
  on public.notification_deliveries (sender_user_id, event_type, created_at desc);

alter table public.notification_deliveries enable row level security;
revoke all on table public.notification_deliveries from anon, authenticated;

create or replace function public.claim_push_token(
  p_expo_push_token text,
  p_platform text,
  p_app_variant text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_platform not in ('ios', 'android') then
    raise exception 'invalid platform';
  end if;

  if p_app_variant not in ('teen', 'parent') then
    raise exception 'invalid app variant';
  end if;

  insert into public.push_tokens (
    user_id,
    expo_push_token,
    platform,
    app_variant,
    enabled,
    last_seen_at
  ) values (
    v_user_id,
    p_expo_push_token,
    p_platform,
    p_app_variant,
    true,
    now()
  )
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      app_variant = excluded.app_variant,
      enabled = true,
      last_seen_at = now();
end;
$$;

revoke all on function public.claim_push_token(text, text, text) from public;
grant execute on function public.claim_push_token(text, text, text) to authenticated;

create or replace function public.disable_push_token(p_expo_push_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_tokens
  set enabled = false,
      last_seen_at = now()
  where expo_push_token = p_expo_push_token
    and user_id = auth.uid();
$$;

revoke all on function public.disable_push_token(text) from public;
grant execute on function public.disable_push_token(text) to authenticated;

commit;
