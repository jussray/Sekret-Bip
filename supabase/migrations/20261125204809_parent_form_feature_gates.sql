-- Source of truth: Main Se'kret Bip Supabase migrations.
-- Parent form rollout booleans are public metadata, not an authorization boundary.
-- The existing account-verification, parent-link, consent and RLS checks remain mandatory.
begin;

create table if not exists public.parent_form_feature_gates (
  name text primary key check (name in ('parent_registration', 'parent_private_forms')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.parent_form_feature_gates enable row level security;

-- No client writes, including authenticated guardians; only privileged operators
-- using a trusted server-side database connection may change rollout state.
revoke all privileges on table public.parent_form_feature_gates from public, anon, authenticated;
grant select on table public.parent_form_feature_gates to anon, authenticated;
grant all privileges on table public.parent_form_feature_gates to service_role;

drop policy if exists parent_form_gate_public_read on public.parent_form_feature_gates;
create policy parent_form_gate_public_read
  on public.parent_form_feature_gates
  for select to anon, authenticated
  using (true);

insert into public.parent_form_feature_gates (name, enabled)
values
  ('parent_registration', false),
  ('parent_private_forms', false)
on conflict (name) do nothing;

comment on table public.parent_form_feature_gates is
  'Public rollout booleans only. Not an authorization boundary. Guardian verification, active parent links and item-specific teen consent are enforced separately. Changes require trusted admin authority and independent release proof.';

commit;
