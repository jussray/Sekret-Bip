# README Impact Review — Signup Reliability

## Trigger

Merged product and verification changes:

- PR #517, signup recovery after ambiguous Supabase Auth timeouts;
- PR #518, read-only production browser-to-Supabase Auth reachability proof.

## Decision

`README updated` is required because the changes alter user-visible signup failure recovery, production verification coverage, and the interpretation of hosted CI outages.

## Required README facts

- Signup no longer treats every `Failed to fetch` or 504 as a definite failed account creation.
- Recovery is bounded and preserves email-confirmation behavior.
- Production Playwright includes a no-mutation Auth reachability probe and an intercepted timeout regression.
- Hosted exact-head proof remains pending while GitHub Actions jobs fail before runner startup.
- Zero-step/no-log failures remain infrastructure evidence, not proof of a code regression.

## Guardrails

The README must not claim the signup incident is fully closed until the exact deployed frontend and Auth boundary execute successfully under recovered hosted runners.
