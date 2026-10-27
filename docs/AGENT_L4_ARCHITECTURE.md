# Agent L4 Architecture — Decision Matrix

## Purpose

This doc evaluates what it would take to move Bip's companions (Raylene, Rylane,
Cloud, Night, Oracle/Se'kret) from **stateless per-turn responders** toward
**L4 agents**: durable memory across sessions, persistent goals, self-reflection,
and — only where a real product need exists — coordination between companions.

It replaces an earlier ungrounded draft (an "Agent L-4 Architecture Decision
Matrix" bundle of standalone HTML/JSON files) that recommended a third-party
memory SaaS (Mem0), a temporal graph store (Zep/Graphiti), a new message-queue
protocol (A2A), and a dedicated WebSocket layer — none of which exist in this
repo, and none of which were checked against Bip's actual stack or its COPPA
obligations. This version starts from what's actually here.

Maturity scale used below, specific to this doc:

| Level | Meaning |
|---|---|
| L1 | Single stateless completion, no history |
| L2 | Stateless call + injected short-term history (**current state**) |
| L3 | Durable memory across sessions, per companion, per user |
| L4 | L3 + persistent goals, self-reflection, and coordination across companions where warranted |
| L5 | L4 + cross-companion synthesis under explicit consent, autonomous goal proposal (not just tracking), and self-directed reflection scheduling — **not started; blocked on L4 reaching `verified`, see below** |

## Current state (as implemented today)

- **Turn flow:** `src/services/ai/buildReplyRequest.ts` → `fetchSekretBrainReply`
  (`src/utils/api.ts`) → `worker/sekret-reply.ts`. Each call is stateless except
  for the `history` array passed in from the client — this is **L2**.
- **`RoomMemory`** (`src/types/roomMemory.ts`) tracks last visit/hotspot/summon
  per companion, but it's a client-side struct, not synced to a durable server
  table.
- **`companionEngine.ts`** (`src/features/sekret/companionEngine.ts`) is the
  single entry point for all companion sends today; it explicitly states memory
  persistence "stays in `sekretCompanion.ts` + `sync.ts`" — i.e. local device
  sync, not server-side agent memory.
- **No cross-session goal tracking, no reflection loop, no agent-to-agent
  messaging** exist today. Oracle/Se'kret currently reflects patterns back
  using whatever `oracleContext` is passed in per-call, not a queried memory
  store.
- Supabase already hosts event-sourced tables (`audit_events`, `founder_ideas`,
  control room tables — see `supabase/migrations/`), so there's precedent for
  the kind of append-only tables L3/L4 memory would need.
- The Cloudflare Worker (`worker/index.ts`) already owns routing, auth, and
  telemetry (`worker/telemetry.ts`) — any future queue poller would live
  alongside those, not as new infrastructure.

## Constraint that overrides the original draft's recommendations

Bip is a COPPA-covered product (`docs/COPPA_COMPLIANCE.md`): data from
Children is not shared with third parties beyond what's disclosed, and adding
a new subprocessor (a hosted memory SaaS, a hosted graph-memory service, a new
managed protocol vendor) requires a legal/compliance review before it can be
adopted, not just an engineering decision. That rules out defaulting to a
third-party memory vendor the way the original draft did. Supabase is already
an approved processor for this data; new companion memory should stay there
unless a documented gap forces otherwise.

## Decision matrix

### 1. Memory framework

| Option | Data residency | Fits existing RLS model | COPPA subprocessor impact | Notes |
|---|---|---|---|---|
| **Supabase `pgvector`** | Stays in our own Postgres | Yes — same `supabase/migrations/` + RLS pattern as every other table | None — no new subprocessor | Recommended default |
| Mem0 (hosted) | Third-party | No | New subprocessor, needs legal sign-off | Only worth revisiting if pgvector recall is proven insufficient in practice |
| Zep / Graphiti (temporal graph) | Third-party (or self-hosted graph DB) | No | New subprocessor or new infra to operate | Adds a whole datastore type for a temporal-reasoning need we haven't hit yet |

**Recommendation:** build on Supabase `pgvector`. It's already the system of
record for everything else in this app, it needs no new legal review, and it's
one migration file away instead of a new integration.

### 2. Orchestration pattern

Bip has a **fixed roster of 5 companions**, invoked one at a time per user
turn — not a swarm of dozens of autonomous agents. Patterns aimed at
100-agent-scale hierarchical orchestration or fully-audited supervisor/worker
decision logs are solving a problem this product doesn't have.

| Option | Fits Bip today? | Notes |
|---|---|---|
| **Single agent per turn (current)** | Yes | Keep as default for Raylene, Rylane, Cloud, Night |
| Lightweight supervisor/worker | Only for Oracle/Se'kret | Oracle already synthesizes across other companions' history/RoomMemory — that's the one place a thin "read what the other companions saw" step is justified, not a general orchestration layer |
| Hierarchical multi-agent (100-agent scale) | No | Over-engineered for a fixed 5-companion roster; do not build |

### 3. Inter-agent communication protocol

Companions don't run concurrently and don't need to negotiate with each other
in real time — they're invoked sequentially per user action. A full A2A
message-envelope protocol, a Supabase queue table, and a dedicated Cloudflare
Worker poller are **speculative infrastructure** with no current trigger.
Documenting the trigger conditions is more useful right now than building it:

- A scheduled reflection job needs to notify Oracle asynchronously after the
  user has left the session, **or**
- A Circle/multiplayer feature needs two companions to co-respond in the same
  thread.

**If and when one of those triggers happens:** reuse what's already in the
stack — a Postgres queue table polled by the existing Worker (same shape as
`worker/telemetry.ts`) — rather than introducing WebSockets or a new
real-time vendor. That keeps the protocol inside infrastructure Bip already
operates and pays for.

## Phased plan (proposal — not yet built)

| Phase | Level | Scope |
|---|---|---|
| 1 | L3 | Persist `RoomMemory` server-side; add an `agent_memories` table (`pgvector`); wire Oracle's `oracleContext` build to query it instead of relying only on passed-in history |
| 2 | L3 | Add a `agent_goals` table for cross-session continuity (e.g. "follow up about X next time") |
| 3 | L4 | Scheduled reflection job that summarizes a finished session into semantic memory and flags patterns for Oracle |
| 4 | L4 (conditional) | Async inter-companion signaling via a Supabase queue + the existing Worker poller — **only** if one of the trigger conditions above materializes |

## Illustrative schema sketch (proposal only — not applied)

```sql
-- Not a migration yet. For review before Phase 1 is scheduled.
create table public.agent_memories (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.app_profiles(id) on delete cascade,
  companion_id text not null,               -- 'raylene' | 'rylane' | 'cloud' | 'night' | 'sekret'
  kind         text not null,               -- 'episodic' | 'semantic'
  content      text not null,
  embedding    vector(1536),
  created_at   timestamptz not null default now()
);

create index on public.agent_memories using ivfflat (embedding vector_cosine_ops);

alter table public.agent_memories enable row level security;
```

This should follow the same RLS pattern as the rest of `supabase/migrations/`
(founder/control-room tables restrict by `app_profiles`; this would restrict
by the owning teen's profile) — write that policy alongside the real migration,
not here.

## Open questions for founder decision

- Is cross-session memory (Phases 1–2) or inter-companion coordination
  (Phase 4) the more valuable next step? Nothing in the current product
  requires Phase 4 yet.
- Confirm: no third-party memory/orchestration vendor is adopted without a
  COPPA subprocessor review, even if it benchmarks better than `pgvector`.

## Next steps if Phase 1 is approved

Follow the repo's existing conventions rather than a standalone `output/`
bundle:

1. Migration under `supabase/migrations/<YYYYMMDDHHMMSS>_agent_memories.sql`
2. Service module under `src/services/` (e.g. `agentMemory.ts`), following the
   pattern in `src/services/founderAudit.ts`
3. Wire into `src/services/ai/buildReplyRequest.ts` where `oracleContext` is
   already assembled
4. Tests under `test/`, following `test/companion-reply-continuity.test.mjs`

## L5 — cross-companion synthesis (blocked, not started)

L5 is a real target, not a hypothetical: once companions have durable,
individually retrievable memory (L4), the next honest step up is letting
Se'kret/Oracle *synthesize* across what Raylene, Rylane, Cloud, and Night
have each separately learned — under explicit consent — and let the system
propose goals rather than only track ones the teen stated. That's a
meaningfully different capability from L4, not a relabeling of it.

It is **not started**, and per `.agents/skills/bip-l4-memory/SKILL.md`'s own
rule — *"absence of one of these paths is a delivery gap, not permission to
invent a parallel implementation"* — no L5 schema, service, or runtime should
be built before L4 exists. Concretely, L5 contract work cannot begin until:

- `l4-continuity-memory` in `implementation-ledger.json` reaches `verified`
  (not just `integrated` — L5 depends on L4's memory actually being proven
  correct and denial-tested in production, not merely wired up);
- the `SPRINT.md` "Next execution order" items that gate L4 schema activation
  (anonymous-auth policy hardening, authenticated-RPC behavior tests,
  negative-auth tests for the two custom-auth Edge Functions, password-breach
  protection planning) are complete;
- cross-companion consent has its own reviewed contract — L5's "synthesis
  across companions" is exactly the kind of cross-companion sharing
  `bip-l4-memory` lists as an **"Automatic blocker"** ("silently
  cross-companion sharing") unless it's explicit and consented.

This section exists so "L5" has one honest definition instead of being
reinvented differently by a future session. See `implementation-ledger.json`'s
`l5-cross-companion-synthesis` entry for its tracked status.
