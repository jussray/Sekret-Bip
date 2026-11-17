# Onboarding Migration Reconciliation

**Status:** evidence and planning only  
**Founder Control Room authority:** issue #502  
**Production project inspected read-only:** `tbsevonvegdnlyjgplmm`  
**Production migration observed:** `20260718040638_onboarding_state`  
**Production row state at observation:** zero `user_onboarding_state` rows; zero `moods` rows

## Non-claims

This document and its companion artifacts do not:

- change ordered migrations;
- repair Supabase migration history;
- apply DDL;
- modify policies, grants, triggers, functions, enum values, or rows;
- authorize a development branch, production migration, deployment, or merge;
- establish the repository schema as live truth;
- establish the live schema as the desired product contract.

All SQL under `docs/migration-history/onboarding/` is inert historical evidence. It must never be executed by the migration runner from that location.

## Observed split-brain

### Live production baseline

Supabase migration history contains:

- version `20260718040638`;
- name `onboarding_state`.

The exact statement is preserved at:

- `docs/migration-history/onboarding/20260718040638_onboarding_state.live.sql`.

Live stage enum values:

- `signup`;
- `welcome_seen`;
- `consent_complete`;
- `age_confirmed`;
- `identity_set`;
- `name_set`;
- `reflection_complete`;
- `parent_link_skipped`;
- `parent_link_complete`;
- `parent_setup_complete`;
- `activated`;
- `offboarded`.

Live table characteristics:

- `user_id` is the primary key;
- no separate `id` column;
- no `age_bucket`, referral, device, parent-link, or `completed_at` fields;
- timing columns use the live migration names;
- RLS is enabled;
- policy `users_own_onboarding` applies `FOR ALL` to `public` with only `auth.uid() = user_id`;
- `anon` and `authenticated` have broad table privileges, including delete/truncate-level grants;
- only `uos_updated_at` / `uos_set_updated_at` is attached;
- no onboarding mood-activation trigger or stage transition guard exists;
- the helper has mutable search-path and broad execute privileges.

Supabase security advisor independently reports anonymous-access and mutable-search-path warnings for this contract.

### Repository variants

The repository contains ordered files:

- `supabase/migrations/20260718000000_onboarding_state.sql`;
- `supabase/migrations/20260718000001_onboarding_mood_log_trigger.sql`.

Those versions are not recorded in live migration history. Exact copies are preserved at:

- `docs/migration-history/onboarding/20260718000000_onboarding_state.repository.sql`;
- `docs/migration-history/onboarding/20260718000001_onboarding_mood_log_trigger.repository.sql`.

The repository version expects enum values and columns that do not exist live, including `signed_up`, `age_verified`, `role_selected`, `parent_link_sent`, `parent_linked`, `steady_state`, `id`, age/device/referral metadata, parent-link metadata, and additional timing/completion fields.

## Dependency observation

Read-only catalog inspection found:

- no dependent views;
- no dependent application functions;
- no second table using `public.onboarding_stage`;
- one stage index;
- one updated-at trigger;
- zero onboarding rows;
- zero mood rows.

This reduces conversion complexity at the observation time. It does not guarantee that row count or dependencies remain zero later. Every future execution must re-run the parity probe and fail closed if assumptions changed.

## Why the ordered files cannot simply coexist

Adding `20260718040638_onboarding_state.sql` to `supabase/migrations/` while leaving `20260718000000_onboarding_state.sql` executable would make a fresh replay attempt to create the same enum/table twice.

Applying the repository files directly to production would also fail because production already has incompatible objects and history.

Therefore the next implementation must deliberately reconcile both **history** and **schema**, not merely copy a file or run `db push`.

## Required reconciliation design

A later, separately reviewed implementation should use this sequence:

1. re-run the read-only parity probe on the approved target;
2. stop if onboarding rows, mood rows, enum dependencies, views, functions, policies, or triggers differ from the reviewed evidence;
3. prove a clean fresh-database replay path;
4. preserve the two repository variants as inert historical evidence;
5. represent the exact live baseline in local history without executing it twice;
6. define a forward-only schema conversion from the live baseline to one canonical runtime contract;
7. use explicit legacy enum mapping only where semantics are equivalent;
8. fail or require manual review for legacy values without safe equivalence, especially `offboarded`;
9. install permanent-account owner RLS, least-privilege grants, pinned trigger search paths, and denial probes;
10. add the mood activation trigger only after the canonical schema and activation semantics are proven;
11. record migration-history repair separately from schema application;
12. preserve rollback and exact evidence for fresh, development-branch, and production paths.

## Enum mapping boundary

Potentially equivalent legacy labels may be proposed for review:

| Live label | Candidate canonical label | Status |
|---|---|---|
| `signup` | `signed_up` | candidate |
| `welcome_seen` | `signed_up` or a separate event | unresolved |
| `age_confirmed` | `age_verified` | candidate |
| `parent_link_complete` | `parent_linked` | candidate |
| `offboarded` | none | must fail/manual review |

No mapping is authorized by this document.

## History repair boundary

The production project already records version `20260718040638`. The repository contains two earlier, unrecorded versions. A future plan may need no-op history markers or an approved migration-repair operation so fresh and remote histories converge.

History repair is a privileged action. It must be:

- performed only on an approved target;
- preceded by exact statement/hash comparison;
- recorded in Founder Control Room;
- separated from schema mutation where possible;
- reversible in evidence even when migration history itself is append-only;
- explicitly founder-approved.

## Verification matrix

| Witness | Required proof |
|---|---|
| Repository | archived variants match source; ordered files unchanged; tests pass |
| Fresh database | one clean replay produces the canonical final schema |
| Supabase development branch | catalog, enum, columns, grants, policies, triggers, row preservation, denial probes, advisors |
| Production preflight | exact live migration history, zero/known rows, dependency parity, backup/rollback readiness |
| Production application | approved forward migrations only; no copied `db push` shortcut |
| Client runtime | exact enum/column contract, permanent-account behavior, stage ordering, account switching, offline/retry |
| Founder Control Room | ship/hold/rollback decision with exact heads and environment witnesses |

## Current decision

Hold #504, #505, and #506 as design/evidence branches. Do not merge or apply them as live reconciliation.

The next mutation-capable PR must be based on this evidence pack, current `main`, and a Supabase development-branch proof. Production remains untouched until the founder approves each separate gate.
