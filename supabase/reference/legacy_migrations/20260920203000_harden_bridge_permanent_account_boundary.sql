-- Restore the permanent-account boundary on the Teen/Parent Bridge and parent notes.
--
-- Production drift was observed on 2026-09-20: several policies had fallen back
-- to PUBLIC/auth.uid()-only predicates even though repository history and product
-- semantics require permanent authenticated accounts. Keep this migration narrow:
-- it changes policy role/predicates and the parent-note acknowledgement privilege
-- only; it does not modify user data.
--
-- The legacy S2Tell compatibility path still uses bridge_shares. Production
-- currently has its owner policies hardened, but the active migration chain must
-- reproduce that state from an empty database instead of depending on legacy-only
-- reference SQL or live-only drift.

alter policy bridge_shares_owner_select
on public.bridge_shares
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = user_id
);

alter policy bridge_shares_owner_insert
on public.bridge_shares
to authenticated
with check (
  public.is_non_anonymous_user()
  and auth.uid() = user_id
);

alter policy bridge_shares_owner_update
on public.bridge_shares
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = user_id
)
with check (
  public.is_non_anonymous_user()
  and auth.uid() = user_id
);

alter policy bridge_shares_owner_delete
on public.bridge_shares
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = user_id
);

alter policy "bridge_signals: teen read"
on public.bridge_signals
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = teen_user_id
);

alter policy "bridge_signals: teen insert"
on public.bridge_signals
to authenticated
with check (
  public.is_non_anonymous_user()
  and auth.uid() = teen_user_id
);

alter policy "bridge_signals: teen update"
on public.bridge_signals
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = teen_user_id
)
with check (
  public.is_non_anonymous_user()
  and auth.uid() = teen_user_id
);

alter policy "bridge_signals: linked parent read"
on public.bridge_signals
to authenticated
using (
  public.is_non_anonymous_user()
  and revoked_at is null
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bridge_signals.teen_user_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
      and pl.is_active = true
  )
);

alter policy "parent_notes: parent insert"
on public.parent_notes
to authenticated
with check (
  public.is_non_anonymous_user()
  and auth.uid() = parent_user_id
  and exists (
    select 1
    from public.parent_links pl
    where pl.parent_user_id = auth.uid()
      and pl.teen_user_id = parent_notes.teen_user_id
      and pl.status = 'active'
      and pl.is_active = true
  )
);

alter policy "parent_notes: parent read"
on public.parent_notes
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = parent_user_id
);

alter policy "parent_notes: teen read"
on public.parent_notes
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = teen_user_id
);

alter policy "parent_notes: teen mark seen"
on public.parent_notes
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = teen_user_id
)
with check (
  public.is_non_anonymous_user()
  and auth.uid() = teen_user_id
);

-- RLS constrains which rows a Teen can update, not which columns. Production
-- preflight proved the previous table-level UPDATE grant let a Teen rewrite the
-- parent-authored note body. Keep the only supported Teen mutation column-bound:
-- acknowledgement may change seen_by_teen, but content, sender, recipient and
-- timestamp remain immutable through the client role.
revoke update on table public.parent_notes from anon, authenticated;
grant update (seen_by_teen) on table public.parent_notes to authenticated;
