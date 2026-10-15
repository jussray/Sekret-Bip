# Se'kret Bip signup email launch receipt

**Date:** 2026-10-15
**Continuity fingerprint:** `sekret-bip:auth-welcome-email:20261015:source-220ad234:auth-v3:welcome-v3`
**Continuity cookie:** `onboarding-email-unmerged-provider-and-public-guide-gates-open`

## Evidence boundary

- **WHERE:** `jussray/Sekret-Bip`, branch `fix/welcome-email-onboarding-current`; comparison base `main` at `b7077d45f484555c385c4ef8f1e4845e0369477c`.
- **WHAT, SOURCE-VERIFIED:** exact Git commit `220ad234d243ba6de6a0d372e0b598b4f832ee2d` passed 33/33 focused tests, `npm run type-check`, targeted ESLint, and parsed GitHub workflow YAML in an isolated Vercel sandbox.
- **WHAT, RUNTIME-OBSERVED:** Supabase project `tbsevonvegdnlyjgplmm` reports `send-auth-email` ACTIVE v3 with `verify_jwt=false` plus signed Standard Webhooks verification, and `send-welcome-email` ACTIVE v3 with `verify_jwt=true`. Source readback confirms provider timeouts. An ACTIVE Edge Function does not prove an Auth Hook is connected or that email has been sent.
- **WHAT, PROVIDER-OBSERVED:** the connected Resend account lists `sekretbip.net` as verified with sending enabled; its recent sent-emails listing returned no records. Other accounts or historical sends were not ruled out.
- **WHAT, PUBLIC-NEGATIVE:** `welcome.sekretbip.net` did not resolve in DNS from the probe environment. The three intended guide paths all failed the public readiness script (exit 1). `app.sekretbip.net` resolved but returned HTTP 403 from the same environment, which may represent access protection rather than a general-public result.
- **WHAT, CONFIG-NEGATIVE:** an unsigned diagnostic request to Auth Edge Function v2 returned HTTP 500; Supabase logs said required server configuration was missing. No secret values were read. Configuration was not independently reconfirmed after deploying v3.
- **WHO:** tool-origin readbacks prove execution of the stated GitHub, Supabase, Resend and sandbox operations, not the identity of any person or external provider operator.
- **WHEN:** checks and deployments observed 2026-10-15. Runtime and DNS must be reread before release.
- **WHY:** unblock real confirmed signup and personalized welcome emails without leaking tokens or falsely claiming launch.
- **HOW:** narrow isolated-branch changes, simulated provider tests, deployment readback, direct public DNS/HTTP probes; no production Auth settings mutation.

## Decision

**BLOCKED FOR MERGE / LIVE SIGNUP / PUBLIC LAUNCH.** Neither a real account creation, email confirmation, confirmed session, nor welcome-email provider acceptance was proven on this head. No PR, merge, or public application deployment occurred. `main` remained unchanged when compared.

## Reversible next gates, in order

1. Read the hosted Supabase Auth Hook settings through an authenticated authorized session. Confirm signing-secret and Resend environment variables exist without exposing values. Only enable the Send Email Hook after its secret and sender are verified; rollback is to disable that hook if live Auth errors emerge.
2. Inspect Cloudflare Pages' actual destination and the existing `welcome.sekretbip.net` domain binding before creating or changing DNS. Do not invent CNAME targets. Repeat the three public guide URL probes until they resolve and return the intended HTML.
3. Require an exact-head isolated Pages preview and opt-in disposable signup; prove durable `auth.users` evidence, confirmation link reception, confirmed sign-in, and personalized welcome-email provider acceptance.
4. Run privacy/guardian and review gates before merge; preserve prior source checks only for the exact source head and rerun after code changes.

**Stop condition:** any missing hook secret, DNS ambiguity, unexplained 403/5xx, provider rejection, or absence of exact-head live proof. Do not promote a passing source test to production VERIFIED.
