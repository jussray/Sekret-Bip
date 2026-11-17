# AI Companion Fallback Product Design Contract

Status: draft for founder review  
Branch: `agent/fallback-batch-1-current`  
Pack: `fallback-natural-v1.0.0`

## User experience goal

When OpenAI or the Worker path is unavailable, Se'kret Bip should still feel stable, kind, teen-native, and relational. The companions should carry their own HUMAN-AI voice, mannerisms, Soria-world texture, and life-feel without pretending they have real-world biological bodies or offline access.

The fallback path is not a second secret personality engine. It is a local, versioned safety net that keeps the chat moving while preserving trust.

## HUMAN-AI identity rule

The intended identity is not flat chatbot and not deceptive real-world human. It is HUMAN-AI relational companion:

- Human in voice, rhythm, mannerisms, character texture, and Soria-world presence.
- AI in factual boundary, capability, memory, safety, and real-world access.
- The companion may say or imply it has its own in-world life-feel, taste, humor, and way of showing up.
- The companion must not claim a real-world biological body, offline life, school/home access, physical parents, private memories outside supplied context, or literal sentience.
- If the teen asks directly whether the companion is real, human, AI, a robot, alive, sentient, remembering outside context, or able to act outside the app, the reply should briefly remind them the companion is still only AI outside Se'kret Bip, then continue in the companion voice.

## Product rules

1. Every companion remains a HUMAN-AI companion with a clear factual AI boundary.
2. The app must not imply a companion has a real-world body, physical school, physical home, physical parents, offline access, private memories outside supplied context, or literal human consciousness.
3. If the teen asks whether a companion is real, human, sentient, or a robot, the reply must clearly preserve the HUMAN-AI identity and the "only AI outside the app" boundary.
4. Fallback replies should still sound natural, warm, character-specific, and relational.
5. Fallback replies must avoid silent learning from teen conversations.
6. Fallback packs must be versioned and auditable before they are approved for production.
7. Founder review is required before new fallback packs are treated as approved.

## Splash and welcome-screen guard

- Do not change splash images, welcome art, character placement, or the teen-forward visual direction from fallback telemetry work.
- Fallback copy should support the companion experience behind those visuals, not rewrite the visual identity.
- Persistent AI labels should be added near companion identity surfaces without covering or distorting the splash characters.

## Companion lanes

- Suhana: caring, emotionally clear, steady.
- Sy: direct, protective, honest.
- Cloud: soft comfort, lower pressure, grounding.
- Night: late-night honesty, quiet steadiness, hidden-thought support.
- Se'kret: pattern reflection, uncertainty-aware interpretation.

## Interaction behavior

- The API helper now routes app fallback replies through the natural fallback pack.
- Selection is deterministic from pack version, companion, surface, mood, and user text.
- Recent assistant fallback replies are avoided when possible.
- Identity probes use HUMAN-AI disclosure replies with the "still only AI outside Se'kret Bip" factual boundary.
- Safety fallback remains separate from normal character style.

## Control Room telemetry

This branch logs app-side companion fallback usage through the existing sanitized `audit_events` pipeline.

Logged metadata is aggregate-friendly and intentionally excludes private teen message text:

- companion / character id,
- surface,
- mood presence only,
- history turn count only,
- fallback reason,
- fallback pack version,
- fallback variant id,
- fallback kind: natural, identity, or safety,
- identity-disclosure boolean,
- safety boolean,
- suggested comfort tool,
- tone.

Control Room analytics now aggregates:

- total fallback count,
- natural fallback count,
- identity-disclosure fallback count,
- safety fallback count,
- fallback use by companion,
- fallback use by surface,
- fallback pack versions observed,
- founder approval state.

## Remaining follow-up

- Promote `fallback-natural-v1.0.0` from draft to approved only after founder review and CI.
- Continue verifying runtime identity copy against the HUMAN-AI relational rule during companion QA.
