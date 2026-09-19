# L3/L4 live preflight receipt

Observed against Supabase project `tbsevonvegdnlyjgplmm` on 2026-09-18/19 UTC boundary.

## Verified live

- Project status: ACTIVE_HEALTHY.
- `is_non_anonymous_user()` returned false under a synthetic authenticated-anonymous JWT claim.
- `is_founder()` returned false under that same claim.
- `can_manage_guardian_reviews()` returned false under that same claim.
- Under `SET LOCAL ROLE authenticated` plus the same synthetic anonymous claim, visible row counts were zero for:
  - `public.room_memory`
  - `public.comfort_sessions`
  - `public.control_room_issues`
- `account-delete` is active with `verify_jwt=false` and uses a dedicated deletion secret before service-role operations.
- `safety-scan` is active with `verify_jwt=false`, uses a dedicated scan secret before source access, and allowlists only the public source path.
- Supabase Security Advisor currently reports leaked-password protection disabled.

## Not upgraded to verified

- Live POST negative-auth requests to the two custom-auth Edge Functions were not earned from this execution environment because outbound DNS resolution for the function hostname failed. Deployed source and configuration were inspected, but that is not a substitute for the live POST receipt.
- No `agent_memories` migration has been applied to production.
- No L3 memory is consumed by the companion runtime.
- No L4 goals/reflection runtime exists.

## Truth rule

This receipt can close only the checks it directly observes. It cannot turn `productionClaim`, merge authority, deploy authority, or L3/L4 runtime status green.
