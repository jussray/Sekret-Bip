begin;

-- Personal reminders need an explicit privacy scope. Existing task rows remain
-- linked-parent visible for backward compatibility; only rows intentionally
-- created as private_self are hidden from linked parents.
alter table public.bip_tasks
  add column if not exists visibility text not null default 'linked_parent';

update public.bip_tasks
set visibility = 'linked_parent'
where visibility is null;

alter table public.bip_tasks
  alter column visibility set default 'linked_parent',
  alter column visibility set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bip_tasks_visibility_check'
      and conrelid = 'public.bip_tasks'::regclass
  ) then
    alter table public.bip_tasks
      add constraint bip_tasks_visibility_check
      check (visibility in ('linked_parent', 'private_self'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bip_tasks_private_self_owner_check'
      and conrelid = 'public.bip_tasks'::regclass
  ) then
    alter table public.bip_tasks
      add constraint bip_tasks_private_self_owner_check
      check (
        visibility <> 'private_self'
        or (
          created_by_role = 'teen'
          and teen_id = created_by
          and point_value = 0
          and requires_approval = false
        )
      );
  end if;
end
$$;

-- Remove every historical parent policy name before installing the canonical
-- visibility-aware policies. PostgreSQL permissive SELECT policies are ORed,
-- so leaving a legacy broad policy in place would defeat the privacy boundary.
drop policy if exists bip_tasks_parent_select on public.bip_tasks;
drop policy if exists bip_tasks_linked_parent_select on public.bip_tasks;
create policy bip_tasks_linked_parent_select
on public.bip_tasks
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and visibility = 'linked_parent'
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists bip_tasks_parent_insert on public.bip_tasks;
drop policy if exists bip_tasks_linked_parent_insert on public.bip_tasks;
create policy bip_tasks_linked_parent_insert
on public.bip_tasks
for insert
to authenticated
with check (
  public.is_non_anonymous_user()
  and visibility = 'linked_parent'
  and (select auth.uid()) = created_by
  and created_by_role = 'parent'
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists bip_tasks_parent_update on public.bip_tasks;
drop policy if exists bip_tasks_linked_parent_update on public.bip_tasks;
create policy bip_tasks_linked_parent_update
on public.bip_tasks
for update
to authenticated
using (
  public.is_non_anonymous_user()
  and visibility = 'linked_parent'
  and (select auth.uid()) = created_by
  and created_by_role = 'parent'
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
)
with check (
  public.is_non_anonymous_user()
  and visibility = 'linked_parent'
  and (select auth.uid()) = created_by
  and created_by_role = 'parent'
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

comment on column public.bip_tasks.visibility is
  'Task disclosure scope. linked_parent preserves accountability visibility; private_self is visible only through the teen owner policy.';

commit;
