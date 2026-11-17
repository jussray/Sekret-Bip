# Bip Control Room

Bip already has a founder-only Control Room UI at `src/screens/DevControlRoomWorkspace.tsx`. This document covers the local verification engine that feeds that existing system when GitHub-hosted Actions minutes are exhausted or unavailable.

## Why this exists

GitHub Actions is useful, but it should not be the only engineering gate. When the account has no hosted-runner minutes left, jobs can be created but fail before a runner starts.

The local Control Room path lets daily development continue without paid GitHub Actions minutes.

## Live mission execution from the Control Room

Start the founder workspace with one command:

```bash
npm run control-room:dev
```

This starts Expo web and an authenticated local mission server together. Open the founder Control Room, choose **Missions**, and use **Run** on an enabled mission.

The same founder-only route also contains **Founder Operator**, which converts one mission into a 5W1H artifact plan. Its authenticated persistence endpoint stores versioned plan history under the fixed `reports/control-room/founder-operator/` boundary; it is not a dynamic command runner. The server rejects unverified exact-head or deployed claims, approval-gated artifacts marked verified without an external reconciler, secret-bearing or private fields, invalid artifact paths, and symlinked report targets. See `CONTROL_ROOM_FOUNDER_OPERATOR.md` for the full truth and authority contract.

The UI currently executes these allowlisted local missions:

- Continue Yesterday
- Verify Local
- Verify Frontend
- Recover System

Launch Bip is performed by the combined `control-room:dev` command itself. Ship Release intentionally remains a manual gate: a browser button cannot merge, deploy, or claim production readiness.

The execution boundary is deliberately narrow:

- the server binds only to `127.0.0.1`;
- every launch creates a new random token;
- only localhost origins and bearer-authenticated requests are accepted;
- the server invokes fixed mission IDs, never arbitrary shell input;
- only one mission runs at a time;
- missions time out, terminate their full descendant process tree, and keep the mission slot locked through forced termination;
- stopping the local server force-terminates any active detached mission tree;
- mission output returned to the UI remains bounded;
- the token is local-development state and must never be reused as a production credential.

Starting Expo with `npm run web` alone leaves mission buttons offline by design. Use `npm run control-room:dev` when live local execution is required.

## Local verification

Run:

```bash
npm run verify:local
```

This executes the repo's existing checks and writes:

```text
reports/control-room/latest.json
reports/control-room/latest.md
```

The verifier currently covers:

- runtime assets
- Control Room structure
- Supabase RLS
- companion assets
- TypeScript
- lint
- unit tests
- voice intelligence
- Oracle discovery
- room archives

If the report says `Push safe: yes`, the branch passed the required local checks. If it says `Push safe: no`, open `reports/control-room/latest.md` and fix the listed failure.

## Browser verification with Playwright

Run:

```bash
npm run control-room:mission:verify-frontend
```

The `verify-frontend` mission is allowlisted in the local Control Room agent. It runs the repository's Playwright smoke suite against the local Expo web build when both `@playwright/test` and a Chromium executable are available.

It writes:

```text
reports/control-room/frontend.json
reports/control-room/frontend.md
reports/control-room/playwright/<run-id>/results.json
reports/control-room/playwright/<run-id>/html/
reports/control-room/playwright/<run-id>/test-results/
```

The Playwright command uses the repository configuration rather than overriding reporters on the command line. Each real browser run therefore retains JSON counts, the HTML report, and failure traces/screenshots/videos in one timestamped Control Room artifact directory.

The report includes an explicit `browserProof` field and an evidence level:

- `browser` means Playwright actually ran and passed.
- `non-browser-fallback` means Playwright could not run and the mission used `npm run verify:local` instead.

A passing fallback is useful local evidence, but it must never be described as Playwright or browser proof. The mission records that distinction so Control Room cannot silently downgrade the verification claim.

## Publish failures into the existing founder Control Room

The app's Control Room reads Supabase-backed audit events and issues. A local JSON file alone is not visible to the app.

To publish failed checks into the existing Control Room, first configure these values in the local shell or Codespace secret store:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Then run:

```bash
npm run verify:local:ingest
```

This command:

