# bip-worker-guardian

## 5W1H operating contract

Before planning, editing, or claiming completion, establish:

- **Who** owns the decision/execution and who is affected.
- **What** behavior changes and what must be preserved.
- **Where** exact repository/branch/environment/Worker/route/binding/data boundary.
- **When** lifecycle state, ordering, and rollback window.
- **Why** verified evidence justifies the change.
- **How** smallest safe implementation, permissions, proof, rollout, rollback.

Last reviewed: 2026-08-20

## Trigger

Any PR touching `worker/`, `wrangler.toml`, Cloudflare Worker identities/routes/Service Bindings, authenticated API behavior, AI/TTS/STT runtime behavior, privileged Supabase Worker access, or production deployment verification.

## Canonical ownership

Read `DEPLOYMENT.md`, `docs/CLOUDFLARE_OWNERSHIP.md`, `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md`, and current Wrangler/provider evidence before changing deployment behavior.

### Current public route

- `api.sekretbip.net` is the stable public API origin.
- Repository `wrangler.toml` currently maps it to `sekret-backend` using `worker/voice-entry.ts`.
- `sekret-bip` is the canonical Pages frontend project.

### Companion authority

- `sekret` is founder-confirmed active companion API lineage.
- Exact current hostname/routes/custom domains/workers.dev/build trigger/bindings/version/traffic remain Cloudflare provider-readback truth.
- Best-fit companion responsibility is reply + voice + transcription plus companion identity/style/safety-response execution.

### Platform authority

Best-fit `sekret-backend` responsibilities are stable public ingress, Bridge/privileged-data operations, service-role Supabase access, inbound email, and non-companion backend/platform business logic.

### Preferred split

Keep clients on `api.sekretbip.net`; after provider census and compatibility proof, delegate `/api/sekret/*` from `sekret-backend` to `sekret` with a Cloudflare Service Binding.

Do not introduce a second client-facing production Worker URL solely to split services.

This skill guards both Workers and the boundary between them. It must not infer current provider state from historical names.

FAIL if:

- backend/companion secrets are moved into Pages/client code;
- `SUPABASE_SERVICE_ROLE_KEY` is duplicated into `sekret` merely to preserve telemetry;
- Bridge/private source access or inbound email is moved into the companion Worker without a separately reviewed reason;
- `sekret` is deleted/renamed/detached without exact provider readback and rollback;
- service-binding activation removes the old backend-local companion path before rollback/proof exists;
- a second competing public production API authority is introduced;
- exact-release verification is replaced by stale check state or a retired release function.

## Worker file map

Verify paths before use:

```text
worker/
  voice-entry.ts          current public backend entry point
  observed-index.ts       telemetry wrapper
  index.ts                auth/rate/style router
  auth.ts                 JWT/auth helpers
  sekret-reply.ts         companion reply/TTS/STT brain
  runtime-style.ts        companion identity/style enforcement
  bridge-summary.ts       privileged teen-to-parent summary generation
  bridge-summary-store.ts privileged Bridge persistence
  email-router.ts         inbound email processing
  piper-tts.ts            legacy voice integration
  push-notifications.ts   privileged push helper (not proof of a live public route)
  telemetry.ts            metadata-only telemetry
  audit/                  assurance persistence
  config/                 runtime model/policy configuration
```

Repository truth overrides this snapshot.

## Core security rules

### Authentication

Every protected endpoint must validate credentials before protected data access, derive user identity from verified auth rather than body-only identifiers, fail closed for invalid auth, and minimize responses.

### Service-role boundary

- `SUPABASE_SERVICE_ROLE_KEY` is a privileged platform credential.
- Keep it on the backend/platform boundary unless a separately reviewed least-privilege design proves another placement necessary.
- The current companion assurance persistence uses this key. Treat that as technical debt to remove before the companion Worker becomes least-privilege, not justification to copy the key.
- Elevated queries must derive authority from verified identity/control-plane context, not user-supplied IDs.

### Companion runtime

Changes to reply, prompt, identity, style, voice, transcription, or delegation require:

- trusted actor identity configuration;
- compatibility for Suhana, Sy, Cloud, Night, Se'kret and required legacy IDs;
- no internal identity leakage;
- user content never treated as trusted system instruction;
- unauthorized memory/private context excluded;
- safety-response guardrails preserved;
- question/style repair tested;
- metadata-only telemetry;
- model/voice changes reflected in configuration and evidence.

### Bridge boundary

Bridge is privileged platform work, not general companion inference:

- only explicitly shared teen content may be used;
- raw source text is never returned to parent clients;
- revoked/expired/blocked/deleted/unlinked relationships fail closed;
- rollout remains controlled until applicable production proof passes.

### Email boundary

Inbound Email Routing stays on the platform Worker. Companion Worker changes must not mutate email handlers/rules as a side effect.

## Service Binding checklist

For any `sekret-backend -> sekret` change:

- [ ] provider census for both Workers retained;
- [ ] exact target `sekret` release/version known;
- [ ] companion contract compatible before binding activation;
- [ ] original Authorization/request semantics preserved or explicitly replaced with tested equivalent;
- [ ] CORS/auth/rate limiting enforced exactly once or intentionally layered;
- [ ] trace/correlation continuity preserved;
- [ ] no service-role secret copied into companion runtime;
- [ ] public client URL remains unchanged unless separately approved;
- [ ] Bridge/email/platform routes do not delegate accidentally;
- [ ] old local companion implementation remains available for rollback during first cutover;
- [ ] binding is read back from Cloudflare after mutation;
- [ ] production reply/voice/transcription journeys prove the intended companion Worker executed;
- [ ] exact-release packet records both Worker identities and rollback.

## Endpoint checklist

For every new/modified endpoint:

- auth before protected access;
- unauthenticated requests fail closed;
- CORS appropriate to invocation path;
- abuse/rate limiting considered;
- logs exclude private content/credentials/tokens;
- rollout and rollback documented;
- positive and negative authorization tests included.

## Deployment safety

- [ ] current public `wrangler.toml` still targets `sekret-backend` unless the approved change explicitly says otherwise;
- [ ] `api.sekretbip.net` ownership is read back before route mutation;
- [ ] `sekret` provider identity/bindings are read back before mutation;
- [ ] bindings match provisioned configuration;
- [ ] no binding/route/secret is removed without caller and rollback verification;
- [ ] Cloudflare native integration remains normal production authority;
- [ ] Pages is verified separately;
- [ ] exact release uses the canonical well-known marker, Worker health/version, binding evidence when applicable, and production Playwright;
- [ ] retired Supabase `release-health` is never used as deployment evidence.

## Output

Return `APPROVED` or `CHANGES REQUIRED`.

For required changes, include exact file/line/rule/severity:

- CRITICAL: auth bypass, secret exposure, private-data leak
- HIGH: wrong Worker authority, service-role expansion, binding/route blast radius, missing authorization
- MEDIUM: stale configuration/docs, missing evidence, weak rollback/telemetry