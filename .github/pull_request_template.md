## What does this PR do?

<!-- One sentence. Be specific — "Adds memory consent gate to Raylene onboarding" not "Updates memory" -->

## Which invariants does this touch?

- [ ] Safety — teen-facing flows, AI output, content filtering
- [ ] Parent Bridge — visibility, notifications, Circle, child settings
- [ ] Companion Identity — personality, tone, memory behavior
- [ ] Memory Architecture — writes, reads, consent signals, RLS
- [ ] UI Identity — scrapbook aesthetic, design tokens, motion
- [ ] None of the above (platform / infra / docs only)

## Pre-merge checklist

- [ ] `npm run lint` passes locally
- [ ] `npm run type-check` passes locally
- [ ] `npm run test:unit` passes locally
- [ ] Relevant reviewer checklist completed (`tools/checklists/`)
- [ ] No hardcoded credentials, API keys, or PII in the diff
- [ ] Migration is backwards-compatible OR rollback plan is documented below
- [ ] Feature flag used if this change is not ready for all users

## Screenshots or recordings

<!-- Required for any UI change. Drag and drop here. -->

## Rollback plan (if needed)

<!-- How do we undo this if it breaks production? -->
