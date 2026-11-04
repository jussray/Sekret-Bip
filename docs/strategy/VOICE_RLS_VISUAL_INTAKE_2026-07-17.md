# Voice, RLS, and Visual Concept Intake — 2026-07-17

**Repository baseline reviewed:** `b213a116dec378ae3d8334df115b8372841b5dd6`  
**Owner issue:** [#464](https://github.com/jussray/Sekret-Bip/issues/464)  
**Authority:** strategy and design intake only

This document reconciles an uploaded architecture and concept pack against current repository truth. It does **not** authorize runtime, database, deployment, sprint, or launch-scope changes.

## Source pack reviewed

- `bip-engineering-audit-dashboard(1).html`
- `bip-voice-architecture-pack.html`
- `bip-sql-migration-dashboard.html`
- `bip-rls-policy-map-template.csv`
- uploaded Bridge, Pages, Room, Bippin 2, insights, growth, and dashboard concept boards

The source pack is useful as a hypothesis generator. It is not implementation evidence.

## Executive verdict

The strongest idea in the pack is **one shared voice runtime instead of feature-by-feature audio behavior**.

The most important corrections are:

1. Se'kret Bip has a repository-integrated request-response voice path through the canonical Cloudflare Worker. This proves the client and Worker route contracts exist; it does **not** prove that live AI reply, transcription, or synthesis is currently available in production without an exact runtime witness.
2. The repository-integrated voice path is designed to record a complete clip, convert it to base64, transcribe it, generate a reply, and synthesize speech sequentially. Streaming, VAD, endpointing, barge-in, and interruption-safe playback are not yet a shared runtime.
3. `hooks/useVoiceCompanion.ts` and `src/utils/voiceCompanion.ts` currently create a lightweight session/status object. They do not provide capture, transport, VAD, playback, persistence, or recovery orchestration.
4. The proposed Supabase Edge Function WebSocket proxy would introduce a second AI/backend authority. The current sprint explicitly rejects a second backend or deployment authority. Any future realtime relay must preserve the canonical Cloudflare boundary unless the founder approves a deliberate architecture change.
5. The proposed `voice_sessions`, `voice_turns`, `voice_events`, and `voice_latency_metrics` tables do not exist. `docs/RLS_POLICY_AUDIT.md` correctly records them as planned only.
6. A durable raw-transcript column or generic memory `content` blob is not an acceptable default. Voice and memory storage require minimization, provenance, correction, retention, deletion, denial tests, and a real consumer before schema activation.
7. The visual boards are valuable north-star references, but several screens imply unsupported parent visibility, emotional interpretation, health guidance, or dense layouts that require privacy, accessibility, legal, and device red-team review.

## Current repository truth

### Voice runtime today

The canonical client transport is `src/services/backend/sekretClient.ts`:

- `/api/sekret/reply`
- `/api/sekret/transcribe`
- `/api/sekret/voice`
- authenticated headers, timeouts, stable errors, trace IDs, and fallback metadata

`screens/VoiceBipScreen.tsx` currently wires this intended sequence:

1. requests microphone permission;
2. records with Expo AV;
3. stops and unloads the complete recording;
4. converts the local recording to base64;
5. sends it to the Worker transcription route;
6. sends transcript text to the Worker reply route;
7. sends the reply to the Worker voice-synthesis route;
8. stores a lightweight `VoiceNote` reference rather than a full transcript in the screen-level record.

This is a repository-integrated request-response pipeline, not proof of current production availability and not a low-latency conversational stream. Exact production observation, unavailable-voice behavior, and deployment-path verification remain separate evidence gates.

### Voice architecture placeholders

`hooks/useVoiceCompanion.ts` and `src/utils/voiceCompanion.ts` currently expose session identity and a readiness message. The phrase "voice-ready architecture" must not be interpreted as proof of a shared production audio runtime.

`services/sekretVoice.ts` owns companion delivery and language guidance. It is a character-voice contract, not a recorder, transport, playback, or realtime session engine.

### Database truth

`supabase/migrations/` is the only schema authority.

The current RLS audit confirms:

| Table | Current truth |
|---|---|
| `journal_entries` | Exists; RLS enabled; owner-only read/write; linked parents do not receive raw journal rows |
| `bridge_summaries` | Exists; a linked parent may read only the generated summary authorized by an active, unrevoked Bridge share |
| `crew_members` | Exists; RLS enabled; owner-scoped CRUD |
| `parent_circle_posts` | Exists; RLS enabled; authenticated shared-feed read plus owner-scoped writes |
| `voice_sessions` | Does not exist |
| `voice_turns` | Does not exist |
| `voice_events` | Does not exist |
| `voice_latency_metrics` | Does not exist |

The uploaded CSV is therefore a useful checklist template, not a current policy map. Its retired `exists_in_schema_sql` column must not be restored as an authority concept.

## Adopt

These ideas are directionally compatible with the repository and may be promoted through separate founder-approved issues.

### 1. One shared voice runtime contract

Create one reusable runtime boundary for any approved voice surface:

- capture lifecycle;
- permission state;
- recording state;
- endpointing state;
- transcription state;
- reply state;
- playback state;
- interruption and cancellation;
- recoverable failures;
- metadata-safe latency observations.

The first version should wrap the existing request-response path rather than replacing it.

### 2. Interruption-safe playback

Voice playback should have one controller that can stop immediately when the user cancels, navigates away, starts a new recording, or an approved barge-in experiment detects speech.

### 3. Metadata-only latency slices

Useful measurements include:

- permission-to-capture-ready;
- stop-to-upload-start;
- transcription duration;
- reply first response;
- synthesis duration;
- playback-ready duration;
- total turn duration;
- timeout, cancellation, fallback, and unavailable outcomes.

Do not place audio, transcript text, private prompts, names, or broad identifiers in telemetry.

### 4. Client-side endpointing as an experiment

Local VAD may reduce latency and enable interruption behavior. It should be introduced behind a controlled experiment with a manual stop fallback and physical-device evidence.

### 5. Visual north-star qualities

The uploaded boards consistently reinforce useful product qualities:

- character-led emotional worlds rather than generic utility screens;
- dark purple nighttime atmosphere with warm light sources;
- modular cards with strong visual grouping;
- clear private-space cues;
- companion presence that feels embedded in the room;
- progress represented through gentle rituals rather than clinical charts.

These are design signals, not pixel specifications.

## Reframe

### VAD timing values

A 20 ms analysis cadence and roughly 450 ms silence threshold are tuning hypotheses, not product requirements. They must be evaluated across:

- iOS and Android devices;
- quiet and noisy rooms;
- accents, speech rates, pauses, and soft speech;
- Bluetooth and wired audio routes;
- accessibility needs;
- accidental activation and early cutoff rates.

### Realtime transport

The question is not "How do we add a Supabase WebSocket proxy?" The correct question is:

> What is the smallest realtime extension that preserves the canonical Cloudflare Worker authority, authenticated contracts, observability, rollback, and teen privacy?

A second relay is not justified merely because a draft architecture includes one.

### Voice telemetry schema

Four new tables are not automatically required. First determine whether existing metadata-only event infrastructure can support the evidence. If a new durable table is necessary, start with the smallest session/turn metadata contract and no raw transcript field by default.

### Streaming as launch scope

Streaming voice is not currently a public-launch dependency. Phase 3 already requires unavailable-voice, latency, device, accessibility, and failure-state proof. Streaming becomes launch-critical only if the founder includes conversational realtime voice in the launch promise.

### Long-term memory

The engineering dashboard correctly notices that durable continuity is not implemented. It incorrectly treats a generic embedding store and nightly compression as ready implementation direction.

L4 remains a separate gated lane. Any memory record requires:

- teen ownership;
- explicit provenance;
- correction and deletion;
- expiration and retention;
- cross-user, parent, and anonymous denial proof;
- no raw transcript-as-memory default;
- one real user-visible consumer;
- rollout and rollback.

## Reject

The following ideas must not be promoted from the pack without a new architecture or product decision.

### 1. Supabase Edge Function as the default voice relay

This conflicts with the canonical Cloudflare Worker path and the sprint non-goal against a second backend or deployment authority.

### 2. SQL-first voice implementation

Do not create the proposed voice tables before the runtime contract, data-minimization rules, retention, deletion behavior, RLS, denial tests, rollout, rollback, and one consumer are approved together.

### 3. Raw transcript persistence by default

A `voice_turns.transcript` column is not approved. A transcript may be transiently processed for the current turn, but durable storage requires a separately reviewed product purpose and user control.

### 4. Generic memory blobs and automatic extraction

Do not store transcript-derived `content` plus embeddings as a default memory object. This would bypass the current L4 privacy and provenance gates.

### 5. Bridge screens that show raw teen source text to parents

Several visual boards display a direct teen quote and then offer "what they might mean" interpretation. That conflicts with the current Bridge requirement that the parent receives only the approved generated summary unless a separate exact-text share mode is explicitly designed, consented, stored, revoked, and denial-tested.

The product must not infer a teen's hidden meaning as fact. Parent guidance may explain how to respond gently without claiming knowledge of an unshared internal state.

### 6. Health or puberty guidance as launch scope

Bippin 2 concept boards include puberty, body changes, hygiene, sleep, and health-adjacent guidance. These are not automatically launch-ready. They require age-appropriate content ownership, legal and safeguarding review, source quality, accessibility, crisis and medical boundaries, and clear non-diagnostic language.

### 7. Visual density as the default mobile layout

The boards often combine many cards, controls, metrics, illustrations, and long text on one screen. The emotional richness is useful; the density is not a verified mobile pattern. Launch UI must prove readability, touch targets, screen-reader order, motion, small-screen behavior, and reduced cognitive load.

## Visual privacy red-team

### Bridge

Keep:

- warm parent-side room;
- explicit "bridge, not a window" framing;
- response suggestions centered on listening and low pressure;
- relationship progress shown as shared effort, not surveillance.

Change before implementation:

- replace raw teen quotes with a teen-approved privacy-safe summary;
- remove "what they might mean" as an authoritative translation;
- do not expose message history unless each item has a clear share and revocation contract;
- avoid connection scores that imply emotional surveillance or manufacture certainty.

### Pages and companion replies

Keep:

- private-space framing;
- multimodal entry choices;
- companion presence after the teen chooses to engage;
- clear entry organization.

Change before implementation:

- avoid claims such as "only you and Se'kret" unless the exact server, support, safety, and deletion boundaries make that statement true;
- do not generate "insights" that feel like hidden profiling;
- ensure mood tags and reply choices remain optional and do not become inferred durable facts;
- reduce simultaneous controls on small devices.

### Bippin 2 and growth dashboards

Keep:

- age-relevant identity and growth rituals;
- private journals and confidence-building language;
- progress that rewards showing up rather than perfection.

Change before implementation:

- separate identity support from medical or developmental guidance;
- avoid gender-essentialist assumptions;
- do not infer health state from self-checks;
- require evidence owners for every health-adjacent claim;
- keep this outside launch scope until approved.

## Recommended promotion sequence

### Issue A — shared request-response voice runtime contract

Smallest safe first step:

1. inventory current recorder, transcription, reply, synthesis, and playback paths;
2. define one typed state machine around the existing Cloudflare endpoints;
3. centralize cancellation and playback cleanup;
4. add metadata-only timing and failure events;
5. prove current behavior does not regress;
6. do not add WebSockets or database tables yet.

### Issue B — generated RLS policy map

Replace manual unknown/planned CSV cells with a generated artifact sourced from:

- ordered migrations;
- repository authorization baselines;
- live read-only inspection where available;
- executable denial probes.

The generated map should distinguish repository contract, live observation, and unresolved proof rather than pretending one CSV is the authority.

### Issue C — visual design gap matrix

For each selected concept board, record:

- intended user and route;
- emotional goal;
- current implementation owner;
- reusable visual primitives;
- privacy and consent risks;
- accessibility and density risks;
- legal or health-content risks;
- launch phase and whether the idea is in scope.

## Roadmap placement

| Proposal | Current placement |
|---|---|
| Shared request-response voice runtime | Strategy candidate; may support Phase 3 quality proof |
| VAD and barge-in | Controlled experiment after runtime consolidation |
| Realtime streaming voice | Future option; not a launch dependency by default |
| Voice telemetry tables | Blocked pending minimal contract and data-lifecycle review |
| Generated RLS policy map | Supports Phase 1 launch trust spine |
| Visual concept gap matrix | Supports Phase 3 device/accessibility proof and Phase 5 store readiness |
| Bippin 2 health/puberty modules | Future product lane; not launch scope |
| L4 continuity memory | Planned gated lane; unchanged |
| L5 cross-companion synthesis | Blocked behind verified L4; unchanged |

## Decision rule

Nothing in this intake enters `SPRINT.md`, `docs/LAUNCH_ROADMAP.md`, schema, runtime, or deployment merely because it looks polished or technically plausible.

Promotion requires:

1. a founder decision;
2. a numbered issue;
3. an implementation owner;
4. privacy, consent, safety, and deletion boundaries;
5. dependencies and launch placement;
6. measurable acceptance criteria;
7. rollout, rollback, and the correct evidence witness.
