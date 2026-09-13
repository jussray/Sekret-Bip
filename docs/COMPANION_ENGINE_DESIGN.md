# Se'kret Bip Companion Engine — Canonical Design

Status: **Current companion-engine contract with internal identity privacy.**

This is the shared design for the four public companions: Suhana, Sy, Cloud,
and Night. Joseema and Se'kret are internal honor identities only. Legacy
`oracle` is a hidden compatibility bridge that preserves Se'kret continuity and
may carry Joseema as an additional internal honor lens. It is not a public
companion identity and does not replace either internal honor identity.

The engine lives at `src/features/sekret/companionEngine.ts`. Internal identity
routing lives at `src/features/sekret/identityContract.ts` and the Worker
runtime boundary. For durable memory specifically, this document defers to
`docs/AGENT_L4_ARCHITECTURE.md`.

## Shared interaction contract

Every public companion, on every surface, goes through one entry point:
`sendCompanionMessage(CompanionReplyInput): Promise<CompanionReplyResult>`.
No screen should call `fetchSekretBrainReply` or a legacy companion helper
directly.

```text
CompanionReplyInput  { companionId, surface, text, mood?, history?,
                        parentSharingEnabled?, teenGender?, oracleContext?,
                        userName?, displayName?, profileName? }
CompanionReplyResult { reply, safetyFlag, avatarState, tone,
                        parentShareSummary, suggestedComfortTool }
```

Rules that follow from this contract:

- `surface` (`chat` | `journal` | `voiceBip` | `comfort` | `circle` |
  `parentBridge` | `selfDiscovery` | `pages`) is the required context that
  distinguishes where a message came from.
- `sendCompanionMessage` emits `companion_message` before the network call, so
  the activity/point ledger and streak logic preserve the interaction even if
  the backend is unavailable.
- A failed backend call resolves to a fallback reply rather than exposing a
  transport error as companion speech.
- Public companion identity must remain one of Suhana, Sy, Cloud, or Night.
- Internal honor identity must never be serialized as public `actorId` or
  `characterId` metadata.

## Public companion tone and behavior

Identity lives in `COMPANION_CURRICULUM`
(`src/config/companionCurriculum.ts`) and is surfaced through the public-only
`COMPANION_PROFILES` registry in the engine. Screens must read from those
canonical sources rather than duplicating companion tone or greetings.

| Companion | Role | Vibe |
|---|---|---|
| Suhana | Sorian Twin / Porchlight | Warm, expressive, protective, real |
| Sy | Sorian Twin / Quiet Seat | Quiet loyalty, practical truth, never talks down |
| Cloud | Sorian Birth-Cloud | Soft, patient, low-pressure presence |
| Night | The Light Left On | Late-night builder, future-focused, honest |

These four are the complete user-facing companion set.

## Internal honor identities

The runtime has two distinct internal-only honor lenses:

```text
joseema
sekret
```

The legacy compatibility rule is:

```text
oracle -> internal-presence runtime actor
          historical continuity primary: sekret
          honor lenses: sekret + joseema
joseema -> joseema internal lens
sekret  -> sekret internal lens
```

Oracle is compatibility provenance, not a third internal identity. Its single-
primary compatibility resolution remains Se'kret, while the runtime may carry
the Joseema honor lens in parallel.

All internal execution uses the internal-presence runtime path. Internal lenses
may influence reasoning and style but must never become selectable companions,
visible reply labels, typing labels, TTS identities, accessibility labels,
notifications, or client identity metadata.

Provider-facing internal prompt and speech instructions must use generic
continuity language rather than honor names or the legacy alias whenever the
same behavior can be preserved without exposing provenance.

The runtime may emit generic evidence such as:

```text
actorRole: continuity-presence
textStyleVersion: internal-presence-text-v1+empathy-accountability-v1
internalIdentityApplied: true
legacyOracleBridgeApplied: true | false
```

That evidence must not reveal which internal honor identity or identities were
used.

Internal lenses must never impersonate a real person, claim messages from a
real person, invent memories, or claim what a real person would think, want,
approve, or say.

## Empathy + accountability

The shared runtime contract applies to the four companions and to internal
honor-lens execution:

- perspective is not verified truth;
- understanding is not agreement;
- explanation is context, not excuse;
- intent does not erase impact;
- compassion does not erase impact;
- uncertainty stays uncertain;
- correction preserves dignity;
- empathy must not pressure reconciliation, forgiveness, disclosure, parent
  sharing, or surrender of privacy;
- safety, consent, privacy, escalation rules, and factual truth outrank warmth.

