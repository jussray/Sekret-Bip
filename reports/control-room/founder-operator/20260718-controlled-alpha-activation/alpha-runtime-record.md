# Dedicated Alpha Runtime Record

## Status

**Prepared, fail-closed, not deployed.**

This artifact defines the next runtime slice without claiming that any credential was used, any Worker was deployed, or any preview build was created.

## Intended runtime

- Service name: `sekret-backend-alpha`
- Configuration: `wrangler.alpha.toml`
- Entry point: `worker/observed-index.ts`
- Preview app URL target: `https://sekret-backend-alpha.mcgill-raylene.workers.dev`
- Production service remains: `sekret-backend`

## Committed non-secret configuration

- Supabase project URL
- chat model identifier
- speech model identifier
- transcription model identifier
- observability enabled
- Bridge rollout set to `disabled`

## Approval-gated runtime values

The dedicated service cannot become usable until the founder approves provisioning through the provider control plane. Values must never be committed or copied into Founder Room evidence:

- OpenAI API credential;
- Supabase service-role credential;
- exact comma-separated controlled teen-account allowlist for Bridge generation;
- any custom voice identifiers used by the approved preview;
- approved origin restrictions when a browser origin is used;
- rate-limit binding or equivalent abuse control.

## Pre-deployment gate

Before any deployment:

1. exact PR head is recorded;
2. `npm run test:controlled-alpha` executes on a complete checkout;
3. `npm run verify:worker:alpha` completes a non-deploying Wrangler bundle;
4. the runtime allowlist contains only approved synthetic or controlled teen accounts;
5. production `wrangler.toml` remains disabled;
6. the health identity and expected routes are documented;
7. rollback ownership and command are available;
8. the founder explicitly approves credential use and deployment.

## Post-deployment evidence required

- exact deployed commit SHA;
- service identity is `sekret-backend-alpha`, not a canonical branch preview;
- `/health` response and timestamp;
- deployed non-secret variable inventory;
- confirmation that secret values are absent from logs and artifacts;
- unauthorized request denial;
- non-allowlisted authenticated teen denial for Bridge generation;
- allowlisted teen success or truthful fallback;
- rate-limit behavior;
- rollback rehearsal or verified disable operation.

## Preview-build gate

After runtime proof, create separate teen and parent internal preview builds from the same exact approved head. Retain build IDs, platform, profile, app variant, backend target, release audience, installation result, and rollback/expiration details.

## Rollback

- remove or disable the Bridge cohort allowlist;
- set runtime Bridge rollout to disabled;
- remove preview distribution access;
- roll back the dedicated alpha Worker without changing the production Worker;
- disable Bridge and Crew beta flags if any authorization, revocation, deletion, or privacy stop condition occurs.

## Non-claims

This record is a deployment checklist. It is not provider authentication, deployment, a build, an installed app, a two-account journey, or launch approval.
