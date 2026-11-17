# Cloudflare Worker Consolidation Gate

Date: 2026-07-18
Branch: `agent/consolidate-cloudflare-workers`
Base: `main` at `6ea572bcc2b5f0ef4b58043cd723f85727e08f23`

## Founder decision

Consolidate production Cloudflare authority to:

1. `sekret-bip` — Pages frontend;
2. `sekret-backend` — single production Worker for HTTP/API, Sekret runtime, voice/transcription, Bridge, and inbound Bip email.

Treat dashboard Workers `bip-mail` and `sekret` as legacy migration candidates.

## Repository evidence

- `wrangler.toml` targets `sekret-backend` through `worker/observed-index.ts`.
- `worker/observed-index.ts` exports both `fetch()` and `email()`.
- `worker/index.ts` and `worker/sekret-reply.ts` contain the Sekret API routes.
- `worker/email-router.ts` contains the supported inbound alias handling.
- `config/cloudflare-targets.json` records canonical, non-production, and legacy service classes.
- `test/cloudflare-worker-consolidation.test.mjs` ratchets the ownership boundary.

Focused static contract: 5 tests passed.

## External action still required

No Cloudflare account mutation was performed from this session. Before deleting anything in Cloudflare:

- repoint every Bip Email Routing alias from `bip-mail` to `sekret-backend` and verify delivery;
- audit `sekret` routes, domains, bindings, triggers, secrets, repository connection, logs, and traffic;
- migrate any unique dependency to `sekret-backend`;
- verify health, reply, voice, transcription, Bridge, Pages release marker, and all email aliases;
- remove legacy routes and triggers;
- delete `bip-mail` and `sekret` only after the preceding evidence is recorded.

## Classification

Repository preparation: complete on branch.
Live Cloudflare cutover: pending account-authorized execution.
Legacy Worker deletion: blocked until cutover evidence exists.
Merge: founder and exact-head gate.