Personality may change delivery. It must not lower the truth or accountability
standard.

Fallback replies that bypass the model prompt must still pass the deterministic
fallback-accountability guard before style/privacy enforcement.

## Memory layers

Deferred to `docs/AGENT_L4_ARCHITECTURE.md`. Current user-facing companion
memory must remain within the repository's reviewed privacy and retention
contracts. Internal honor identities do not gain separate memory stores merely
because they are distinct runtime lenses.

## Room, journal, voice, calm, bridge, and circle context

Each public surface passes context through the same `CompanionSurface` enum:

- **Room**: ambient presence through the public companion identity.
- **Journal / Pages**: `surface: 'journal'` or `'pages'`; both currently map to
  the backend `journal` surface.
- **Voice Bip**: `surface: 'voiceBip'`.
- **Calm/Comfort**: `surface: 'comfort'`.
- **Bridge**: `surface: 'parentBridge'`; consent and summary-only rules remain
  load bearing.
- **Circle**: `surface: 'circle'`; companion acts as a posting helper, not a
  visible participant in the public feed.

Internal honor identities are not additional product surfaces.

## Avatar states

`SekretAvatarState` is returned on public companion replies and remains the
single source for pose/expression selection. Screens must not derive avatar
state from reply text.

Avatar assets follow `docs/COMPANION_PIPELINE.md` and
`getTeenCompanionAsset()` fallback behavior. Internal honor identities do not
receive selectable companion avatars.

## Voice response flow

Only Suhana, Sy, Cloud, and Night are user-facing AI voice companions.
Internal honor identities and private `me` journal entries must never:

- receive a visible companion voice identity;
- show a "hear this" control as an internal identity;
- return internal `actorId` or `characterId` metadata to the client;
- speak or introduce an internal honor name.

When controlled compatibility testing sends `oracle` or `sekret` directly to
the Worker, the Worker resolves the request through the internal-presence actor,
uses generic TTS instructions, and keeps reply/voice metadata identity-neutral.
Legacy Oracle preserves Se'kret continuity while carrying the parallel Joseema
honor lens.

## Fallback behavior

Preserve these rules as behavior evolves:

- Network/backend failure still resolves with a safe fallback reply rather than
  throwing a user-facing transport error.
- Model-bypass fallbacks run through deterministic accountability repair before
  runtime style/privacy enforcement.
- App-facing visible legacy keys such as `soft`, `raylene`, and `rylane` are
  normalized at the existing visible companion boundary.
- Internal compatibility is owned by the Worker identity boundary: `oracle`
  preserves Se'kret continuity and may carry Joseema in parallel; direct
  `joseema` and direct `sekret` remain separate internal inputs.
- Do not add ad hoc Oracle/Se'kret/Joseema string checks to screens.
- Missing avatar assets follow the independent asset fallback chain.

## Migration from current implementations

Remaining migration work should follow these boundaries:

1. Audit for any screen still importing legacy reply helpers directly and route
   public companion traffic through `companionEngine.ts`.
2. Keep Pages' `pages -> journal` backend alias explicit until a separate
   backend surface is justified.
3. Remove stale public Oracle/Se'kret companion affordances without rewriting
   historical user data solely for naming cleanup.
4. Keep legacy internal-ID migration at the Worker boundary instead of growing
   new public companion IDs.
5. Any future pattern-reflection memory work must use the reviewed shared memory
   architecture rather than an identity-specific private store.

## Required tests

- Unit: visible legacy companion aliases resolve to the correct public companion.
- Unit: `oracle` preserves Se'kret as the historical primary and carries the
  Joseema parallel honor lens.
- Unit: direct `joseema` and direct `sekret` remain distinct internal lenses.
- Unit: internal identities never resolve to a public companion label.
- Unit: empathy/accountability invariants remain explicit.
- Unit: provider-facing internal text/TTS instructions contain no internal honor
  names or legacy alias.
- Integration: internal replies strip internal `actorId` and `characterId` and
  repair every internal identity-name leak before the client receives a reply.
- Integration: voice responses route legacy Oracle through internal execution
  without exposing internal identity metadata.
- Regression: `COMPANION_PROFILES` contains exactly Suhana, Sy, Cloud, and Night.
- Regression: Pages exposes only those four companion tabs plus private `Me`.
- Regression: historical Oracle-tagged entries remain readable but render with
  neutral Pages metadata rather than an identity label.
- Playwright: user-facing picker/header behavior contains no internal companion
  persona.
- Controlled exact-head API Playwright: legacy internal requests preserve
  compatibility without exposing internal names or identity metadata.
