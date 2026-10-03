-- Se'kret Bip direct Supabase Edge Function abuse boundary.
--
-- Cloudflare Worker rate limiting does not protect callers that invoke
-- /functions/v1/* directly. Keep the quota source of truth in Postgres so it
-- remains coherent across Supabase Edge isolates.

create table if not exists private.edge_function_rate_limit_buckets (
  function_name text not null,
  actor_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (function_name, actor_key)
);

alter table private.edge_function_rate_limit_buckets enable row level security;
revoke all on table private.edge_function_rate_limit_buckets from public, anon, authenticated;

comment on table private.edge_function_rate_limit_buckets is
  'Server-owned short-window counters for direct Supabase Edge Function abuse protection. Stores no child content.';

create or replace function private.consume_edge_rate_limit_bucket(
  p_function_name text,
  p_actor_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_started_at timestamptz;
  v_count integer;
  v_retry integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'invalid_rate_limit_policy';
  end if;

  -- Serialize one function+actor bucket across concurrent Edge isolates.
  perform pg_advisory_xact_lock(
    hashtextextended(p_function_name || ':' || p_actor_key, 0)
  );

  select window_started_at, request_count
    into v_started_at, v_count
    from private.edge_function_rate_limit_buckets
   where function_name = p_function_name
     and actor_key = p_actor_key;

  if not found or v_started_at + make_interval(secs => p_window_seconds) <= v_now then
    insert into private.edge_function_rate_limit_buckets (
      function_name,
      actor_key,
      window_started_at,
      request_count,
      updated_at
    ) values (
      p_function_name,
      p_actor_key,
      v_now,
      1,
      v_now
    )
    on conflict (function_name, actor_key) do update
      set window_started_at = excluded.window_started_at,
          request_count = 1,
          updated_at = excluded.updated_at;

    return jsonb_build_object(
      'allowed', true,
      'retry_after_seconds', 0,
      'limit', p_limit,
      'window_seconds', p_window_seconds
    );
  end if;

  if v_count >= p_limit then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (
        (v_started_at + make_interval(secs => p_window_seconds)) - v_now
      )))::integer
    );

    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry,
      'limit', p_limit,
      'window_seconds', p_window_seconds
    );
  end if;

  update private.edge_function_rate_limit_buckets
     set request_count = request_count + 1,
         updated_at = v_now
   where function_name = p_function_name
     and actor_key = p_actor_key;

  return jsonb_build_object(
    'allowed', true,
    'retry_after_seconds', 0,
    'limit', p_limit,
    'window_seconds', p_window_seconds
  );
end;
$$;

revoke all on function private.consume_edge_rate_limit_bucket(text, text, integer, integer) from public;

-- Authenticated user functions. Policy values are server-owned and selected by
-- function name; the caller cannot supply its own actor identity or quota.
create or replace function public.consume_edge_function_rate_limit(p_function text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer := 60;
begin
  if v_user_id is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise insufficient_privilege using message = 'authenticated_non_anonymous_user_required';
  end if;

  case p_function
    when 'parent-link-create' then v_limit := 5;
    when 'parent-link-revoke' then v_limit := 20;
    when 'account-deletion-request' then v_limit := 5;
    when 'account-request-cancel' then v_limit := 5;
    when 'delete-account' then v_limit := 5;
    when 'send-push' then v_limit := 12;
    else
      raise exception 'unsupported_edge_function_rate_limit_policy:%', p_function;
  end case;

  return private.consume_edge_rate_limit_bucket(
    p_function,
    'user:' || v_user_id::text,
    v_limit,
    v_window_seconds
  );
end;
$$;

revoke all on function public.consume_edge_function_rate_limit(text) from public, anon;
grant execute on function public.consume_edge_function_rate_limit(text) to authenticated;

-- Custom-secret / server-only functions. The actor key is deliberately fixed
-- inside the function so even a caller holding the server credential cannot
-- rotate arbitrary identities to evade the quota.
create or replace function public.consume_server_edge_function_rate_limit(p_function text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_limit integer;
  v_window_seconds integer := 60;
begin
  case p_function
    when 'account-delete' then v_limit := 30;
    when 'safety-scan' then v_limit := 120;
    when 'runtime-contract-health' then v_limit := 60;
    else
      raise exception 'unsupported_server_edge_function_rate_limit_policy:%', p_function;
  end case;

  return private.consume_edge_rate_limit_bucket(
    p_function,
    'server:' || p_function,
    v_limit,
    v_window_seconds
  );
end;
$$;

revoke all on function public.consume_server_edge_function_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_server_edge_function_rate_limit(text) to service_role;

comment on function public.consume_edge_function_rate_limit(text) is
  'Consumes a fixed per-authenticated-user Edge Function quota. Caller cannot select identity or quota.';
comment on function public.consume_server_edge_function_rate_limit(text) is
  'Consumes a fixed global quota for a trusted server-only Edge Function. service_role only.';
