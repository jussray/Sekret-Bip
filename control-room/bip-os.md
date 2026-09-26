# Bip Engineering Operating System — v1.0

## Overview

The Bip Engineering OS is a curated collection of architectural rules, reviewer checklists, PR gates, CI/CD workflows, and governance roles tuned specifically for Se'kret Bip. Its purpose is to prevent architectural drift, enforce product identity across all features, and accelerate delivery by replacing ad-hoc decisions with a shared playbook.

This document is the living constitution for all engineering work on Se'kret Bip.

---

## Part 1 — Architecture Constitution

Every feature, PR, and architectural decision must satisfy these invariants. These are non-negotiable and apply to all contributors.

### 1.1 — The Five Invariants

| # | Invariant | What it means |
|---|-----------|---------------|
| 1 | **Safety First** | Every teen-facing flow must pass a safety review before merging. No feature ships that could expose a minor to unmoderated content, unreviewed AI output, or a broken parent-bridge path. |
| 2 | **Parent Bridge Integrity** | Any change that touches parent visibility, notifications, Circle access, or child account settings requires an explicit policy check against the Parent Bridge spec. |
| 3 | **Companion Identity Lock** | Raylene, Rylane, Night, Cloud, and all Bip Crew members have fixed personality contracts. AI prompt changes, tone changes, or memory-behavior changes require companion review sign-off. |
| 4 | **Memory Safety** | No raw user memory is written to any external system without explicit consent signals and RLS enforcement. Memory architecture changes require a dedicated review. |
| 5 | **UI Identity** | The scrapbook aesthetic, type treatment, color palette, and interaction feel are product-defining. UI changes must pass a consistency check before merge. |

### 1.2 — Boundary Map

```
┌────────────────────────────────────────────────────────────┐
│                      Se'kret Bip                           │
│                                                            │
│  ┌────────────────────────┐  ┌────────────────────────┐   │
│  │  PRODUCT LAYER (Build) │  │  PLATFORM LAYER (Reuse)│   │
│  │                        │  │                        │   │
│  │  Companion personalities│  │  Expo Router + EAS     │   │
│  │  Memory architecture   │  │  Supabase auth + RLS   │   │
│  │  Teen safety logic     │  │  Cloudflare Workers    │   │
│  │  Parent bridge rules   │  │  GitHub Actions CI/CD  │   │
│  │  UI / scrapbook feel   │  │  Testing frameworks    │   │
│  │  Reward mechanics      │  │  Monitoring + logging  │   │
│  │  Emotional model       │  │  Release automation    │   │
│  └────────────────────────┘  └────────────────────────┘   │
│         ↑ Custom, unique            ↑ Borrowed, mature     │
└────────────────────────────────────────────────────────────┘
```

---

## Part 2 — Repository Structure

```
sekret-bip/
├── apps/
│   ├── mobile/              # Expo React Native app
│   │   ├── src/
│   │   │   ├── screens/     # One folder per major screen
│   │   │   ├── companions/  # Companion logic: Raylene, Rylane, Night, Cloud
│   │   │   ├── memory/      # Memory architecture (read/write/consent)
│   │   │   ├── safety/      # Teen safety rules engine
│   │   │   ├── parent/      # Parent bridge UI and logic
│   │   │   ├── rewards/     # Reward mechanics
│   │   │   ├── ui/          # Shared UI components (scrapbook system)
│   │   │   └── hooks/       # Shared hooks
│   │   ├── app.json
│   │   └── eas.json
│   └── web/                 # Optional future web presence
│
├── packages/
│   ├── supabase/            # Schema, RLS policies, migrations, Edge Functions
│   ├── workers/             # Cloudflare Workers (orchestration, AI relay)
│   ├── safety-engine/       # Safety rule definitions (shared)
│   └── types/               # Shared TypeScript types across apps
│
├── .github/
│   ├── workflows/           # CI/CD pipelines (see Part 4)
│   ├── CODEOWNERS           # Auto-assigns reviewers by path
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
│
├── docs/
│   ├── companions/          # Personality contracts per companion
│   ├── memory/              # Memory architecture spec
│   ├── safety/              # Safety rules spec
│   ├── parent-bridge/       # Parent bridge spec
│   └── ui/                  # UI identity guide
│
├── tools/
│   ├── reviewers/           # Automated reviewer scripts (see Part 3)
│   └── checklists/          # Markdown checklists for manual reviews
│
├── control-room/            # This folder — engineering OS and governance docs
│   └── bip-os.md            # This document
│
└── bip-os.md                # Root copy (mirror)
```

