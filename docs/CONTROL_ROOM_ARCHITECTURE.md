# Control Room AI Architecture

> Control Room is the cockpit. It observes and verifies the system; it is not
> the companion reply engine, memory store, or voice runtime.

## Scope

This document is canonical for the boundary between the Founder Control Room,
the Se'kret runtime, development MCP tools, and repository agent skills.

`docs/FOUNDER_CONTROL_ROOM.md` remains the broader product and operations map
for the unified founder-only dashboard. This document narrows that design to the
AI identity, companion style, voice, and L4 relationship systems.

## Core identity model

```text
Oracle
└── internal reasoning, pattern detection, safety and retrieval decisions

Se'kret
└── visible continuity, relationship and permitted memory presence

Raylene · Rylane · Cloud · Night
└── named companions with distinct faces, voices and response styles
```

The product rule is:

> Oracle understands privately. Se'kret carries safe continuity. The named
> companion shapes the reply.

Oracle must never be rendered to a teen or parent. Se'kret is not Raylene and is
not a fifth selectable companion.

## Layer map

```text
Control Room  (app/(dev), src/features/control-room)
├── observes verified runtime state
├── runs audits and evaluations
├── scores health and drift
├── creates fix missions
├── records rollout evidence
└── reports failures without exposing private teen content

Runtime AI  (src/features/sekret, src/services/ai, worker)
├── Oracle reasoning
├── Se'kret continuity
├── companion style selection
├── safety and output policy
├── consent-scoped memory retrieval
└── text and voice generation

MCP layer  (development tooling)
├── exposes repository and operational tools to coding agents
├── can run Companion Lab and Control Room queries
├── can read GitHub, Supabase, Figma and Cloudflare state
└── never sits in the teen-facing reply path

Agent skills  (.agents/skills)
├── govern how coding agents change the repository
├── enforce the Oracle / Se'kret identity boundary
├── enforce companion style and evaluation requirements
└── enforce L4 memory privacy and proof
```

## Runtime chain

```text
Teen input
   ↓
Safety and privacy gate
   ↓
Oracle reasoning (internal only)
   ↓
Se'kret continuity and consent-scoped context
   ↓
Raylene / Rylane / Cloud / Night style selection
   ↓
Canonical text reply
   ↓
Output policy check
   ↓
Screen text + optional speech generated from the same text
   ↓
Control Room receives privacy-safe health evidence
```

The TTS layer may control delivery, pace and emotional tone. It may not invent a
second answer or receive raw memory objects.

## Control Room responsibilities

Control Room may show read-only panels for:

- Se'kret identity audit results;
- companion style profiles and drift failures;
- voice health, latency, cost and text-to-speech consistency;
- L4 memory counts, contradictions, goals, expiry and deletion status;
- MCP availability, permissions and stale-data warnings.

Those panels consume verified adapter data. They do not contain reply logic,
TTS calls, memory writes, Supabase mutations or MCP invocations.

Founder access does not override teen privacy. Panels should use aggregated or
redacted identifiers and must not display raw journals, messages, audio,
transcripts, memory text, tokens or credentials.

## Canonical contracts introduced first

```text
src/features/sekret/identityContract.ts
src/features/sekret/styleProfiles.ts
src/features/sekret/companionStyleEngine.ts
src/features/sekret/relationshipPhase.ts
```

These files define contracts. Their existence does not prove that every screen,
Worker path or legacy companion module uses them yet.

The current repository has older identity, curriculum and companion definitions.
A runtime activation PR must inventory and adapt those sources deliberately.
Comments in a new file do not magically repeal working code, despite software's
long tradition of pretending otherwise.

## Identifier separation

Use separate types:

```text
NamedCompanionId = raylene | rylane | cloud | night
PresenceStyleId  = NamedCompanionId | sekret
Internal reasoner = oracle
```

`sekret` may select Se'kret's continuity style, but it must not appear in the
named companion picker. `oracle` may be accepted as an internal or legacy input,
but any visible identity must resolve to `Se'kret`.

## Relationship phase contract

The initial deterministic phase model is:

```text
new         0 durable memories
building    1–9 durable memories
established 10–29 durable memories
deep        30+ durable memories
reflective  at least 10 durable memories, a completed reflection, no unresolved contradiction
```

This is a transparent baseline, not proof that L4 memory exists. Durable memory,
goals, reflection and deletion require their own reviewed Supabase and Worker
implementation with RLS and denial tests.

## Mission evidence

A Control Room mission may be marked verified only when its declared skills and
tests pass. Example:

```text
Mission: Activate the Se'kret visible identity adapter
Required skills:
  bip-repo-truth
  bip-sekret-identity
  bip-companion-lab
  bip-privacy-redteam
  bip-release-gate
```

## Delivery sequence

### PR A — Contracts and skills

- architecture boundary;
- identity contract;
- named-companion versus presence-style types;
- style profiles and deterministic request shaping;
- relationship phase rules;
- agent skills;
- focused contract tests.

No screen wiring, Worker changes, database migrations or Control Room panels.

### PR B — Control Room observers

- five read-only panels;
- founder route integration;
- privacy-safe adapter services;
- redacted identifiers and empty/error states.

### PR C — Runtime activation

- map legacy identity and personality sources into the new contracts;
- use Se'kret for visible Oracle surfaces;
- connect style requests to the real reply pipeline;
- enforce the same identity in text, accessibility, archives and TTS;
- add Companion Lab and identity-leak evaluations.

### PR D — L4 persistence

- `agent_memories`, `agent_goals` and `reflection_runs` migrations;
- consent, provenance, correction, expiry and deletion;
- RLS, anonymous denial and two-user cross-access tests;
- reflection Worker and Control Room read models.

## Non-goals of the contract PR

- no custom MCP server;
- no new model provider;
- no production TTS deployment;
- no durable memory claims;
- no automatic cross-companion memory sharing;
- no direct production database change.
