# Supabase Authorization Evidence

**Verified:** 2026-07-13  
**Project:** Se'kret Bip (`tbsevonvegdnlyjgplmm`)  
**Latest live migration:** `20260713024253 remove_anon_audit_control_room_grants`

## Decision

Authorization work now has four durable evidence layers:

1. a rollback-contained two-user and anonymous private-data probe;
2. live server-config grant hardening;
3. JWT-protected retirement of obsolete release and probe Edge Functions;
4. a rollback-contained founder, guardian-review, audit, and Control Room authorization probe.

The machine-readable evidence is `security/supabase-authorization-baseline.json`. The reusable probes are:

- `supabase/probes/authorization_phase0.sql`
- `supabase/probes/authorization_founder_guardian_phase1.sql`

## Phase 0 live proof

The Phase 0 probe created two synthetic users and private rows inside one transaction, switched between `authenticated` and `anon`, recorded four results, and rolled everything back.

| Check | Result |
|---|---|
| authenticated user reads own journal, mood, room-memory, and voice rows | passed |
| user A cannot read user B's private rows | passed |
| user A cannot update user B's journal | passed |
| anon cannot read the synthetic private rows | passed |

Cleanup verification found zero synthetic users, journals, moods, and voice notes.

This proves the sampled owner-only boundary. It does not certify every table named by the advisor. Bridge, parent-link, Circle, reward, safety, storage, and other authenticated RPC boundaries still require focused probes before policy behavior changes.

## Phase 1: config-table grant hardening

Migration `20260713011803_harden_config_table_grants.sql` was applied and verified live.

| Table | RLS | Policies | Client grants | Service-role grants | Rows before | Rows after |
|---|---:|---:|---:|---:|---:|---:|
| `app_config` | enabled | 0 | 0 | 7 | 2 | 2 |
| `app_private_config` | enabled | 0 | 0 | 7 | 2 | 2 |

The migration revoked client and public table privileges, preserved service-role access, added no policies, and modified no rows. Repository migration history matches the exact live version.

## Phase 1: founder and guardian administration hardening

A live rollback probe first demonstrated the defect: an anonymous-authenticated JWT using the existing privileged profile was rejected by guardian administration but accepted by `is_founder()`, and could call the elevated Control Room issue-upsert RPC.

The reviewed hardening was merged in PR #369 and applied as three live migrations:

| Version | Migration | Result |
|---|---|---|
| `20260713024231` | `harden_founder_helper_anonymous_guard` | `is_founder()` now rejects anonymous-authenticated sessions and has explicit execution grants |
| `20260713024245` | `harden_audit_control_room_policies` | audit and Control Room policies require authenticated callers; audit policies explicitly reject anonymous sessions |
| `20260713024253` | `remove_anon_audit_control_room_grants` | anon table privileges removed from audit and Control Room tables |

The exact merged probe then passed **23 of 23 checks** and ended in `ROLLBACK`.

Verified outcomes:

- normal authenticated users cannot access founder or guardian-administration paths;
- normal users cannot read audit or Control Room records or call the elevated issue-upsert RPC;
- non-anonymous founder access remains functional;
- founder callers can reach guardian target validation and list the queue;
- anonymous-authenticated sessions are rejected by both founder and guardian helpers;
- anonymous-authenticated sessions cannot read audit or Control Room records;
- anonymous-authenticated sessions cannot insert audit events or call the elevated issue-upsert RPC;
- `anon` has no table privileges on `audit_events` or the five tested Control Room tables;
- no synthetic rows, user identifiers, email addresses, private content, or secrets were retained or returned.

Repository migration filenames now match the exact three live versions, preventing a future migration replay from rerunning the combined pre-deployment file.

## RLS-enabled tables with no policies

The four advisor findings share a clear server-only grant shape:

| Table | Client grants | Service role | Classification |
|---|---:|---:|---|
| `app_config` | none | allowed | service-role-only after Phase 1 hardening |
| `app_private_config` | none | allowed | service-role-only after Phase 1 hardening |
| `guardian_verification_reviews` | none | allowed | service-role-only |
| `notification_deliveries` | none | allowed | service-role-only |

No client policy should be added merely to silence the advisor. A future user-facing use case must introduce its own reviewed API or policy, tests, and rollback.

## Anonymous-capable policy warning

Supabase warns when policies apply to roles that can include anonymous sessions. That warning is not proof that anonymous users can read every affected table. A policy may still require an owner UUID or reject anonymous claims.

The correct response remains behavioral proof by trust boundary, not a mass role replacement.

## SECURITY DEFINER inventory

Thirty-five public `SECURITY DEFINER` functions were reviewed for execution grants, explicit search paths, and owner/founder/guardian authorization checks.

- no reviewed function is executable by `anon`;
- every reviewed function has explicit search-path configuration;
- twenty-four are executable by `authenticated` and use an owner, founder, or guardian boundary;
- eleven are service-role-only, trigger-only, or internal maintenance functions;
- founder and guardian administrative boundaries now explicitly reject anonymous-authenticated sessions.

This is not a blanket certification. Each remaining authenticated RPC still needs positive intended access and negative anonymous, cross-user, and unauthorized-role tests before grants or bodies change.

## Edge Function retirement evidence

Only two live functions keep platform JWT verification disabled, both with intentional server-to-server authentication:

| Function | Boundary | Classification |
|---|---|---|
| `account-delete` | dedicated deletion header | intentional server operation |
| `safety-scan` | dedicated database-trigger header | intentional trigger operation |

Three obsolete functions were source-controlled as side-effect-free HTTP 410 retirements and redeployed with `verify_jwt: true`:

| Function | Live version | JWT | Source hash | Replacement |
|---|---:|---|---|---|
| `release-health` | 2 | required | `318a684a...e3157a` | Cloudflare-native verifier and exact-release evidence |
| `bridge-e2e-probe` | 3 | required | `0a1af7dc...45f7e7` | issue #270 controlled proof and Playwright |
| `github-workflow-status` | 4 | required | `5acdefc5...51c108` | GitHub Actions and Cloudflare-native evidence |

Supabase deployment registry and deployed-source retrieval verified each version, JWT setting, source, and hash. Direct HTTP probing was not performed because the execution environment could not resolve the project hostname and no safe authenticated test identity was available. That limitation is recorded rather than converted into imaginary evidence.

## Remaining Phase 1 work

1. Add focused behavior tests for parent-link, Bridge, push-token, task/reward-review, and remaining Control Room ingestion RPCs.
2. Add focused negative tests for the two intentional custom-auth Edge Functions.
3. Plan and test password-breach protection before changing Auth configuration.
4. Begin L4 schema design only after its specific ownership, deletion, provenance, and denial suite is approved.

## Rollback

Both probes end in `ROLLBACK`. Applied authorization changes may only be reversed through reviewed forward-fix migrations. Do not restore broad client grants, PUBLIC policies, anonymous founder eligibility, or stale release oracles as generic access fixes.