### CODEOWNERS Rules

```
# Companion logic — requires companion review
/apps/mobile/src/companions/  @companion-reviewer

# Safety engine — requires safety review
/apps/mobile/src/safety/      @safety-reviewer
/packages/safety-engine/      @safety-reviewer

# Parent bridge — requires policy review
/apps/mobile/src/parent/      @parent-bridge-reviewer

# Memory — requires memory architecture review
/apps/mobile/src/memory/      @memory-reviewer

# Supabase schema and RLS — requires data reviewer
/packages/supabase/           @data-reviewer

# UI components — requires UI consistency review
/apps/mobile/src/ui/          @ui-reviewer
```

---

## Part 3 — Reviewer Roles and Checklists

Every PR automatically triggers the relevant reviewers based on which paths changed. Reviewers may be human, automated scripts, or AI-assisted checklists run by the author before requesting review.

### 3.1 — Reviewer Role Matrix

| Role | Triggered by path | Checks |
|------|-------------------|--------|
| **Safety Reviewer** | `src/safety/`, `safety-engine/`, any AI output path | Teen safety invariant, content filtering, unmoderated output paths |
| **Companion Reviewer** | `src/companions/`, AI prompt files, tone config | Personality contracts, memory behavior, companion identity lock |
| **Parent Bridge Reviewer** | `src/parent/`, notification logic, Circle access | Parent visibility rules, consent flows, alert thresholds |
| **Memory Reviewer** | `src/memory/`, Supabase memory tables | Consent signals, RLS enforcement, no raw writes without consent |
| **Data Reviewer** | `packages/supabase/` | Schema changes, RLS policies, migration safety |
| **UI Reviewer** | `src/ui/`, screen files, style files | Scrapbook aesthetic, type treatment, color palette, interaction feel |
| **Architecture Reviewer** | Root changes, new packages, worker additions | Boundary map integrity, no product logic in platform layer |

### 3.2 — Safety Reviewer Checklist

```markdown
## Safety Review Checklist

- [ ] All AI-generated text shown to a teen passes through the safety filter
- [ ] No unmoderated content path exists (test the unhappy path)
- [ ] Content filter version is pinned and logged
- [ ] Parent can see any flagged content within the agreed notification window
- [ ] New screen/feature has been tested with edge-case inputs (empty, very long, offensive attempt)
- [ ] No personally identifiable information exposed in AI context without explicit consent
- [ ] Rate limiting is in place for AI calls from teen accounts
- [ ] Age verification gate is intact if this touches onboarding
```

### 3.3 — Companion Reviewer Checklist

```markdown
## Companion Review Checklist

- [ ] Companion name and pronouns match the personality contract in /docs/companions/
- [ ] Tone stays within defined range (e.g., Raylene: warm/curious, not clinical or sarcastic)
- [ ] Memory references are accurate to stored data — no hallucinated memories
- [ ] No new personality traits added without updating the personality contract doc
- [ ] Prompt changes have been tested with at least 10 representative conversation turns
- [ ] Conversation quality evaluation has been run (see tools/reviewers/conversation-quality.md)
- [ ] Companion does not give advice outside its defined scope (e.g., medical, legal)
- [ ] Companion correctly defers to parent-bridge rules when relevant
```

### 3.4 — Parent Bridge Reviewer Checklist

