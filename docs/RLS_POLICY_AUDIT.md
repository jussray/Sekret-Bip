# RLS Policy Audit — journal_entries, crew_members, parent_circle_posts, planned voice_* tables

> **`db/schema.sql` has been retired.** `supabase/migrations/` is now the single
> source of truth for schema — see finding 2. This doc is kept as the audit
> trail for the drift that motivated that decision; the "two source files"
> framing below describes the state *before* the fix.

Originally filled in the two audit templates provided against the schema files
that existed in this repo at the time: `db/schema.sql` (pasted manually into
the Supabase SQL editor per `docs/SUPABASE.md`) and `supabase/migrations/*.sql`
(applied via `supabase db push`). Those were two separate bootstrap paths for
the same logical schema, so this audit checked them for drift, not just RLS
coverage — and found real drift (findings 1 and 2 below), which is why
`db/schema.sql` was retired rather than kept in sync by hand indefinitely.

## Source files checked (historical — at time of audit)

| source_file | role |
|---|---|
| `db/schema.sql` | **Retired.** Was the manual bootstrap path — pasted into Supabase SQL editor (`docs/SUPABASE.md` step 2). |
| `supabase/migrations/0001_init.sql` | CLI bootstrap — "mirror of db/schema.sql" per its own header comment (now the *only* bootstrap path) |
| `supabase/migrations/0004_supplemental_tables.sql` | CLI follow-up — explicitly patches drift between the two above |
| `supabase/migrations/*.sql` (rest) | CLI follow-ups, additive only |
| `src/utils/supabase.ts` | Only app code that reads/writes `crew_members` |
| `scripts/control-room-rls-scan.mjs` | Existing automated scanner — regex-based, checks `supabase/migrations/` only |

## Current verified exception — notification_deliveries

`notification_deliveries` is intentionally service-role-only, not a user-facing table missing an access policy. The defining migration, `20260704030000_harden_push_notifications.sql`, enables RLS and revokes every table privilege from `anon` and `authenticated`. A live production check on 2026-07-12 confirmed RLS is enabled, no policies exist, neither public client role has a table grant, and only `service_role` has table privileges. The repository scanner may report the no-policy shape as a warning, but this specific table is not release-blocking unless those grants, its server-only ownership, or its write path change.

## Policy map

`exists_in_schema_sql` reflects `db/schema.sql` as it stood *before retirement* —
kept for the audit trail. `exists_in_0001_init` is what actually governs a
database today.

| table_name | exists_in_schema_sql (historical) | exists_in_0001_init | rls_enabled | select_policy | insert_policy | update_policy | delete_policy | notes |
|---|---|---|---|---|---|---|---|---|
| `journal_entries` | yes | yes | yes | owner + linked-parent (`shared_with_parent`, via `20260628_consent_visibility.sql`) | owner | owner | owner | **PK mismatch fixed.** `0001_init.sql` uses `primary key (user_id, id)`. `supabase/migrations/20260702070000_reconcile_journal_crew_primary_keys.sql` widens any already-live database still on the old single-column `id` PK — safe, since a set unique under `(id)` is trivially unique under `(user_id, id)`. |
| `crew_members` | yes | yes | yes | owner | owner | owner | owner | **Fixed** in `supabase/migrations/20260702060000_crew_members_bip_id.sql` (columns) and `20260702070000_reconcile_journal_crew_primary_keys.sql` (PK shape — same fix and same reasoning as `journal_entries`). |
| `parent_circle_posts` | yes | yes | yes | owner-only in `db/schema.sql` (historical); owner-insert/update/delete + **any-authenticated-read** in migrations (`0004_supplemental_tables.sql`, since parents need to read the shared feed) | owner | owner | owner | **Drift already caught and fixed once:** `db/schema.sql`'s `reactions` default (`beenThere/solidarity/reminder/needed/strength`) diverged from `0001_init.sql`'s default (`felt/comfort/proud/stay`, copy-pasted from `circle_posts`). `0004_supplemental_tables.sql` explicitly patched the migrations-path default to match. Confirms the dual-bootstrap-file setup produced real bugs, not just theoretical ones — motivated finding 2's fix. **PK mismatch also fixed.** |
| `mood_history` / `circle_posts` / `voice_notes` / `comfort_sessions` | yes | yes | yes | owner | owner | owner | owner | **PK mismatch fixed**, see finding 2. `circle_posts.anonymous_name`/`avatar_key`/`identity_context` existed only in the now-retired `db/schema.sql` and were confirmed unused by any app code before deletion — see finding 2. |
| `voice_sessions` | no | no | n/a | n/a | n/a | n/a | n/a | Not yet defined anywhere — see `docs/AGENT_L4_ARCHITECTURE.md` and the reviewed voice-WS draft. If built, needs RLS scoped to `auth.uid() = user_id` in a `supabase/migrations/` file. |
| `voice_turns` | no | no | n/a | n/a | n/a | n/a | n/a | Same as above — planned only. |
| `voice_events` | no | no | n/a | n/a | n/a | n/a | n/a | Same as above — planned only. |
| `voice_latency_metrics` | no | no | n/a | n/a | n/a | n/a | n/a | Same as above — planned only. |

