-- Publicly non-sensitive runtime contract markers used by release health checks.
create table if not exists public.runtime_contract_versions (
  contract_key text primary key,
  version text not null,
  applied_at timestamptz not null default now()
);

alter table public.runtime_contract_versions enable row level security;
revoke all on table public.runtime_contract_versions from anon;
revoke all on table public.runtime_contract_versions from authenticated;

insert into public.runtime_contract_versions (contract_key, version, applied_at)
values ('consent_deletion_runtime_truth', '20260715060000', now())
on conflict (contract_key) do update
set version = excluded.version,
    applied_at = excluded.applied_at;

comment on table public.runtime_contract_versions is
  'Service-role-only deployment markers consumed by the runtime-contract-health Edge Function.';