```markdown
## Parent Bridge Review Checklist

- [ ] Parent can see everything this feature exposes to a teen
- [ ] Notification triggers match the agreed alert thresholds in /docs/parent-bridge/
- [ ] Circle access rules are unchanged OR change has been explicitly approved
- [ ] Child account settings changes require parent confirmation before taking effect
- [ ] No new data is shared with third parties without updating the privacy policy
- [ ] Parent dashboard reflects the new state correctly
- [ ] Tested with both permissive and restrictive parent settings
```

### 3.5 — Memory Reviewer Checklist

```markdown
## Memory Review Checklist

- [ ] No memory write occurs without an explicit consent signal from the user
- [ ] RLS policy on the relevant Supabase table has been reviewed and is correct
- [ ] Memory reads are scoped to the authenticated user only
- [ ] Memory is not leaked into AI context from a different user
- [ ] Retention rules are documented and enforced (no indefinite storage without notice)
- [ ] Memory deletion path is tested and works end-to-end
- [ ] Edge Function handling memory data uses prepared statements or parameterized queries
```

### 3.6 — UI Reviewer Checklist

```markdown
## UI Consistency Review Checklist

- [ ] Uses color tokens from the Bip design system (no hardcoded hex values)
- [ ] Typography matches the scrapbook type scale
- [ ] Spacing uses 4px system tokens
- [ ] Animations match the existing motion style (no jarring or out-of-character motion)
- [ ] Component is accessible: touch targets ≥44px, focus states visible, alt text present
- [ ] Tested at 375px (iPhone SE) and 390px (iPhone 14)
- [ ] Dark/light mode both verified
- [ ] No placeholder text or lorem ipsum in the build
- [ ] Empty state is designed (not blank)
- [ ] Error state is designed (not raw error text)
```

---

## Part 4 — CI/CD Pipelines

### 4.1 — PR Gate (runs on every pull request)

```yaml
# .github/workflows/pr-gate.yml
name: PR Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage

  safety-engine-tests:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:safety
        # Dedicated test suite for safety rule engine — never skip

  supabase-rls-check:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db lint
      - run: supabase test db
```

### 4.2 — Build and Preview (runs on push to develop)

```yaml
# .github/workflows/build-preview.yml
name: Build Preview

on:
  push:
    branches: [develop]

jobs:
  expo-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas update --auto --branch preview
        working-directory: apps/mobile
```

### 4.3 — Production Release (runs on tag push)

```yaml
# .github/workflows/release.yml
name: Production Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  ios-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform ios --profile production --non-interactive
        working-directory: apps/mobile

  android-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform android --profile production --non-interactive
        working-directory: apps/mobile

  cloudflare-deploy:
    runs-on: ubuntu-latest
    needs: [ios-build, android-build]
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}\n          workingDirectory: packages/workers
          command: deploy --env production

  supabase-migrate:
    runs-on: ubuntu-latest
    needs: cloudflare-deploy
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

### 4.4 — PR Template

```markdown
## What does this PR do?

<!-- One sentence summary -->

## Which invariants does this touch?

- [ ] Safety (teen-facing flows, AI output, content filtering)
- [ ] Parent Bridge (visibility, notifications, Circle, child settings)
- [ ] Companion Identity (personality, tone, memory behavior)
- [ ] Memory Architecture (writes, reads, consent, RLS)
- [ ] UI Identity (scrapbook aesthetic, tokens, motion)
- [ ] None of the above (platform/infra only)

## Checklist

- [ ] Lint and type-check pass locally
- [ ] Unit tests pass locally
- [ ] Relevant reviewer checklist completed (see tools/checklists/)
- [ ] No hardcoded credentials, API keys, or PII in the diff
- [ ] Migration is backwards-compatible OR a rollback plan is documented
- [ ] Feature flag used if this change is not ready for all users

## Screenshots or recordings

