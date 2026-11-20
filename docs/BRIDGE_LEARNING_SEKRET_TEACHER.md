# Bridge Learning — Se'kret Teacher Architecture

## Product truth

Bridge Learning is a consent-controlled shared learning space for one active linked teen and parent. Private Study Buddy activity remains private. Shared learning begins only through an accepted Bridge invitation or an already shared Bridge session.

The operating model is:

```text
Oracle = hidden research, reasoning, verification, misconception detection, and teaching-plan engine
Se'kret = visible teacher, translator, relationship protector, and soul of the learning experience
Companions = optional learning-support styles
Bridge = the permission boundary and shared classroom
```

## Non-negotiable teaching law

Se'kret starts with the clearest explanation likely to land. Internally the system may use ELI5- and ELI10-style strategies, but those labels are never shown to users and are never stored as age, intelligence, grade, or ability judgments.

Visible actions use respectful language:

- Explain that another way
- Break it down more
- Show me an example
- Why does that work?
- I understand — next step
- Let me try
- Teach us together

Se'kret assumes the explanation has not found the right doorway yet. She does not assume the learner is slow.

## Shared stumped loop

```text
Teen gets stuck
→ may request a hint
→ may ping the parent
→ may invite Se'kret

Parent gets stuck
→ may ping the teen
→ may invite Se'kret

Both are stuck
→ either participant may select Teach us together
→ Se'kret enters as teacher
```

Se'kret may suggest a ping, but she may never send one without the sender confirming it.

Lock-screen notification copy must not expose the subject, question, grade, answer, mistake, source document, or private-study history.

## Teaching sequence

1. Identify the exact missing concept.
2. Give one plain explanation.
3. Change the teaching strategy if it does not land; do not merely shorten the same wording.
4. Show one worked example.
5. Give the teen a turn.
6. Give the parent a turn when both are present.
7. Ask for a small teach-back.
8. Introduce formal school terminology only after the concept is understood.
9. Save only the shared-session recap allowed by the session policy.

## Oracle requirements

Oracle must be broad, culturally literate, source-grounded, and honest about uncertainty. It must be able to:

- reason across school subjects;
- retrieve and cite approved sources;
- detect misconceptions;
- produce multiple explanation strategies;
- distinguish verified fact from interpretation;
- understand dialect without treating dialect as lower ability;
- avoid cultural stereotypes;
- adapt examples without forcing slang or identity assumptions;
- abstain and recommend outside help when confidence is insufficient.

Oracle does not speak to the user. It returns a structured teaching packet. Se'kret turns that packet into a humane lesson.

## Privacy boundary

Bridge Learning may read only:

- the active `parent_links` relationship required for authorization;
- content created inside the shared Bridge Learning session;
- sources explicitly attached to that shared session;
- approved curriculum/reference material needed for the lesson.

Bridge Learning may not read automatically:

- private Study Buddy conversations;
- private wrong answers or practice history;
- journals or emotional companion chats;
- unshared uploads;
- Circle content;
- hidden emotional-memory records;
- report cards or school identifiers.

Revoking the parent link or the session ends ordinary shared access immediately.

## Release gates

The feature remains `internal` until all of the following pass:

- versioned Supabase migration;
- RLS tests for teen, linked parent, unlinked parent, stranger, revoked link, and service role;
- Worker authentication and active-link checks;
- source-grounding and answer-shape validation;
- uncertainty and outside-help behavior;
- lock-screen notification privacy tests;
- teen and parent route tests;
- no private-study or journal access paths;
- accessibility and screen-reader checks;
- Playwright coverage for invite, ping, both-stumped, teach-back, revoke, and expiry flows;
- founder review before merge;
- separate founder approval before deployment.

## Implementation slices

1. Contracts, feature flag, threat boundary, and pure state machine.
2. Schema, RPCs, RLS, retention, revocation, and tests.
3. Teen and parent Bridge UI with invitations and pings.
4. Oracle teaching endpoint, grounding, verification, and Se'kret rendering.
5. Notifications, shared recaps, accessibility, and offline/error states.
6. Full CI, Playwright, cost controls, red-team review, and staged rollout.

Only slice 1 exists in the repository today (`src/features/bridgeLearning/types.ts`,
`src/features/bridgeLearning/teachingPolicy.ts`). Slices 2-6 have not started.

## Oracle grounding design (planned, slice 4 — not implemented)

Design only. No Worker route, secret, schema, or grounding call exists yet.
`OracleTeachingPacket.sources: GroundedSource[]` (`src/features/bridgeLearning/types.ts`)
is currently an unpopulated contract shape. This section records the intended
approach for when slice 4 starts, so a future session does not have to
rediscover it, and so it is never mistaken for shipped capability in the
meantime — see `implementation-ledger.json`'s `bridge-learning-oracle-grounding`
entry, status `planned`.

Candidate approach, once slices 2-3 exist to build against:

- **Server-side only.** A Worker route parallel to `worker/sekret-reply.ts`'s
  existing OpenAI call issues the grounding query; the client never calls a
  search provider directly. Any API key is a Worker secret, handled under the
  same rules as `OPENAI_API_KEY` in `docs/OPENAI_COMPANION_RUNTIME.md`: never
  in Expo/React Native bundles, committed env files, logs, or telemetry.
- **Query minimization.** The grounding query may carry only the shared
  session's `subject`, `topic`, and the specific step being taught — never
  private Study Buddy history, journal content, or anything outside the
  Bridge Learning session, per this document's privacy boundary above.
- **Source-type mapping.** `GroundedSource.sourceType` is `'user_source' |
  'approved_curriculum' | 'reference'`. A search-grounded citation can only
  ever populate `'reference'`; it is never eligible to be written as
  `'approved_curriculum'` (a separate, founder-curated set) or `'user_source'`.
- **Abstain over fabricate.** When grounding returns no citable, on-topic
  source, the packet must set `needsOutsideHelp: true` with a correspondingly
  low `confidence` rather than a citation-shaped guess. This is the literal
  test of the "abstain and recommend outside help when confidence is
  insufficient" requirement above.
- **A scoped usage boundary, separate from `PERPLEXITY.md`.** The repository's
  existing `PERPLEXITY.md` governs Se'kret Bip creative-IP and world-building
  research; it does not cover engineering-time grounding calls for a
  teen-facing educational feature. Slice 4 needs its own boundary at minimum
  covering source/domain suitability for K-12 education and exclusion of
  unmoderated web/forum content, before any real query is issued.

Before this can leave `planned` status: a fabricated-citation negative test, an
abstain-on-low-confidence test, and a source-type-mapping test, in addition to
the Worker-authentication, active-link, and privacy-boundary tests slices 2-3
already require.
