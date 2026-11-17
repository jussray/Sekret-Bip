# Batch 4 — Room Production + Product Design

## Outcome

Land the reviewed living-room product contract and Night production tooling as a focused final batch, with Product Design quality gates tied to the shipped runtime rather than mock-file existence.

## Intended files

- `.github/workflows/playwright.yml`
- `.gitignore`
- `app/(teen)/_layout.tsx`
- `config/leonardo/night-asset-prompt-pack.json`
- `config/room-production.manifest.json`
- `design-handoff/figma/night-room-runtime-blueprint.svg`
- `docs/ROOM_PRODUCTION_ENGINE.md`
- `e2e/rooms/room-contract.spec.ts`
- `package.json` — room scripts and release gate
- `playwright.config.ts` — room-suite isolation
- `playwright.room.config.ts`
- `scripts/room-production-foreman.mjs`
- `test/room-production-contract.test.mjs`

## Product Design gates

- visible teen navigation is exactly Room, Pages, Calm, Circle, More;
- icon glyphs are removed before semantic label comparison;
- feature routes remain hidden from the tab bar without deleting them;
- phone-width overflow is blocked;
- Night’s canonical identity and room geometry remain locked;
- room phases may change lighting and ambience, not furniture geometry;
- companion-room objects remain the interaction model;
- user-room dashboard content does not leak into companion rooms;
- source visuals and runtime paths are mapped explicitly.

## Asset and CI gates

- present PNG/JPEG assets are decoded and validated for format, dimensions, and transparency where required;
- missing generated Night poses use only an explicitly declared, verified canonical fallback;
- any present generated pose must be statically wired into the shipped runtime registry;
- `room:foreman:verify` exits nonzero for invalid or unwired assets;
- interactive mode exits nonzero when blocked before completion;
- room contract tests and `room:foreman:verify` run in CI;
- exact-head Playwright retains report, trace, screenshot, video, and foreman evidence;
- static source checks do not certify runtime behavior without executed browser evidence.

## Explicit exclusions

No automatic Leonardo, Figma, or Canva login; no password, MFA, CAPTCHA, approval, publishing, destructive editor action, merge, deploy, or migration automation. Night actor movement and completed generated pose inventory remain separate implementation work unless real assets and runtime wiring are included and verified.

## Rollback

Revert the focused batch. No external design workspace or production cleanup is required.