<!-- Required for any UI change -->
```

---

## Part 5 — Decision Matrix: Build vs. Borrow

| Layer | Decision | Rationale |
|-------|----------|-----------|
| React Native navigation | Borrow (Expo Router) | Solved problem; handles deep linking, typed routes, and layouts |
| Authentication flows | Borrow (Supabase Auth) | Well-tested; handles sessions, refresh, MFA, and social providers |
| Database and RLS | Borrow (Supabase Postgres) | RLS-first model fits multi-user safety requirements exactly |
| Edge API orchestration | Borrow (Cloudflare Workers) | Isolate-based runtime; globally distributed; observability built in |
| OTA updates and builds | Borrow (Expo EAS) | Handles signing, channels, rollbacks, and staged rollouts |
| CI/CD pipelines | Borrow (GitHub Actions) | Mature ecosystem; direct EAS and Cloudflare integrations |
| Companion personalities | **Build** | No external product has Raylene, Night, Cloud, or Rylane |
| Teen safety rules engine | **Build** | Rules are specific to Se'kret Bip's user population and philosophy |
| Parent bridge logic | **Build** | Unique consent model; not covered by any general parental control SDK |
| Memory architecture | **Build** (with ideas from LLM memory patterns) | Bip's memory model is a product feature, not a commodity |
| Emotional interaction model | **Build** | Core differentiator; cannot be outsourced |
| UI / scrapbook design system | **Build** | Visual identity is the moat |
| AI prompt evaluation | **Build** (using open-source eval frameworks as infrastructure) | Evaluation criteria are specific to companion quality standards |
| Monitoring and logging | Borrow (Cloudflare Analytics + Supabase logs) | Sufficient for current scale; revisit at 100k MAU |

---

## Part 6 — 30-Day Rollout Plan

### Week 1 — Foundation

- [ ] Create repo structure matching Part 2
- [ ] Set up CODEOWNERS file
- [ ] Add PR template
- [ ] Configure PR gate workflow (lint, type-check, unit tests)
- [ ] Write safety engine unit test suite (target: 80% coverage of rule engine)
- [ ] Write first RLS pgTAP tests for memory tables

### Week 2 — Companion and Safety Docs

- [ ] Write personality contracts for Raylene, Rylane, Night, and Cloud in /docs/companions/
- [ ] Write safety rules spec in /docs/safety/
- [ ] Write parent bridge spec in /docs/parent-bridge/
- [ ] Write memory architecture spec in /docs/memory/
- [ ] Write UI identity guide in /docs/ui/

### Week 3 — Automated Reviewers

- [ ] Build conversation quality evaluator (tools/reviewers/conversation-quality.md)
- [ ] Build UI consistency checker (tools/reviewers/ui-consistency.md)
- [ ] Build production readiness checklist (tools/checklists/production-readiness.md)
- [ ] Build App Store readiness checklist (tools/checklists/app-store-readiness.md)
- [ ] Integrate Supabase RLS check into PR gate

### Week 4 — Release Automation

- [ ] Configure EAS build profiles (development, preview, production)
- [ ] Set up OTA preview builds on push to develop
- [ ] Configure production release workflow on tag push
- [ ] Configure Cloudflare Workers deploy in release workflow
- [ ] Configure Supabase migration step in release workflow
- [ ] Run first full end-to-end release cycle on a non-production tag

---

## Part 7 — Governance

### 7.1 — Architecture Review Triggers

An architecture review (human, not just checklist) is required when:

- A new package is added to the monorepo
- A new external service dependency is introduced
- The memory architecture changes in any way that affects storage or consent
- The safety rule engine is updated with new rule categories
- A companion's personality contract is amended
- A new AI model or provider is introduced

### 7.2 — Versioning Policy

- The OS itself is versioned (current: v1.0)
- Invariants in Part 1 are locked until a formal OS version bump
- Personality contracts in /docs/companions/ are versioned independently
- Safety rules in /docs/safety/ are versioned independently
- OS version bumps require sign-off from the product owner

### 7.3 — When to Update This Document

Update bip-os.md when:
- A new invariant is added
- A reviewer role is added or changed
- A new CI/CD workflow is introduced
- The decision matrix changes for a major layer
- The repo structure changes significantly

Changes to this document are themselves subject to the architecture review trigger in 7.1.

---

*Bip Engineering OS v1.0 — July 2026*
