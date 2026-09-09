# Cloudflare Email Routing for Se'kret Bip

Last reviewed: 2026-08-20

## Canonical handler

Incoming Bip email belongs to the privileged platform Worker `sekret-backend`, not to the companion Worker `sekret`.

The current backend entry point is `worker/voice-entry.ts`. It exports both:

- `fetch()` for the public HTTP/API front door;
- `email()` for inbound email processing through `worker/email-router.ts`.

The companion-purpose split does **not** move email into `sekret`. `sekret` is reserved for companion reply/voice/transcription execution. Email is platform infrastructure and should remain isolated from companion AI/provider secrets and conversation execution.

`bip-mail` is the retired legacy email Worker and must not regain production authority.

The historical cutover rule remains explicit for contract compatibility: change the Worker action from `bip-mail` to `sekret-backend` only after exact Email Routing/provider evidence proves the target and rollback. Current provider-absent evidence means `bip-mail` must not be recreated.

## Supported inbox aliases

- `hello@<bip-domain>`
- `founder@<bip-domain>`
- `partnerships@<bip-domain>`
- `support@<bip-domain>`
- `parents@<bip-domain>`
- `safety@<bip-domain>`
- `privacy@<bip-domain>`
- `legal@<bip-domain>`
- `security@<bip-domain>`

Unknown aliases are rejected rather than silently forwarded.

## Deployment boundary

Current production API/email deployment remains rooted in `sekret-backend` through `wrangler.toml`.

```bash
npm run deploy:worker
```

This is an emergency/manual deployment path requiring separately authorized Cloudflare credentials. Do not deploy `worker/email-router.ts` directly under the same Worker name because that would replace the HTTP entry point.

A future `sekret-backend -> sekret` Service Binding for `/api/sekret/*` must leave `email()` on `sekret-backend`. A companion cutover is not an email cutover.

## Provider verification

Before modifying Email Routing:

1. Prove the intended exact `sekret-backend` release.
2. Read the live Email Routing rules and destination state.
3. Confirm every supported alias targets the backend/platform Worker intended to export `email()`.
4. Send controlled messages through applicable aliases.
5. Confirm expected `X-Bip-*` headers and verified destination delivery.
6. Confirm `bip-mail` has no remaining provider authority.
7. Retain rollback before any routing mutation.

Do not infer Email Routing from Worker names alone.

## GitHub-managed Cloudflare setup

The repository owns the desired Email Routing rule set through:

- `.github/workflows/cloudflare-email-routing.yml`;
- `scripts/reconcile-cloudflare-email-routing.mjs`.

The workflow is manual and plan-only by default. It must remain scoped to email routing and must not mutate companion Worker routes, service bindings, or provider secrets as a side effect of an email repair.

The only required GitHub Actions repository secret is `CLOUDFLARE_API_TOKEN`. Optional zone/account IDs may pin discovery as documented by the workflow. Credentials must never be printed or copied into repository prose.

## Privacy behavior

The email handler does not store message bodies, invoke companion AI, or write email content to Supabase. It only:

- validates the destination alias;
- adds `X-Bip-*` classification headers;
- logs limited delivery metadata;
- forwards the original message to the verified destination.

Safety and security aliases are marked urgent; privacy and legal aliases are marked important.

## Architecture invariant

```text
Cloudflare Email Routing
        |
        v
sekret-backend email()
        |
        v
worker/email-router.ts

NOT

Cloudflare Email Routing -> sekret companion runtime
```

Keeping email on the platform Worker reduces the blast radius of companion runtime changes and keeps unrelated provider/business traffic out of the companion execution plane.
