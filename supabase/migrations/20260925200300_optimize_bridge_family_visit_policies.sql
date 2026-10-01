begin;

-- Family Visit RLS/performance hardening before production rollout.
-- Keep the same visibility rules while evaluating auth context once per query,
-- add covering indexes for auth.users foreign keys used by audit/actor fields,
-- and keep generated summaries unreadable until the session is atomically ready.

create index if not exists bridge_professional_profiles_reviewed_by_idx
  on public.bridge_professional_profiles (reviewed_by);
create index if not exists bridge_case_assignments_created_by_idx
  on public.bridge_case_assignments (created_by);
create index if not exists bridge_family_visit_sessions_created_by_idx
  on public.bridge_family_visit_sessions (created_by);
create index if not exists bridge_family_visit_markers_actor_idx
  on public.bridge_family_visit_markers (actor_user_id);
create index if not exists bridge_family_visit_reflections_actor_idx
  on public.bridge_family_visit_reflections (actor_user_id);

drop policy if exists bridge_professional_profiles_owner_select on public.bridge_professional_profiles;
create policy bridge_professional_profiles_owner_select
on public.bridge_professional_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists bridge_case_assignments_participant_select on public.bridge_case_assignments;
create policy bridge_case_assignments_participant_select
on public.bridge_case_assignments for select to authenticated
using (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  and (
    teen_user_id = (select auth.uid())
    or (
      status = 'active'
      and (expires_at is null or expires_at > now())
      and exists (
        select 1 from public.bridge_professional_profiles pp
        where pp.user_id = bridge_case_assignments.professional_user_id
          and pp.verification_status = 'verified'
      )
      and (
        parent_user_id = (select auth.uid())
        or professional_user_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists bridge_family_visit_sessions_participant_select on public.bridge_family_visit_sessions;
create policy bridge_family_visit_sessions_participant_select
on public.bridge_family_visit_sessions for select to authenticated
using (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.bridge_case_assignments a
    where a.id = bridge_family_visit_sessions.assignment_id
      and (
        a.teen_user_id = (select auth.uid())
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = a.professional_user_id
              and pp.verification_status = 'verified'
          )
          and (
            a.parent_user_id = (select auth.uid())
            or a.professional_user_id = (select auth.uid())
          )
        )
      )
  )
);

drop policy if exists bridge_family_visit_markers_owner_select on public.bridge_family_visit_markers;
create policy bridge_family_visit_markers_owner_select
on public.bridge_family_visit_markers for select to authenticated
using (
  actor_user_id = (select auth.uid())
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.bridge_family_visit_sessions s
    join public.bridge_case_assignments a on a.id = s.assignment_id
    where s.id = bridge_family_visit_markers.session_id
      and (
        a.teen_user_id = (select auth.uid())
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = a.professional_user_id
              and pp.verification_status = 'verified'
          )
          and (select auth.uid()) in (a.parent_user_id, a.professional_user_id)
        )
      )
  )
);

drop policy if exists bridge_family_visit_reflections_owner_select on public.bridge_family_visit_reflections;
create policy bridge_family_visit_reflections_owner_select
on public.bridge_family_visit_reflections for select to authenticated
using (
  actor_user_id = (select auth.uid())
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.bridge_family_visit_sessions s
    join public.bridge_case_assignments a on a.id = s.assignment_id
    where s.id = bridge_family_visit_reflections.session_id
      and (
        a.teen_user_id = (select auth.uid())
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = a.professional_user_id
              and pp.verification_status = 'verified'
          )
          and (select auth.uid()) in (a.parent_user_id, a.professional_user_id)
        )
      )
  )
);

drop policy if exists bridge_family_visit_summaries_audience_select on public.bridge_family_visit_summaries;
create policy bridge_family_visit_summaries_audience_select
on public.bridge_family_visit_summaries for select to authenticated
using (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.bridge_family_visit_sessions s
    join public.bridge_case_assignments a on a.id = s.assignment_id
    where s.id = bridge_family_visit_summaries.session_id
      and s.state = 'ready'
      and (
        a.teen_user_id = (select auth.uid())
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = a.professional_user_id
              and pp.verification_status = 'verified'
          )
          and (
            (bridge_family_visit_summaries.audience = 'parent' and a.parent_user_id = (select auth.uid()))
            or
            (bridge_family_visit_summaries.audience = 'professional' and a.professional_user_id = (select auth.uid()))
          )
        )
      )
  )
);

commit;
