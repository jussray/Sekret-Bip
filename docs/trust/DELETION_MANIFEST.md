# Account Deletion Manifest

> **Trust-06** companion artifact to `docs/trust/DATA_INVENTORY.md` and
> `docs/compliance/account-deletion-runbook.md`. That runbook covers
> deployment/ops/incident history; this document is the table-by-table proof
> of what gets deleted, in what order, by what mechanism — the deliverable
> #417 asks for.
>
> Audited against `main`@`d089694` (2026-11-16) by static source and
> migration review only. **No live Supabase access in this audit** — nothing
> below is proven against the production database. See "What this does not
> prove" at the end.

## Deletion sequence (`supabase/functions/account-delete/index.ts`)

The processor is not user-callable; it runs after a 7-day grace period via
`scripts/sweep-account-deletions.mjs` / `.github/workflows/account-deletion-sweep.yml`,
authenticated with `x-account-deletion-secret`, using the service-role key.

1. **Claim** the `account_deletion_requests` row (`pending` → `processing`), idempotent via conditional update.
2. **Storage**: enumerate every non-public bucket, recursively list and delete every object under `<userId>/`.
3. **Reference cleanup**: null out `control_room_issue_history.changed_by` / `control_room_issues.resolved_by` (admin-attribution columns with no FK, so they don't block deletion; missing-table errors tolerated since Control Room tables aren't present in every environment).
4. **`crew_members`**: explicit `delete … where member_user_id = userId`. Required because this FK is `ON DELETE SET NULL`, not `CASCADE` — the row would otherwise survive with a nulled member slot but a retained display/accepted state.
5. **`parent_links`** *(added by this change, see below)*: explicit revoke of any links where the deleted account is the **parent**. Required for the same reason as (4) — `parent_user_id` is `ON DELETE SET NULL`.
6. **Receipt**: upsert `account_deletion_receipts` (keyed by request id, storing only a SHA-256 hash of the user id — never the raw id) to `processing`.
7. **Auth user deletion**: `admin.auth.admin.deleteUser(userId)`. Everything below this line that has a `CASCADE` FK to `auth.users(id)` is removed by Postgres itself at this point.
8. **Receipt completion**: mark the receipt `completed`. Any exception from steps 2–7 marks the receipt `failed` (if prepared) and the request `failed`, leaving it retryable — the account is never left half-deleted and silently reported as success.

## Table-by-table FK audit

Verified by reading each table's `CREATE TABLE` in `supabase/migrations/` (not the live database — see caveat below). "Cascade" = Postgres deletes the row automatically when `auth.users` deletes the account; "Explicit" = the processor must do it itself because the FK doesn't cascade.

| Table | Mechanism | Source |
|---|---|---|
| `journal_entries` | Cascade (`user_id … ON DELETE CASCADE`) | `0001_init.sql` |
| `mood_history` | Cascade | `0001_init.sql` |
| `voice_notes` (row) | Cascade | `0001_init.sql` — **storage object** for the same note is deleted separately by step 2, not by this FK |
| `room_memory` | Cascade | `0001_init.sql` |
| `agent_memories` (the current table behind "companion memory" in #417's original text) | Cascade | `20260918234500_agent_memories_l3_contract.sql` |
| `circle_posts`, `parent_circle_posts` | Cascade | `0001_init.sql` |
| `push_tokens` | Cascade | `20260704023000_create_push_tokens.sql` |
| `bip_tasks`, `task_submissions` | Cascade (both `teen_id`/`created_by` and `task_id→bip_tasks` transitively) | `20260627193000_phase_2_tasks_approvals_rewards.sql` |
| `bridge_share_requests` (teen + parent), `bridge_share_sources`, `bridge_summaries`, `bridge_summary_views`, `bridge_delivery_preferences` | Cascade (direct on `auth.users`, or transitively via `request_id`/`summary_id`) | `20260705010000_bridge_summary_contract.sql` |
| `account_verification` | Cascade | `20260630000131_create_account_verification.sql` |
| `account_deletion_requests` (the request driving this very deletion) | Cascade | `20260628190000_account_deletion_requests.sql` — the row survives until the auth user delete fires, which is after the receipt is marked complete; this is correct, not a bug |
| `account_deletion_receipts` | **Not linked to `auth.users`** (by design) | `20260715060000_harden_consent_and_deletion_runtime_truth.sql` — stores `user_id_hash` (SHA-256), not the raw id, so it survives as a compliance receipt without retaining an identifiable record |
| `crew_members` | Explicit (`ON DELETE SET NULL`) | handled since before this audit (step 4) |
| `parent_links` | Explicit (`ON DELETE SET NULL`) | **gap found and fixed in this audit** (step 5) — see below |

## Gap found and fixed: `parent_links` zombie-active rows

`parent_links.parent_user_id` is `REFERENCES auth.users(id) ON DELETE SET NULL`
(confirmed in both `0003_oracle_parentlinks_period_safety.sql` and
`20260618_bridge_oracle_tables.sql`, and unchanged by any later migration —
checked by grepping every `ALTER TABLE … parent_links` statement across the
migration history). `teen_user_id` on the same table correctly cascades.

**Before this fix:** if a parent deleted their account, their `parent_links`
row was never touched by the processor. Postgres would null out
`parent_user_id`, but `status` and `is_active` were left exactly as they
were — so a teen whose parent deleted their account would keep seeing
`status: 'active', is_active: true` with no parent attached: a stale, inaccurate link
state, not a raw-data leak (no PII remains on the nulled row), but wrong
and user-visible.

**Fix:** `supabase/functions/account-delete/index.ts` now has
`revokeParentLinksForDeletedParent()`, called in step 5 above, before the
auth user is deleted. It sets `status='revoked', is_active=false,
invite_code=null, expires_at=null, updated_at=now()` on the affected
`parent_links` rows and `parent_link_state='revoked'` on the teen's
`account_verification` row — the exact same terminal state the live
`revoke_parent_link(uuid)` RPC already uses
(`20261108014000_require_teen_parent_link_confirmation.sql`), so this isn't
a new status vocabulary, just applying the existing one from the deletion
path that was missing it.

Regression coverage: `test/account-deletion-parent-link-revocation.test.mjs`
(4 tests, source-contract style, consistent with the existing
`test/account-deletion-compliance-contract.test.mjs` convention for this
Deno function).

## What this does not prove

This audit is **static source/migration review only**. It does not, and
cannot without live access, prove:

- that the migrations above actually ran, in this form, against the live
  production database (the runbook's 2026-10-24/2026-10-27 entries record a
  real, separate, still-open production incident where the scheduled sweep
  could not even read the request queue — `PGRST205`/406 schema-exposure
  mismatch — which is a production configuration problem, not a code gap,
  and is explicitly founder-gated to fix);
- that `account_deletion_requests.scheduled_for`'s 7-day grace period and
  the `grace_period_active` / `request_already_claimed` guards behave
  correctly under concurrent/retried invocation against the real database;
- the acceptance criteria that need a real deleted user's JWT: "deleted
  user JWT produces 403/401 on every private API path," "voice note Storage
  object inaccessible via a signed URL after deletion," "founder-role
  session cannot read a deleted teen's journal via Supabase Studio."

Those require a controlled test account, a real Supabase project, and
production/staging access this session does not have. They remain the
open part of #417's acceptance criteria.
