# L3/L4 live preflight receipt

Observed against Supabase project `tbsevonvegdnlyjgplmm` on 2026-09-19 UTC.

## Verified live

- `is_non_anonymous_user()` returned false under a synthetic authenticated-anonymous JWT claim.
- `is_founder()` returned false under that same claim.
- `can_manage_guardian_reviews()` returned false under that same claim.
- Under `SET LOCAL ROLE authenticated` plus the same synthetic anonymous claim, visible row counts were zero for:
  - `public.room_memory`
  - `public.comfort_sessions`
  - `public.control_room_issues`
- `account-delete` is currently ACTIVE with `verify_jwt=false`; a live POST from inside the Supabase project with its dedicated custom-auth credential intentionally absent returned HTTP `401`.
- `safety-scan` is currently ACTIVE with `verify_jwt=false`; a live POST from inside the Supabase project with its dedicated custom-auth credential intentionally absent returned HTTP `401`.
- Production currently has no `public.agent_memories` table.
- The current Supabase Security Advisor still reports leaked-password protection disabled.

## Advisor reconciliation receipts

### SECURITY DEFINER inventory

- Supabase currently reports 29 `SECURITY DEFINER` functions executable by `authenticated`.
- Definition-level inventory found 27/29 directly reference `auth.uid()`, 6/29 directly reference `is_non_anonymous_user()`, 2/29 use `is_founder()`, and 2/29 use `can_manage_guardian_reviews()`.
- The two functions without a direct `auth.uid()` reference are `list_guardian_verification_queue()` and `upsert_control_room_issue(...)`; transaction-only live probes under an authenticated-anonymous claim confirmed both calls are denied.
- This closes the immediate anonymous-authority concern for those two functions. It does not convert the entire 29-function advisor inventory into a blanket green; future grant changes still require function-specific semantic review.

### RLS enabled with no policy

The five current INFO findings are intentionally server-only at the table-grant layer. Live privilege readback confirmed `anon=false`, `authenticated=false`, and `service_role=true` for SELECT on:

- `public.account_deletion_receipts`
- `public.app_config`
- `public.app_private_config`
- `public.guardian_verification_reviews`
- `public.runtime_contract_versions`

Do not add client RLS policies merely to silence this advisor finding.

### Anonymous-policy warnings

Supabase reports anonymous-access-policy warnings across multiple tables because anonymous Auth sessions use the `authenticated` role. Existing permanent-account guards already close some of these paths. The advisor warning alone is not proof of exploitable anonymous access and must not trigger a blanket revoke that breaks legitimate permanent-account behavior.

## Not upgraded to verified

- No `agent_memories` migration has been applied to production.
- No L3 memory is consumed by the companion runtime.
- No L4 goals/reflection runtime exists.
- Leaked-password protection is not enabled.
- Exact-production `app.sekretbip.net` authority is not established by this receipt.

## Truth rule

This receipt can close only the checks it directly observes. It cannot turn `productionClaim`, merge authority, deploy authority, or L3/L4 runtime status green. Advisor warnings stay distinct from verified exploitability, and a green candidate CI run cannot substitute for production activation evidence.