## Findings, ranked

1. **`crew_members.bip_id` / `connection_status` were missing from the migrations
   path — fixed.** `db/schema.sql` (line ~160) added them with
   `alter table ... add column if not exists ... connection_status text not null
   default 'pending' check (...)`, but no file under `supabase/migrations/` did
   the same, even though `src/utils/supabase.ts` depends on `connection_status`.
   Added `supabase/migrations/20260702060000_crew_members_bip_id.sql`, mirroring
   `db/schema.sql`'s block exactly. Verified with
   `node scripts/control-room-rls-scan.mjs` (0 findings, unaffected since this
   was a column-drift issue, not an RLS-coverage issue).

2. **Two schema-defining files existed with no single source of truth — resolved.**
   `docs/SUPABASE.md` used to tell operators to paste `db/schema.sql` directly.
   Separately, `supabase/migrations/0001_init.sql` called itself "a mirror of
   db/schema.sql" but had already diverged on `parent_circle_posts` defaults
   (caught, fixed in `0004_supplemental_tables.sql`), `crew_members` columns
   (finding 1), and primary-key shape on all seven client-id tables —
   `journal_entries`, `crew_members`, `mood_history`, `circle_posts`,
   `parent_circle_posts`, `voice_notes`, `comfort_sessions`.

   Rather than keep reconciling drift by hand on every schema change,
   `db/schema.sql` was **retired**. `supabase/migrations/` is now the single
   source of truth. Before deleting it, checked whether anything in
   `db/schema.sql` had no equivalent in the migrations path — it did:
   `accounts`, `parent_teen_invites`, `parent_teen_links`, and
   `teen_guardian_shares` tables, plus `circle_posts.anonymous_name` /
   `avatar_key` / `identity_context` columns. Grepped the app (`src/`, `app/`,
   `screens/`) for any read/write of those tables/columns — **none exists.**
   The app's real parent-link flow runs on `parent_links` +
   `account_verification` (both already in `supabase/migrations/`, actively
   used by `src/utils/parentLink.ts`, `src/context/VerificationContext.tsx`).
   So the dead tables/columns in `db/schema.sql` were confirmed-safe to drop,
   not schema that needed porting forward first.

   Follow-up: updated `docs/SUPABASE.md` to instruct `supabase db push`
   instead of pasting `db/schema.sql`; updated
   `scripts/test-device-sync.mjs`'s schema-invariant test (was reading
   `db/schema.sql`, ran in CI via `.github/workflows/regression-tests.yml` →
   `npm run test:device-sync`) to check the same kind of invariants against
   `supabase/migrations/` instead.

3. **`scripts/control-room-rls-scan.mjs` only scans `supabase/migrations/`.**
   It would not have caught finding 1, because the columns it's missing are
   RLS-irrelevant column drift, not a missing `enable row level security` — the
   table itself does have RLS enabled and a policy in both files, so the scanner
   correctly reports no RLS issue on `crew_members`. This audit is a column-level
   / cross-file check the existing scanner doesn't attempt; not a scanner bug.

4. **Planned `voice_*` tables have no schema yet.** Not a defect — just confirms
   the tables reviewed alongside the voice-WS draft (see chat review) don't
   exist in this repo. If Phase 1 of `docs/AGENT_L4_ARCHITECTURE.md` or the
   voice session flow is approved, they need RLS added in a
   `supabase/migrations/` file — there is only one schema file to keep in sync
   with now (finding 2).
