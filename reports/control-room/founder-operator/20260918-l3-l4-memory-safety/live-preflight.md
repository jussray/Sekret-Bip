# L3/L4 live preflight receipt

Observed against canonical Supabase project `tbsevonvegdnlyjgplmm` on 2026-09-19 UTC.

## Verified live

- `is_non_anonymous_user()` returned false under a synthetic authenticated-anonymous JWT claim.
- `is_founder()` returned false under that same claim.
- `can_manage_guardian_reviews()` returned false under that same claim.
- Under `SET LOCAL ROLE authenticated` plus the same synthetic anonymous claim, visible row counts were zero for `public.room_memory`, `public.comfort_sessions`, and `public.control_room_issues`.
- `account-delete` is currently ACTIVE with `verify_jwt=false`; a live POST from inside the Supabase project with its dedicated custom-auth credential intentionally absent returned HTTP `401`.
- `safety-scan` is currently ACTIVE with `verify_jwt=false`; a live POST from inside the Supabase project with its dedicated custom-auth credential intentionally absent returned HTTP `401`.
- Canonical production still has no `public.agent_memories` table after PR #1100 merged.
- Canonical production migration ledger currently contains 185 versions and ends at `20260917195220`.
- The current Supabase Security Advisor still reports leaked-password protection disabled.

## Post-merge authority correction

PR #1100 merged to `main@05b9fadfa11d0f6e09286f3a927c5f63a1e6131c`. The GitHub Supabase check surface identified project `jvmbhralyktmdlvglrxk` and failed with `Remote migration versions not found in local migrations directory`.

Canonical Se'kret Bip production remains `tbsevonvegdnlyjgplmm`. The repository's protected production migration path is manual/exact-current-main and must confirm the canonical project before mutation. Therefore:

- the failing GitHub Supabase app check is a real integration/binding failure,
- it cannot authorize or disprove canonical production state by itself,
- its migration history must not be copied into the canonical repo merely to make the check green,
- the already-merged canonical L3 migration is immutable repository history and must not be rewritten to compensate for the external integration.

The non-authoritative file under `supabase/candidates/` is only a pointer documenting this correction and contains no schema SQL.

## Advisor reconciliation receipts

### SECURITY DEFINER inventory

- Supabase currently reports 29 `SECURITY DEFINER` functions executable by `authenticated`.
- Definition-level inventory found 27/29 directly reference `auth.uid()`, 6/29 directly reference `is_non_anonymous_user()`, 2/29 use `is_founder()`, and 2/29 use `can_manage_guardian_reviews()`.
- The two functions without a direct `auth.uid()` reference are `list_guardian_verification_queue()` and `upsert_control_room_issue(...)`; transaction-only live probes under an authenticated-anonymous claim confirmed both calls are denied.
- This closes the immediate anonymous-authority concern for those two functions. It does not convert the entire 29-function advisor inventory into a blanket green; future grant changes still require function-specific semantic review.

### RLS enabled with no policy

The five current INFO findings are intentionally server-only at the table-grant layer. Live privilege readback confirmed `anon=false`, `authenticated=false`, and `service_role=true` for SELECT on `account_deletion_receipts`, `app_config`, `app_private_config`, `guardian_verification_reviews`, and `runtime_contract_versions`.

Do not add client RLS policies merely to silence this advisor finding.

### Anonymous-policy warnings

Supabase reports anonymous-access-policy warnings across multiple tables because anonymous Auth sessions use the `authenticated` role. Existing permanent-account guards already close some of these paths. The advisor warning alone is not proof of exploitable anonymous access and must not trigger a blanket revoke that breaks legitimate permanent-account behavior.

## Not upgraded to verified

- No L3 schema migration has been applied to canonical production.
- No L3 memory is consumed by the companion runtime.
- No L4 goals/reflection runtime exists.
- Leaked-password protection is not enabled.
- Exact-production `app.sekretbip.net` authority is not established by this receipt.
- The GitHub Supabase app surface is not stable/current proof of canonical project authority.

## Truth rule

This receipt can close only the checks it directly observes. It cannot turn `productionClaim`, merge authority, deploy authority, or L3/L4 runtime status green. Advisor warnings stay distinct from verified exploitability, and a green candidate CI run cannot substitute for production activation evidence.
