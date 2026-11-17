# Se'kret Bip Companion Engine — Canonical Design

Status: **Design-first per issue #137. No broad implementation changes here.**

This is the shared design for Raylene, Rylane, Cloud, Night, and
Oracle/Se'kret. It documents the engine as it exists today
(`src/features/sekret/companionEngine.ts`) and defines the contract future
work must hold to. For durable memory specifically, this document defers to
`docs/AGENT_L4_ARCHITECTURE.md`, which already covers that ground in depth —
it is not repeated here.

## Shared interaction contract

Every companion, on every surface, goes through one entry point:
`sendCompanionMessage(CompanionReplyInput): Promise<CompanionReplyResult>`.
This is already true and must stay true — no screen should call
`fetchSekretBrainReply` or a legacy `sekretCompanion*` helper directly.

```
CompanionReplyInput  { companionId, surface, text, mood?, history?,
                        parentSharingEnabled?, teenGender?, oracleContext?,
                        userName?, displayName?, profileName? }
CompanionReplyResult { reply, safetyFlag, avatarState, tone,
                        parentShareSummary, suggestedComfortTool }
```

Rules that follow from this contract:

- `surface` (`chat` | `journal` | `voiceBip` | `comfort` | `circle` |
  `parentBridge` | `selfDiscovery` | `pages`) is the one required piece of
  context distinguishing where a message came from; new surfaces are added
  here and mapped in `toBackendSurface()`, never hardcoded per-screen.
- `sendCompanionMessage` emits `companion_message` (via `emitEvent`)
  *before* the network call, so the activity/point ledger and streak logic
  record the interaction even if the AI backend is down — this ordering is
  intentional, keep it.
- The function never throws; a failed backend call must resolve to a
  fallback reply (see Fallback behavior), not a rejected promise a screen
  has to catch.

## Character-specific tone and behavior

Identity lives in `COMPANION_CURRICULUM` (`src/config/companionCurriculum.ts`)
and is surfaced through `COMPANION_PROFILES` in the engine — this is the
single source of truth for name/emoji/title/vibe/greeting/accent color.
Screens must read from `COMPANION_PROFILES`/`COMPANION_CURRICULUM`, never
duplicate a companion's tone or greeting text locally.

| Companion | Role | Vibe |
|---|---|---|
| Raylene | Soft Big Sis | Warm, expressive, protective, real |
| Rylane | Loyal Bro | Quiet loyalty, keeps it real, never talks down |
| Cloud | Quiet Observer | Notices, waits, rarely pushes |
| Night | The Light Left On | Late-night builder, future-focused, honest |
| Oracle (Se'kret) | Inner Oracle | Reflects patterns back, not a peer voice |

Oracle is architecturally distinct from the other four (see Voice response
flow) — it is a reflection layer over a teen's own patterns, not a fifth
"friend" with its own independent personality arc. Keep that asymmetry
explicit in any future memory or tone work rather than normalizing Oracle
into the same shape as the other companions.

## Memory layers

Deferred to `docs/AGENT_L4_ARCHITECTURE.md`. Summary for this document's
purposes: current state is **L2** (stateless call + client-passed `history`
array); the recommended path to **L3** is Supabase `pgvector`, not a
third-party memory vendor, per Bip's COPPA subprocessor constraint. Any
change to memory architecture should update that document, not this one.

## Room, journal, voice, calm, bridge, and circle context

Each surface passes companion context through the same `CompanionSurface`
enum rather than bespoke per-screen wiring:

- **Room**: ambient presence, not chat — uses `getPresenceMessage()`, which
  branches Oracle to a distinct late-night/ready-when-you-are pair and
  routes the other four through `buildSekretPresence()`.
- **Journal / Pages**: `surface: 'journal'` or `'pages'` (both map to the
  backend's `journal` surface — Pages has no separate backend contract yet;
  if Pages' companion behavior ever needs to diverge from Journal's, that's
  the point to add a real backend surface rather than continuing to alias).
- **Voice Bip**: `surface: 'voiceBip'` — see Voice response flow below.
- **Calm/Comfort**: `surface: 'comfort'`.
- **Bridge**: `surface: 'parentBridge'` — the one surface where
  `parentSharingEnabled` and `parentShareSummary` in the result are load
  bearing; every other surface should treat those fields as unused.
- **Circle**: `surface: 'circle'` — companion acts as a posting helper, not
  a visible participant in the public feed.

## Avatar states

`SekretAvatarState` (re-exported from `@/utils/api`) is returned on every
reply and is the single source for what pose/expression a companion
renders — screens must not derive avatar state from reply text themselves.
Avatar assets follow the companion pipeline
(`docs/COMPANION_PIPELINE.md`) and its `getTeenCompanionAsset()` fallback
chain (pose → neutral → `null`), so a missing pose asset never crashes a
screen; the engine and the asset pipeline are two independent fallback
layers and both must stay defensive.

## Voice response flow

Per `docs/MVP_PRIVACY_CONTRACT.md` §6, only Raylene, Rylane, Cloud, and
Night are AI **voice** companions. Oracle/Se'kret (and `me`/unknown/fallback
entry types) must never:

