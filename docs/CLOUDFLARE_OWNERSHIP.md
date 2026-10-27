# Cloudflare Ownership

Last reviewed: 2026-08-28

## Current release gate

[P0 #696](https://github.com/jussray/Sekret-Bip/issues/696) owns exact-production release truth. Repository topology below is intended authority and safety policy; it is not a substitute for live Cloudflare route/custom-domain readback for the same target.

## Canonical Cloudflare surfaces

Se’kret Bip keeps these Cloudflare identities distinct:

1. `sekret-bip` — Cloudflare Pages frontend project;
2. `sekret-backend` — canonical public API/front-door and privileged platform Worker;
3. `bip` — current provider name for the active companion Worker lineage, formerly `sekret`;
4. `sekret-backend-alpha` — founder-gated non-production Worker.

`bip-mail` remains retired. `bip` is not a legacy/deletion target. Exact provider route/custom-domain readback is still required before any traffic or binding mutation. The provider rename from `sekret` to `bip` does not by itself prove that every historical route, trigger, binding, or caller moved unchanged.

## Current checked-in routing versus purpose boundary

The production client remains single-homed:

```text
web/native client
    |
    v
https://api.sekretbip.net
    |
    v
sekret-backend
```

`.env.production` and EAS production profiles point `EXPO_PUBLIC_BACKEND_URL` to `https://api.sekretbip.net`. `wrangler.toml` attaches that custom domain to `sekret-backend` in repository intent.

The companion contract remains `/api/sekret/reply`, `/api/sekret/voice`, `/api/sekret/transcribe`, companion style/safety enforcement, AI/voice provider execution, and companion telemetry. The route name retains the product term `sekret`; that does not require the Cloudflare Worker resource itself to keep the historical provider name `sekret`.

## Preferred runtime partition

```text
client
  |
  v
api.sekretbip.net
  |
  v
sekret-backend  -- public ingress / platform authority
  |
  +-- /api/bridge/* + privileged data + email + platform operations
  |
  +-- /api/sekret/*
          |
          v
      Service Binding
          |
          v
        bip  -- companion execution authority
```

Cloudflare Service Bindings remain the preferred Worker-to-Worker boundary because the public client keeps one stable API origin. This target partition is not yet a production cutover claim.

## `bip` — companion execution authority

Best-fit responsibilities:

- companion reply generation;
- companion voice synthesis and transcription;
- companion runtime style/identity enforcement;
- companion safety-response logic coupled to reply generation;
- AI/voice provider selection and provider-specific secrets;
- companion telemetry that does not require broad database privilege.

`bip` must not acquire `SUPABASE_SERVICE_ROLE_KEY` merely to make the split easy. If it becomes service-binding-only, public routing and `workers.dev` exposure must be reviewed separately rather than assumed.

## `sekret-backend` — public ingress and privileged platform authority

Current repository authority:

- Worker name: `sekret-backend`;
- entry point: `worker/voice-entry.ts`;
- canonical API custom domain: `https://api.sekretbip.net`.

It remains responsible for stable public ingress, shared auth/CORS/release controls, Bridge privacy/data authorization, server-side Supabase service-role operations, inbound email, and other privileged platform logic.

## `sekret-bip` — Cloudflare Pages project

Pages remains the frontend authority with intended build command `npm run build:web`, output directory `dist`, and public `/.well-known/sekret-release.json` marker. A Pages build badge alone does not prove the custom domain reaches Pages.

## Provider readback required for `bip`

Before any binding, route, trigger, domain, or deployment mutation, retain a provider receipt covering:

- immutable current Worker/script identity and evidence linking current `bip` to previous provider name `sekret`;
- current routes and custom domains;
- `workers.dev` state;
- service bindings and other platform bindings;
- environment-variable and secret names only;
- Git repository/branch connection and build trigger policy;
- recent request volume/errors and known callers.

Founder confirmation establishes purpose. Provider readback establishes exact traffic state.

## Ownership rules

- Product clients keep one stable production API origin unless separately approved.
- Companion behavior belongs conceptually to `bip`; current client routing through `sekret-backend` remains valid until internal delegation is proven.
- `api.sekretbip.net` remains on `sekret-backend` during the preferred service-binding migration.
- Do not duplicate `SUPABASE_SERVICE_ROLE_KEY` into `bip`.
- `bip` must not be deleted, detached, repurposed, or treated as historical merely because the provider name changed.
- The historical name `sekret` is provenance only and must not be used as present provider identity after the rename evidence.
- Frontend Pages authority and Worker authority remain separate.
- `bip-mail` must not regain production authority.
- Do not create a second token-based production deployment path alongside reviewed provider integration.

## Exact-release verification

While routing remains consolidated, production verification must prove the exact `sekret-backend` release at `api.sekretbip.net` plus applicable companion journeys. After an approved service-binding cutover, proof must additionally bind the exact `bip` version and the provider binding between `sekret-backend` and `bip`.

A stale Pages check, Worker badge, historical route statement, or Access interception is not current production proof.

## Emergency manual fallback

Manual Worker, route, domain, service-binding, or Pages mutation is administrator-only fallback. Any emergency use must record exact source commit, provider object, hostname, before/after readback, validation, rollback, and immediate repository reconciliation.
