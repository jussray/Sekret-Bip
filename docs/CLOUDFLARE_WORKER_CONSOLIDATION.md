# Cloudflare Worker Topology and Consolidation

Last reviewed: 2026-08-28

## Decision

Se’kret Bip has distinct Cloudflare authorities that must not be collapsed:

1. `sekret-bip` — Pages frontend;
2. `sekret-backend` — canonical public API and privileged platform Worker;
3. `bip` — active companion Worker under its current provider name, with previous provider name `sekret` retained as lineage;
4. `sekret-backend-alpha` — founder-gated non-production Worker.

`bip-mail` is retired. `bip` must not be deleted, detached, repurposed, or treated as legacy until exact provider route/binding ownership and rollback are proven.

## Current repository routing

The checked-in client remains single-homed:

```text
EXPO_PUBLIC_BACKEND_URL=https://api.sekretbip.net
                            |
                            v
                    sekret-backend
```

The current `wrangler.toml` maps `api.sekretbip.net` to `sekret-backend`. The companion provider rename does not change that public routing contract.

## Companion contract

The product-level `/api/sekret/*` naming remains stable even though the current Cloudflare Worker resource is named `bip`. Source continues to group reply, voice, transcription, style/identity enforcement, and companion safety behavior behind that contract.

## Best-fit target topology

```text
                           +---------------------------+
client -> api.sekretbip.net -> sekret-backend          |
                           | public/platform authority |
                           +-------------+-------------+
                                         |
                           /api/sekret/*  | Service Binding
                                         v
                           +---------------------------+
                           | bip                       |
                           | companion execution plane |
                           +---------------------------+
```

Cloudflare Service Bindings remain the preferred boundary. The client should not learn two public Worker URLs.

### `bip` should own

- companion reply inference;
- runtime style/identity enforcement;
- companion safety-response logic coupled to generation;
- TTS/transcription;
- AI/voice provider selection;
- least-privilege companion telemetry.

### `sekret-backend` should own

- stable `api.sekretbip.net` ingress;
- shared auth/rate-limit/release controls;
- Bridge privacy-sensitive data work;
- Supabase service-role operations;
- inbound email and privileged platform logic.

## Migration sequence for `bip`

1. **Provider census:** prove current immutable `bip` identity and retain the previous provider name `sekret` as provenance; read routes, custom domains, workers.dev, service bindings, secret names, Git/build trigger, versions, request volume, and known callers.
2. **Compatibility proof:** prove current `/api/sekret/*` shapes against the companion Worker.
3. **Least privilege:** keep `SUPABASE_SERVICE_ROLE_KEY` backend-only unless separately justified.
4. **Telemetry seam:** replace direct broad-privilege persistence with a narrow backend/internal path.
5. **Service binding:** add `sekret-backend -> bip` and delegate only `/api/sekret/*`.
6. **Controlled proof:** verify reply, voice, transcription, auth denial, rate limiting, fallback, trace identity, and telemetry.
7. **Production cutover:** explicitly approve and apply provider binding/routing mutation.
8. **Exact release proof:** bind backend version, `bip` version, service binding, Supabase state, and production Playwright/device journeys.
9. Remove duplicate companion code from `sekret-backend` only after rollback confidence exists.

Rollback remains server-side: disable delegation and return `/api/sekret/*` to the previously proven local backend implementation.

## Provider-safe app-domain rule

Provider automation must treat both `bip` and `sekret-backend` as protected identities. It must fail closed until the exact Worker attached to a target hostname/binding is identified from live provider readback.

- `api.sekretbip.net` remains on `sekret-backend` during migration;
- `bip` remains independently protected;
- Pages `sekret-bip` remains independent frontend authority;
- broad wildcard routes, service bindings, secrets, and custom domains are never automatic deletion targets;
- a 405 or Access response is interception evidence, not deletion authority.

## Completion evidence

The split is complete only when:

- `sekret-bip` serves the intended frontend release marker;
- `sekret-backend` serves the exact backend release at `api.sekretbip.net`;
- `bip` has a retained provider ownership receipt and exact companion release identity;
- the `sekret-backend -> bip` service binding is read back;
- companion journeys pass through `bip`;
- Bridge/email remain correct on the backend;
- no broad service-role credential was copied into `bip`;
- Founder Control Room records proof and rollback.

Deleting or detaching a Worker without the preceding route/binding audit is not consolidation. It is an outage lottery ticket.
