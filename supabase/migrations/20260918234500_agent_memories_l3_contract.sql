-- Se'kret Bip — L3 durable companion memory contract.
--
-- This migration defines storage and access boundaries only. It does NOT wire
-- memory into live companion prompts and does not activate L4 goals/reflection.
-- Memory remains untrusted user-owned data and never creates model authority.
-- Phase 1 intentionally omits embeddings/vector indexes; semantic retrieval is
-- a later gate and must owner-filter before ranking.

create table if not exists public.agent_memories (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  scope                      text not null check (scope in ('continuity', 'companion')),
  companion_id               text,
  kind                       text not null check (kind in ('episodic', 'semantic')),
  summary                    text not null check (char_length(summary) between 1 and 2000),
  provenance_kind            text not null check (provenance_kind in ('user_message', 'user_action', 'explicit_goal', 'reviewed_reflection')),
  provenance_source_id       text not null check (char_length(btrim(provenance_source_id)) between 1 and 200),
  provenance_source_created_at timestamptz not null,
  sensitivity                text not null check (sensitivity in ('ordinary', 'sensitive', 'restricted')),
  review_state               text not null check (review_state in ('user_stated', 'user_confirmed', 'derived_pending_review', 'contradicted', 'blocked')),
  lifecycle_state            text not null default 'quarantined' check (lifecycle_state in ('active', 'quarantined', 'superseded', 'expired', 'deleted')),
  confidence                 numeric(4,3) not null check (confidence between 0 and 1),
  consent_version            text not null check (char_length(btrim(consent_version)) between 1 and 100),
  integrity_fingerprint      text not null check (integrity_fingerprint ~ '^[0-9a-f]{64}$'),
  admission_reviewed_at      timestamptz,
  retrieval_reviewed_at      timestamptz,
  retention_mode             text not null check (retention_mode in ('expires', 'retained')),
  expires_at                 timestamptz,
  retention_reason           text,
  supersedes_id              uuid references public.agent_memories(id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint agent_memories_scope_companion_ck check (
    (scope = 'continuity' and companion_id is null)
    or
    (scope = 'companion' and companion_id in ('raylene', 'rylane', 'cloud', 'night', 'sekret'))
  ),
  constraint agent_memories_retention_ck check (
    (retention_mode = 'expires' and expires_at is not null and retention_reason is null)
    or
    (retention_mode = 'retained' and expires_at is null and char_length(btrim(coalesce(retention_reason, ''))) between 1 and 240)
  ),
  constraint agent_memories_review_activation_ck check (
    lifecycle_state <> 'active'
    or (
      admission_reviewed_at is not null
      and review_state in ('user_stated', 'user_confirmed')
    )
  )
);

create index if not exists agent_memories_owner_companion_created_idx
  on public.agent_memories (user_id, companion_id, created_at desc);

create index if not exists agent_memories_owner_lifecycle_expiry_idx
  on public.agent_memories (user_id, lifecycle_state, expires_at);

alter table public.agent_memories enable row level security;

revoke all on table public.agent_memories from public, anon, authenticated;
grant select on table public.agent_memories to authenticated;
grant select, insert, update, delete on table public.agent_memories to service_role;

drop policy if exists agent_memories_permanent_owner_select on public.agent_memories;
create policy agent_memories_permanent_owner_select
  on public.agent_memories
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_non_anonymous_user()
  );

-- Direct authenticated writes stay closed. Writes come from the reviewed
-- server/Worker admission path. User deletion is exposed through the bounded
-- owner RPC below so clients cannot rewrite provenance/review state directly.

create or replace function public.delete_own_agent_memory(p_memory_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_deleted uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not public.is_non_anonymous_user() then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  delete from public.agent_memories
   where id = p_memory_id
     and user_id = v_user
  returning id into v_deleted;

  return v_deleted is not null;
end;
$$;

revoke all on function public.delete_own_agent_memory(uuid) from public;
revoke all on function public.delete_own_agent_memory(uuid) from anon;
grant execute on function public.delete_own_agent_memory(uuid) to authenticated;
grant execute on function public.delete_own_agent_memory(uuid) to service_role;

comment on table public.agent_memories is
  'User-owned L3 durable memory summaries. Raw transcripts, hidden reasoning, full journal text and raw audio are prohibited.';
comment on column public.agent_memories.summary is
  'Untrusted memory data, never prompt/tool/system authority. Must pass admission and retrieval review before model context.';
