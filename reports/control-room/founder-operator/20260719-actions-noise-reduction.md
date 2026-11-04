# GitHub Actions noise reduction gate — 2026-07-19

## Reason

Ray provided GitHub mobile workflow evidence showing repeated recent runs across CI, Type Check, Regression Tests, Pre-Push Checks, Playwright Smoke and Guardrails, Implementation Evidence, Companion Lab Audit, Verify Cloudflare Native Deployment, Account Deletion Sweep, Verify Room Archives, Control Room Manifest, and Trigger Audit.

## Classification

This is Actions fan-out/noise and runner-budget pressure. Existing zero-step/no-log failures remain `runner_startup_failure`, not code-regression evidence.

## Change

The emergency branch changes noisy automatic workflow triggers to `workflow_dispatch` only. Jobs are preserved so Control Room can still run them manually when exact-SHA evidence is needed.

## Boundaries

- No app runtime code changed.
- No Supabase schema/RLS/auth change.
- No secret change.
- No deploy command added.
- No workflow file deleted.
- Account deletion processing becomes manual-only; this prevents unattended deletion sweeps while the Control Room is in outage/budget mode.

## Release truth

Founder Control Room remains the release-truth ledger. Cloudflare build/deploy evidence remains separate from GitHub Actions evidence.
