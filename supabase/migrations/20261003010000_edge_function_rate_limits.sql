-- Portfolio security baseline for directly reachable Supabase Edge Functions.
-- One bounded row per function scope + hashed caller identity. Raw IPs, JWTs,
-- API keys, and custom-auth secrets are never persisted.

create schema if not exists private;

create table if not exists private.edge_function_rate_limit_buckets (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash),
  constraint edge_function_rate_limit_scope_length check (char_length(scope) between 1 and 80),
  constraint edge_function_rate_limit_key_hash check (key_hash ~ '^[0-9a-f]{64}$')
);

alter table private.edge_function_rate_limit_buckets enable row level security;
revoke all on table private.edge_function_rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table private.edge_function_rate_limit_buckets to service_role;

create or replace function public.consume_edge_function_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer default 120,
  p_window_seconds integer default 60
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_count integer;
  v_window_started_at timestamptz;
  v_now timestamptz := clock_timestamp();
  v_window interval;
begin
  if p_scope is null or char_length(p_scope) < 1 or char_length(p_scope) > 80 then
    raise exception 'invalid_rate_limit_scope';
  end if;
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_limit_key';
  end if;
  if p_limit < 1 or p_limit > 10000 then
    raise exception 'invalid_rate_limit_limit';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'invalid_rate_limit_window';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  insert into private.edge_function_rate_limit_buckets as bucket (
    scope,
    key_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_scope,
    p_key_hash,
    v_now,
    1,
    v_now
  )
  on conflict (scope, key_hash) do update set
    request_count = case
      when bucket.window_started_at + v_window <= v_now then 1
      else bucket.request_count + 1
    end,
    window_started_at = case
      when bucket.window_started_at + v_window <= v_now then v_now
      else bucket.window_started_at
    end,
    updated_at = v_now
  returning request_count, window_started_at
  into v_count, v_window_started_at;

  allowed := v_count <= p_limit;
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from ((v_window_started_at + v_window) - v_now)))::integer
  );
  return next;
end;
$$;

revoke all on function public.consume_edge_function_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_edge_function_rate_limit(text, text, integer, integer)
  to service_role;

comment on table private.edge_function_rate_limit_buckets is
  'Hashed, bounded Edge Function abuse-control buckets; contains no raw caller identifiers.';
comment on function public.consume_edge_function_rate_limit(text, text, integer, integer) is
  'Atomically consumes one per-scope Edge Function rate-limit unit. Intended for privileged server-side callers only.';
