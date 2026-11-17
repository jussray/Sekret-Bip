# Se'kret Bip — Architecture Audit for 1K to 100K Users

> **Historical audit snapshot.** Originally produced for issue #141. Historical findings remain preserved as an audit trail. Current feature/runtime state is governed by `implementation-ledger.json`, `docs/CURRENT_STATUS.md`, current source, and live evidence.

Last reconciled with current documentation: 2026-08-20

## Changes since the original audit

Material durable changes now include:

- architecture and status claims are checked by evidence/truth gates;
- `api.sekretbip.net` is the stable public API origin currently configured to `sekret-backend`;
- `sekret` is a founder-confirmed active companion API Worker lineage whose provider binding must be read back before mutation;
- the code now exposes a clean reply/voice/transcription companion contract separate from privileged Bridge/email/data operations;
- the preferred future Worker split keeps one public API and uses a Cloudflare Service Binding from `sekret-backend` to `sekret` for `/api/sekret/*`;
- production verification requires exact release identity, backend health, Supabase runtime, and production Playwright, with exact companion Worker/binding proof added after a split;
- server-owned configuration/data operations remain protected by database/runtime boundaries;
- companion identity/style enforcement is integrated into Worker and voice paths;
- L4 continuity memory remains separately governed.

## Matters before meaningful scale

### Point-ledger schema correctness

Migrations, RPC bodies, and client expectations need executable contract checks. Machine evidence prevents unsupported feature claims but does not replace schema-behavior testing.

### Point transaction authorization

Before points purchase real inventory, verify clients cannot fabricate positive transactions. Prefer server-owned writes through reviewed RPCs/APIs, narrow grants, and negative tests.

### Point-earning limits

Point-earning events require server-side caps, idempotency, and reconciliation before rewards become financially material.

### Route ownership regressions

`(teen)` and `(parent)` are canonical route groups. Historical route references must not silently re-enter current code. Route grouping is presentation, not authorization.

### Multi-device conflict behavior

Local/cloud synchronization needs an explicit conflict strategy before claiming lossless multi-device editing.

## Matters at growth scale

### AI request and cost controls

Measure per-user AI and voice cost first. Introduce budgets, abuse limits, queueing, graceful degradation, and model routing from observed traffic rather than speculative complexity.

### Companion Worker boundary

Earlier versions of this audit said service splitting should wait for scale evidence. The code/provider history now supplies a stronger reason to split: **authority and least privilege**, not fashionable microservices.

The code already groups `/api/sekret/reply`, `/api/sekret/voice`, and `/api/sekret/transcribe` as one typed companion contract. Bridge summary and email are separate privileged responsibilities. Founder/provider history also preserves an active `sekret` companion Worker lineage.

The best-fit target is therefore:

- `sekret`: companion inference, style/safety response enforcement, voice/transcription, AI/voice provider capability;
- `sekret-backend`: stable public API ingress plus privileged Bridge/data/email/platform operations;
- Service Binding between them so the client keeps one public API URL.

This split should happen only after provider readback, exact compatibility proof, telemetry least-privilege repair, rollback design, and release-gate coverage.

### Secret blast radius

The current companion telemetry persistence uses `SUPABASE_SERVICE_ROLE_KEY`. Do not copy that key into the companion Worker simply to enable a split. Move privileged persistence behind a narrow internal/backend-owned boundary first.

Reducing the companion Worker to AI/voice capability plus user-authenticated context is a meaningful security/scaling improvement because high-churn companion code no longer needs the same privileged data plane as Bridge/email operations.

### Voice boundary

Voice belongs with the companion execution plane because reply, TTS, and transcription share character identity/style contracts and one client transport. Splitting voice away from companion inference again would need separate latency/reliability evidence.

### Media retention

Voice notes and images need approved retention/deletion rules before a large corpus accumulates.

### L4 continuity memory

Durable continuity memory, persistent goals, scheduled reflection, and inter-companion coordination remain planned privacy-sensitive capabilities. They require provenance, correction, expiry, deletion, RLS, denial tests, runtime proof, rollout, telemetry, and rollback before activation.

### Observability and retries

Metadata-only telemetry and Founder Control Room provide operational visibility. After the Worker split, observability must preserve trace continuity across the public backend and companion Worker without exposing conversation content.

Recommended additions when evidence requires them:

- shared correlation/trace IDs across the service binding;
- per-Worker release/version identity in the same release packet;
- provider latency/cost budgets;
- queue/retry visibility where real traffic demonstrates need;
- companion style-version metadata on the companion Worker;
- no broad service-role secret solely for telemetry.

### Moderation and safety

Moderation and safety capacity must scale with usage and remain independently reviewed. Companion reply safety belongs with the companion execution contract; privileged account/data/notification operations remain separate runtime concerns.

## Cross-cutting event and ledger consistency

Activity events and point transactions can drift when written separately. Prefer idempotency and reconciliation over distributed-transaction complexity until traffic proves stronger guarantees are needed.

## Recommended order from current state

1. Complete Cloudflare provider readback for `sekret` and `sekret-backend`.
2. Prove the target `sekret` companion contract is compatible with current reply/voice/transcription clients.
3. Remove the telemetry dependency on `SUPABASE_SERVICE_ROLE_KEY` from the future companion boundary.
4. Add a reviewed `sekret-backend -> sekret` Service Binding with rollback to the existing local companion implementation.
5. Extend exact-release proof to bind both Worker versions and the binding.
6. Continue high-blast-radius database authorization/behavior tests.
7. Complete controlled Bridge/parent and deletion journeys.
8. Add reward/fraud and media-retention controls before financial/storage scale makes them urgent.
9. Revisit queues and further service splitting only from observed production data.

Do not turn a scale audit into an infrastructure shopping list. Split where authority, privilege, rollback, and observed bottlenecks justify it.