- receive a companion voice ID,
- show a "hear this" TTS control,
- call the companion reply or voice endpoints as if it were one of the four
  voiced characters.

This means any future voice-response work in the engine must branch on
`companionId !== 'sekret'` before offering TTS, and that branch belongs in
the engine layer (so every surface inherits it), not duplicated per screen.

## Fallback behavior

Already implemented, must be preserved as behavior evolves:

- Network/backend failure → `sendCompanionMessage` still emits the local
  event and must resolve with a soft, in-character fallback reply rather
  than surfacing an error string as if the companion said it.
- Unknown/legacy companion keys are normalized via `toCompanionId()`
  (wraps `normalizeSekretCharacter`) before anything else touches them —
  `'soft'` → `raylene`, `'oracle'` → `sekret`, etc. New legacy aliases
  should be added there, not with ad hoc string checks at call sites.
- Missing avatar asset → asset pipeline fallback (above), independent of
  reply fallback.

## Migration from current implementations

The engine already consolidated four prior entry points
(`api.ts`/`sekretCompanion.ts`/`sekretCompanionReply.ts`/`sekretReply.ts`)
into one. Remaining migration work:

1. Audit for any screen still importing those legacy files directly
   (`grep -r "sekretCompanionReply\|sekretReply" screens/ src/ app/`) and
   route them through `companionEngine.ts`.
2. Pages' aliasing of `pages` → backend `journal` surface (above) should
   either get its own backend surface or be documented as permanently
   aliased — leaving it silently aliased without a decision recorded is
   the kind of drift `docs/SCREEN_PURPOSE_AUDIT.md`-style audits exist to
   catch.
3. Any future Oracle-specific memory work (self-discovery pattern
   reflection) should build on the L3 `pgvector` plan in
   `AGENT_L4_ARCHITECTURE.md` rather than a bespoke Oracle-only store.

## Required tests

- Unit: `toCompanionId()` alias table (every legacy key currently in use
  resolves correctly), `toBackendSurface()` mapping completeness (every
  `CompanionSurface` value maps to a valid backend surface).
- Unit: `isSafetyTrigger()` against the crisis-phrase list — this is a
  client-side tier-1 check backing a safety flow, regressions here are a
  safety-severity bug, not a cosmetic one.
- Integration: `sendCompanionMessage` resolves with a fallback (never
  throws, never returns an empty/undefined `reply`) when
  `fetchSekretBrainReply` rejects.
- Integration: voice affordance is never offered for `companionId ===
  'sekret'` or any non-voice entry type, across every surface that renders
  a "hear this" control.
- Regression: `COMPANION_PROFILES` and `COMPANION_CURRICULUM` stay in sync
  — a companion added to one but not the other should fail a test, not
  surface as a runtime `undefined` greeting.
