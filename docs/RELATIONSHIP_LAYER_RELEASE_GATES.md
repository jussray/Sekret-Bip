# Relationship Layer Release Gates

Parent goal: #238  
Phase issue: #239

## Gate 1 — Architecture and contracts

A phase cannot enter implementation until:

- ownership, readers, writers, revocation, deletion, and retention are defined;
- typed request, response, error, and state contracts exist;
- existing tables/services have been audited for reuse;
- the change has an independent feature flag defaulting to disabled;
- analytics payloads use an allowlist that excludes private content.

## Gate 2 — Database and authorization

A schema PR must include:

- versioned migrations;
- explicit RLS enablement;
- policies or narrowly scoped RPCs;
- fixed `search_path` for security-definer functions;
- minimum grants;
- indexes for ownership and authorized-read paths;
- cleanup behavior for unlink, block, revoke, delete, and account deletion;
- fresh-bootstrap verification.

Required authorization test actors where relevant:

- owning teen
- active linked parent
- revoked/unlinked parent
- accepted crew member
- pending crew member
- blocked/removed crew member
- unrelated authenticated user
- unauthenticated user
- service role

## Gate 3 — Worker and AI

An AI-backed feature cannot enter beta until:

- provider secrets remain server-side;
- input is minimized;
- source text is treated as data, not instructions;
- output is structured and schema-validated;
- timeouts and bounded retries exist;
- idempotency prevents duplicate paid work;
- deterministic fallback behavior exists;
- prompt and model versions are recorded;
- logs contain no raw private content;
- token, latency, failure, fallback, and retry metrics are emitted.

## Gate 4 — Client experience

Required client states:

- disabled/unavailable
- loading/processing
- empty
- offline
- failed/retryable
- revoked
- expired
- success

Required UX protections:

- privacy default is visible;
- explicit consent is required;
- destructive/revoke actions are understandable;
- no guilt or surveillance language;
- sensitive information is absent from notification previews;
- accessibility labels and reduced-motion behavior exist;
- low-bandwidth and interrupted-upload behavior is recoverable.

## Gate 5 — Automated quality

Every phase must pass:

- TypeScript strict check;
- unit tests for domain logic;
- Supabase migration and RLS integration tests;
- Expo web export;
- supported iOS and Android builds;
- critical-path Playwright tests where web-compatible;
- secret scanning;
- dependency audit at the project’s accepted severity threshold;
- migration/schema drift check;
- no phantom routes or tab leakage.

## Gate 6 — Internal founder test

Before invited users:

- feature is enabled only for founder/internal accounts;
- at least two real test accounts exercise each role boundary;
- revoke/unlink/block/delete paths are tested manually;
- malformed AI output and provider outage are simulated;
- account deletion during queued work is tested;
- Founder Control Room shows operational failures without private content;
- rollback and kill-switch operation is verified.

## Gate 7 — Invited cohort

Recommended cohort:

- Bridge: up to 20 teen-parent pairs;
- Crew: up to 25 accepted friend pairs;
- Scrapbook: up to 25 private-first users;
- Memory: up to 25 explicit opt-in users.

Required monitoring:

- authorization failures
- revocation latency
- AI failure/fallback/edit rates
- block/report/support complaints
- storage and inference cost
- crash-free sessions
- deletion failures
- misunderstanding or overreach reports

Stop the cohort or disable the feature when:

- cross-account or post-revocation access occurs;
- raw private content reaches logs/analytics/notifications;
- deletion or blocking does not terminate access;
- summary/memory output repeatedly creates harmful false certainty;
- costs exceed the test budget without engagement evidence.

## Gate 8 — Monitored beta

Before beta expansion:

- invited-cohort acceptance criteria pass;
- known issues and support playbook are documented;
- retention/deletion behavior is user-facing;
- cost per successful user outcome is measured;
- feature-specific dashboard and alert thresholds exist;
- privacy policy and consent copy reflect actual behavior;
- rollback migration and app rollback instructions are current.

## Gate 9 — General availability

General availability requires:

- no open critical privacy or authorization bugs;
- stable migration bootstrap;
- acceptable crash and API success rates;
- measured value/retention beyond novelty;
- support load sustainable for the founder/team;
- cost within an approved operating budget;
- security and privacy review of final data flows;
- all feature flags independently reversible.

## Phase-specific acceptance gates

### Bridge Summaries

- parent cannot query raw sources;
- inactive links cannot read summaries;
- revoke removes ordinary access immediately;
- no sensitive notification/email preview;
- malformed AI output uses fallback;
- duplicate requests do not duplicate generation.

### Crew Accountability

- pending/blocked/removed users cannot read support activity;
- rate limits and duplicate suppression work;
- local-date streak logic survives timezone changes;
- no public leaderboard or automatic parent visibility.

### Emotional Scrapbook

- new memory is private by default;
- private media requires authorized short-lived access;
- failed upload cannot appear complete;
- permanent deletion removes storage objects and share references;
- song support does not store lyrics.

### Companion Memory

- memory is disabled until opt-in;
- candidates are not silently approved;
- owner filtering occurs before ranking;
- deleted memory is excluded immediately;
- “forget that” works end to end;
- recaps are not automatically shared with parents.

## Pull request structure

Do not ship the roadmap as one PR. Use separate reviewable PRs for:

1. architecture/contracts/flags
2. schema and RLS
3. Worker/API services
4. teen UI
5. parent or Crew UI
6. analytics/observability
7. tests and operational documentation

Each PR must state:

- feature flag affected;
- migrations added;
- data accessed;
- authorization rules;
- rollback path;
- tests run;
- known limitations;
- expected cost impact.
