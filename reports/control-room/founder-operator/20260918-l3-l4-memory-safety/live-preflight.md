# L3/L4 live preflight receipt

Observed against Supabase project `tbsevonvegdnlyjgplmm` on 2026-09-19 UTC.

## Verified live

- Project status was previously observed `ACTIVE_HEALTHY`; this receipt does not infer current project health from that older observation.
- `is_non_anonymous_user()` returned false under a synthetic authenticated-anonymous JWT claim.
- `is_founder()` returned false under that same claim.
- `can_manage_guardian_reviews()` returned false under that same claim.
- Under `SET LOCAL ROLE authenticated` plus the same synthetic anonymous claim, visible row counts were zero for:
  - `public.room_memory`
  - `public.comfort_sessions`
  - `public.control_room_issues`
- `account-delete` is currently ACTIVE with `verify_jwt=false`; a live POST from inside the Supabase project with its dedicated custom-auth credential intentionally absent returned HTTP `401`.
- `safety-scan` is currently ACTIVE with `verify_jwt=false`; a live POST from inside the Supabase project with its dedicated custom-auth credential intentionally absent returned HTTP `401`.
- The current Supabase Security Advisor still reports leaked-password protection disabled.
- Production currently has no `public.agent_memories` table.

## Current advisor receipts that remain separate

- Supabase currently reports 29 `SECURITY DEFINER` functions executable by `authenticated`. This is an advisory inventory, not proof that all 29 are exploitable. Each function requires semantic authority review before grants are changed.
- Supabase currently reports anonymous-access-policy warnings across multiple tables because anonymous Auth sessions use the `authenticated` role. Existing permanent-account guards already close some of these paths, so the advisor warning alone must not be converted into a vulnerability claim or a blanket revoke.
- RLS-without-policy INFO findings exist for server/private tables including `account_deletion_receipts`, `app_config`, `app_private_config`, `guardian_verification_reviews`, and `runtime_contract_versions`. Their intended server-only access must be preserved and reviewed separately rather than adding client policies to silence the advisor.

## Not upgraded to verified

- No `agent_memories` migration has been applied to production.
- No L3 memory is consumed by the companion runtime.
- No L4 goals/reflection runtime exists.
- Leaked-password protection is not enabled.
- Exact-production `app.sekretbip.net` authority is not established by this receipt.

## Truth rule

This receipt can close only the checks it directly observes. It cannot turn `productionClaim`, merge authority, deploy authority, or L3/L4 runtime status green. Advisor warnings stay distinct from verified exploitability, and a green candidate CI run cannot substitute for production activation evidence.
