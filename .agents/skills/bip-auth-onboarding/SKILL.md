# bip-auth-onboarding

## 5W1H operating contract

Before planning, editing, or claiming completion, establish and state:

- **Who** — the requester, decision owner, affected users, data subjects, and execution authority.
- **What** — the requested outcome, concrete deliverable, non-goals, and existing work that must be preserved.
- **Where** — the exact repository, branch, environment, runtime, route, service, table, or provider boundary involved.
- **When** — the current lifecycle or release state, required ordering, timing constraint, and rollback window.
- **Why** — the user problem and verified evidence that justify the work.
- **How** — the smallest safe implementation, required permissions, verification evidence, rollout, and rollback.

Inspect repository and runtime truth for unknowns. Ask the user only when a missing answer would materially change the safe solution or authority. Re-run 5W1H after red-team/OODA findings change the plan. Finish by mapping the result, evidence, remaining blocker, and next owner back to these six questions.


## Trigger

Activate whenever work touches:

- splash, age gate, signup, login, email confirmation, password reset, or logout;
- account/profile hydration or post-auth routing;
- teen or parent onboarding completion;
- required consent, guardian verification, parent linking, or Limited Mode;
- auth-state listeners, verification refreshes, Realtime signals, or route guards;
- cross-device restore or second-user isolation.

## Required with

- `bip-repo-truth`
- `bip-supabase-guardian`
- `bip-privacy-redteam`
- `bip-release-gate`
- `bip-sekret-identity` when companion or Se'kret identity is touched

## Canonical journey

```text
Splash
→ Age / account-side choice
→ Permanent account create or sign in
→ Explicit required consent
→ Private profile setup
→ Teen verification or guardian verification
→ Correct teen / parent destination
```

There is no anonymous skip into a private product surface. Limited Mode still requires a permanent account and a server-resolved verification state.

## Post-auth fetch contract

A successful auth response is not proof that onboarding is complete.

Before routing after login, signup, email confirmation, or account restoration, fetch and reconcile:

1. permanent Supabase session;
2. canonical `app_profiles` account profile;
3. required persisted consent state;
4. `account_verification` state;
5. account side and intended onboarding route.

Use `src/services/auth/postAuthBootstrap.ts` for the profile/consent portion and `VerificationContext.refreshVerification()` for verification. Do not navigate directly from `signInWithPassword()` or `signUp()` success.

## Signal contract

`VerificationContext` owns the single app-wide Realtime subscription to the signed-in user's own `account_verification` row.

- filter by `user_id=eq.<current user id>`;
- listen for insert and update changes;
- refresh through the canonical fetch path;
- remove the channel on account change, sign-out, and unmount;
- do not create duplicate screen-local subscriptions;
- never subscribe to another user's verification row.

## Consent contract

- Required consent is explicit, category-specific, persisted, and auditable.
- Continuing onboarding does not imply consent.
- Never advance when persistence fails.
- Optional feature consent is not bundled into Terms or Privacy acceptance.
- A profile save must not bypass missing required consent.
- Policy wording and public URLs require legal review before launch.

## MCP use

Read `config/mcp-skill-routing.json` before using an MCP server.

- GitHub: inspect exact branch, PR, checks, and runtime-truth assertions.
- Supabase: read-only schema and documentation inspection; migrations remain reviewed files plus deliberate application and proof.
- Context7 / Microsoft Learn: current official library guidance only; no private user content.
- Playwright: web auth/onboarding route proof with synthetic accounts only.
- Cloudflare: deployment and observability proof only when Worker behavior changed.

MCP connectivity is not runtime proof. Exact-head tests, two-account walkthroughs, migration parity, and deployed behavior remain authoritative.

## Required evidence

- signup and login both wait for post-auth bootstrap;
- splash and age gate are reachable before authentication;
- incomplete accounts resume at the correct consent/profile step;
- Realtime verification updates without manual refresh and without duplicate channels;
- teen and parent flows remain side-safe;
- explicit consent is not created before the affirmative action;
- sign-out and second-user login do not inherit profile, consent cache, or verification state;
- Type Check, unit/contract tests, route tests, and Playwright/Maestro journey proof pass at one exact commit.