1. runs the local verification suite
2. reads the generated report
3. publishes only failed checks into `audit_events`
4. upserts matching `control_room_issues`

The existing founder Control Room can then display those failures under its current Issues workflow.

Ingestion is deliberately opt-in. `scripts/control-room-ingest-local-report.mjs` refuses to run unless `CONTROL_ROOM_INGEST=1` is set by the npm command.

## Relationship to GitHub Actions

Recommended split while hosted minutes are unavailable:

- local Control Room for daily verification
- existing founder Control Room for issue review and operating history
- GitHub Actions only for release candidates, final PR verification, or deployment confirmation when minutes become available

## Secret rules

- Never commit `SUPABASE_SERVICE_ROLE_KEY`.
- Store it only in a local/Codespace secret manager.
- Never put a GitHub PAT in React Native, Expo public variables, report files, or app code.
- Never put OpenAI API keys in app code or reports.
- Never use real teen private content as test or audit fixtures.
- Local ingestion may create audit records and Control Room issues, but it does not merge, deploy, or rewrite production configuration.

## OODA model

### Observe

Run real repository checks locally.

### Orient

Group failures by app, companions, Supabase, voice, Oracle, assets, tests, and code quality.

### Decide

Mark the branch push-safe or blocked.

### Act

Fix the highest-impact failure, rerun locally, and optionally ingest unresolved failures into the existing founder Control Room.

## MCP direction

The existing Control Room can later coordinate read-only connectors for GitHub, Supabase, Cloudflare, Expo/EAS, Companion Lab, and local execution. Suggested fixes, PR creation, merging, and deployment should remain separate permission levels requiring explicit approval.

## Repo placement rule

The Control Room has one founder entry:

```text
app/(dev)/control-room.tsx -> src/screens/DevControlRoomScreen.tsx
```

Build new Control Room capability only in the existing screen/workspace and approved support folders:

- `src/screens/DevControlRoomScreen.tsx`
- `src/screens/DevControlRoomWorkspace.tsx`
- `src/features/control-room/` when UI needs component splits
- `src/services/controlRoom*`
- `src/config/controlRoom*`
- `src/types/controlRoom*`
- `scripts/control-room-*.mjs` and `scripts/control-room-agent.mjs`
- `docs/CONTROL_ROOM*.md`

Do not create `control-room/`, `apps/control-room/`, `founder-os/`, `operations-center/`, new dashboard routes, or a standalone app unless explicitly approved later.

The structural scan enforces the highest-risk parts of this rule by failing on known parallel Control Room roots and by checking that `app/(dev)/control-room.tsx` still exports the existing founder screen.

## Control Room OS V1

Control Room OS V1 is the founder operating layer for shipping Bip. Bip remains the first product; Control Room exists to make launching, observing, testing, recovering, and improving Bip faster and safer.

### Mission Engine

The mission engine is scaffolded in `src/config/controlRoomOs.ts` and `src/services/controlRoomMissionEngine.ts`. It defines the founder's morning actions as missions instead of terminal commands:

- Launch Bip
- Continue Yesterday
- Verify Local
- Verify Frontend
- Ship Release
- Recover System

The existing founder dashboard renders these missions inside `src/screens/DevControlRoomWorkspace.tsx` so the founder does not need a second dashboard or a standalone operations app.

### Worker and connector registries

Workers and connectors are registries, not hardcoded single points of failure. V1 includes local-first workers and provider connectors with explicit fallback notes for GitHub, Supabase, Expo, Gmail, Playwright, and the filesystem.

GitHub remains project memory and source of truth, but local git and local reports keep execution unblocked when hosted services fail.

### Local Agent

The local agent lives at `scripts/control-room-agent.mjs` and only runs allowlisted missions. It intentionally rejects arbitrary shell passthrough.

Allowed local missions include:

```bash
npm run control-room:agent -- --help
npm run control-room:mission:launch-bip
npm run control-room:mission:verify-local
npm run control-room:mission:verify-frontend
```

Remote access must stay authenticated before this becomes anything other than a localhost/default local process.

### Founder notifications

Gmail is treated as a connector for mission reports, failure alerts, daily briefings, release summaries, and founder notifications. The configured destination is `sekretbip@gmail.com`.
