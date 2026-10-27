# Founder Access Recovery Gate

## Product Design brief

**Product/flow:** Se'kret Bip founder/account access recovery.

**Primary user:** Ray, the founder, building and validating while currently locked out of the product.

**User outcome:** Ray can create an account, log in, keep the session alive, complete onboarding, and land on the correct app surface from his phone.

**North-star proof:** Ray personally gets inside the app on device. Until that happens, the repo is still in blind-build recovery, not launch proof.

## Why this gate exists

Ray has been merging and reviewing from GitHub while unable to complete the real product loop. That means PR state, CI, and screenshots can orient the work, but they cannot replace the founder's own device proof.

This gate makes founder access the first cleanup lane above feature polish.

## Required journey

1. Open the app from Ray's normal device entry point.
2. Reach sign up without environment/config errors.
3. Create a permanent account.
4. Handle email confirmation or auth redirect without losing the session.
5. Log in again if needed.
6. Save required consent before durable onboarding milestones.
7. Choose age/role/name without dead ends.
8. Reach the correct teen, parent, or founder surface.
9. Log out and confirm private transient onboarding/account cache does not leak into the next account.

## Product Design acceptance criteria

The access flow must make the next action obvious at every state:

| State | Required user-facing behavior |
| --- | --- |
| Account service unavailable | Show a plain retryable error, not a silent dead end. |
| Signup validation fails | Explain the exact field problem and keep user input. |
| Supabase signup fails | Show the safe error state and retry path. |
| Email confirmation required | Tell Ray what to check and what route will recover the session. |
| Existing account | Provide sign-in path without forcing duplicate signup. |
| Session exists | Skip auth screens and continue bootstrap. |
| Required consent missing | Route to consent before any durable age/role/name write. |
| Age/role cached locally | Replay only after permanent account plus consent are durable. |
| Onboarding write conflict | Show recoverable error or retry state; do not hang. |
| Completed onboarding | Land in the correct app surface. |

## GitHub proof checklist

Repository proof for this gate must include:

- signup, sign-in, reset-password, auth context, Supabase client/env, and post-auth bootstrap inspection;
- onboarding stage transition coverage for consent-before-age/role writes;
- session persistence and sign-out cache-clearing evidence;
- current-main PR branch with zero-behind compare before merge consideration;
- exact-head workflow runs that actually execute with steps/logs;
- a final device note from Ray confirming account creation/login/onboarding works.

## Files to keep under review

- `app/(auth)/signup.tsx`
- `app/(auth)/sign-in.tsx`
- `app/(auth)/reset-password.tsx`
- `app/(auth)/forgot-password.tsx`
- `context/AuthContext.tsx`
- `utils/supabase.ts`
- `src/utils/supabase.ts`
- `src/services/auth/postAuthBootstrap.ts`
- `app/(onboarding)/consent.tsx`
- `app/(onboarding)/age.tsx`
- `context/OnboardingContext.tsx`
- `services/onboarding.ts`
- `src/utils/storage.ts`

## Related lanes

- Control Room authority: #512
- Live Supabase/onboarding/database boundary: #502
- Founder Access Recovery Gate issue: #563
- Current onboarding repair replacement: #560

## Cloudflare authority note

Ray confirmed `sekret-backend` is the official backend Worker. The repository must not drift to `bip-mail` for the backend Worker without a new explicit Founder Control Room decision. Restoring repository config does not deploy or mutate Cloudflare by itself.

## Hard rule

No launch-readiness or release-proof claim until Ray can personally create an account, log in, complete onboarding, and reach the app on device.

## Boundaries

This gate does not authorize live Supabase DDL/DML, migration-history repair, service-role use, Edge Function deploy, Cloudflare deploy, paid-capacity change, external-platform mutation, production routing change, or account mutation. Those remain separate founder-approved gates.
