# `safety_alerts` schema mismatch — scoping notes

Not a fix, not a migration — this is investigation output for §10.3 of `docs/circle-v2-migration-plan.md`, written up so the actual fix is a scoped, deliberate change rather than a reflexive patch. Nothing in this doc has been applied.

## What's actually broken, confirmed

Three independent pieces of code disagree with the live `safety_alerts` table and with each other:

1. **`supabase/functions/safety-scan/index.ts`** (the writer) inserts `{ user_id, alert_type, source_table, source_id, severity, scan_metadata }`.
2. **`src/features/safety/safetyCoordinator.ts`** (a reader, `checkForFlaggedItems()`) selects `id, severity, parent_notified_at` filtered by `.eq('user_id', user.id)`.
3. **Live `safety_alerts`**, confirmed via direct query and cross-checked against `supabase/reference/sekret_bip_full_bootstrap.sql:450-463` (see below — the bootstrap file matches live exactly):

```sql
create table public.safety_alerts (
  id uuid primary key default gen_random_uuid(),
  teen_user_id uuid not null references auth.users(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  source_mood_id uuid references public.moods(id) on delete set null,
  source_post_id uuid references public.posts(id) on delete set null,
  alert_type text not null check (alert_type in ('critical_mood','self_harm_keyword','panic_pattern','manual_sos','moderation','keyword')), -- widened §10.2
  severity text not null check (severity in ('low','medium','high','critical')), -- widened §10.2
  title text not null,
  summary text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Neither `user_id`, `source_table`, `source_id`, nor `parent_notified_at` exist. RLS policies (`supabase/migrations/20260629032000_complete_parent_bridge_safety_storage_rls.sql:61-79`) are already written against `teen_user_id`/`parent_user_id`, confirming this *is* the real, intended, hardened shape — not an accident. The Edge Function and the client were simply never updated to match it.

## The important discovery: `supabase/reference/sekret_bip_full_bootstrap.sql` is a real, comprehensive reference

1082 lines, covers circles/posts/comments/reactions/moods/parent-bridge/safety/media/storage in one coherent "fresh install" script. Spot-checked against live: `circle_kind` enum, `crews`, `friendships`, `posts` columns, `safety_alerts` columns, and even a `trg_posts_circle_rules` trigger (confirmed live and attached, enforcing "users can only post to their own public/friends circle" and "only crew members can post to crew circles" at the DB level, independent of RLS) all match exactly. This file appears to be the actual source used to originally provision `tbsevonvegdnlyjgplmm`, sitting unused in `supabase/reference/` rather than being the basis for `supabase/migrations/`. This is very likely the fastest path to closing Phase 0 item 1 (repo-vs-live reconciliation) for the rest of the schema, not just `safety_alerts` — worth treating as a separate, high-value follow-up: diff this file against live table-by-table and use it (not the fragmented `migrations/` history) as the reconciliation source of truth.

(One confirmed-compatible detail: `enforce_circle_post_rules()`, the function behind `trg_posts_circle_rules`, has no branch for `kind='parent_community'` — it falls through to an unrestricted `return new` for any kind it doesn't explicitly handle. This isn't a gap in practice, since the RLS policy added in this PR already restricts `parent_community` writes to verified guardians — just noting it for anyone reading this trigger later and wondering why `parent_community` isn't mentioned.)

## Real, non-obvious design constraint: `parent_user_id` is `NOT NULL`

Every `safety_alerts` row **requires** a specific linked parent at insert time — there's no way to represent "teen was flagged but has no linked parent yet." The current Edge Function creates the alert unconditionally and only *separately* checks `parent_links` afterward, for notification purposes (`notifyParentIfLinked`) — that two-step shape can't produce a valid row under the real schema. Open question, not something to guess at: **what should happen when a teen with no active parent link gets flagged?** Options, not decided:
- Skip alert creation entirely for unlinked teens (loses the record, but matches what the NOT NULL constraint implies was intended).
- Relax the constraint to nullable (a real schema change, changes the guarantee every consumer of this table can currently rely on).
- Something else — e.g. a separate table/path for unlinked-teen alerts.

This is a genuine safety-product decision (what protection exists for a flagged teen with no linked guardian), not an engineering detail — flagging rather than picking.

## `source_mood_id` / `source_post_id` only reference the V2 model

Both FKs point at `moods(id)` and `posts(id)` specifically — not `journal_entries`, `circle_posts`, `mood_history`, or any V1 table. Both are nullable, so V1-sourced alerts (from `journal_entries`/`circle_posts`/`public_circle_posts`, still actively scanned) can just leave both null — no schema conflict there, just no specific traceable source for those, only `alert_type`/`severity`. For `posts` (V2, what this PR added), `source_post_id` should be populated with the actual post id.

## `title`/`summary` are `NOT NULL` — need real copy, not content

Consistent with the existing "never store raw flagged content" principle (`20260619_safety_scan.sql` explicitly dropped `content_preview` for this reason) — these should be generic, severity-derived strings (e.g. `title: 'Wellness Check'`, `summary: 'We noticed something that might need extra support.'`), not excerpts of what was actually written. Needs actual copy decided, not just a schema mapping.

## Client-side: `parent_notified_at` has no live equivalent

`safetyCoordinator.ts`'s `checkForFlaggedItems()` uses `row.parent_notified_at` to set `SafetyExperience.parentNotified`, shown to the teen ("your parent has been quietly notified"). There's no equivalent live column — `is_read` is the closest thing but means something different (has the *recipient* — teen or parent — viewed the alert, not "was the parent notified"). Given `parent_user_id` is `NOT NULL`, one could argue "a row exists" already implies a parent is linked and will eventually see it — but that's not the same guarantee as "a notification was actually sent." Needs a decision: repurpose `is_read`, add a real notification-sent signal, or drop this UI claim until there's a column for it (better to under-promise than tell a teen their parent was notified when a push was never sent).

## Suggested shape of the actual fix (not applied, for discussion)

- Edge Function: resolve `parent_user_id` via `parent_links` *before* insert (reuse `notifyParentIfLinked`'s query, moved earlier); if no active link, follow whatever the constraint decision above lands on. Populate `source_post_id` when `source_table='posts'`, leave both source columns null otherwise. Generate `title`/`summary` from a small severity → copy map, no content included.
- Client: `safetyCoordinator.ts` — `teen_user_id` instead of `user_id`; decide and implement the `parent_notified_at` replacement.
- Both changes are safety-relevant and user-facing (a teen's crisis experience) — recommend testing against a real linked teen+parent pair before shipping, not just schema-level checks.
