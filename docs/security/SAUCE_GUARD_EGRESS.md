# Sauce Guard — Bip egress and contributor adoption

## Canonical authority (DO NOT fork the skill)
The founder-owned `sauce-guard` skill is maintained in
`jussray/founder-control-room/.agents/skills/sauce-guard/SKILL.md`.
This repository points all agent entry points to that canonical skill.
It governs any outward content sourced from internal product evidence:
truth classification, proprietary information removal, exact founder approval,
execution-time FCR revalidation, external provider readback and evidence receipt.

**Sauce Guard is not itself a runtime log sanitizer.** For CI/job/runtime logging,
use the local fail-closed changed-line scanner at
`scripts/audit-sauce-guard-logging.mjs` and fixed event codes.

## Mandatory contributor policy
- All humans, AI agents and integrations must check this policy before changing log sinks,
  publishing product updates, sharing project evidence or posting announcements.
- Never send raw provider error bodies, auth tokens, PII, teen/parent content, prompts,
  user IDs, secret headers or arbitrary exception text to logs or outbound artifacts.
- New logger sinks in `scripts/`, `src/`, `worker/`, `app/` and `supabase/functions/`
  must be a single fixed uppercase code literal, e.g. `console.error('SAUCE_GUARD_REQUEST_FAILED');`.
- Rich diagnostics belong in separately authorized, private, minimized systems with
  retention and access controls; never weaken logging privacy to satisfy a CI check.
- The PR repository-truth gate rejects new non-fixed logger calls. Its scan is
  changed-line only; pre-existing logging debt, custom wrappers, native logs and
  production provider state need independent security review.
- A passing scanner is **not** publication authority, a privacy certification,
  nor proof that every assistant in other repos obeyed the founder skill.
- No code review, agent or automation may mark publication complete without
  explicit founder authorization and platform artifact readback.

## Incident hygiene
If a leak is suspected, limit further exposure, preserve minimal sanitized
metadata, escalate privately to the system owner, assess the actual log audience
and retention, and rotate any exposed credentials through the account owner.
Do not reprint the exposed value, copy raw logs to a public issue, or claim
that old external logs are erased by a source-code patch.

## Proof
- `node --test test/sauce-guard-logging.test.mjs` checks sink examples and
  the exact canonical skill references for agent entry points.
- `node scripts/audit-sauce-guard-logging.mjs --base=<trusted-base-sha>`
  checks new log sinks in the current candidate diff.
- The normal Bearer code-scanning gate remains independent and can still block
  the PR if it reports new vulnerabilities.
