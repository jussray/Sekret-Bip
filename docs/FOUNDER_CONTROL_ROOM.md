# Se’kret Bip Founder Control Room

## Purpose

The Founder Control Room is the internal operating system for building, monitoring, and maintaining Se’kret Bip.

It must combine structural audits, runtime failures, Supabase security, companion quality, voice performance, user behavior signals, product ideas, release readiness, infrastructure health, and rewards/store health into one founder-only experience.

It must **not** become another disconnected static dashboard.

The canonical app route is:

```text
app/(dev)/index.tsx
```

The access source of truth is:

```text
public.app_profiles
```

The event source of truth begins with:

```text
public.audit_events
```

## Current foundation

Already implemented:

- Founder profile stored in `public.app_profiles`
- Founder-only audit permissions
- `public.audit_events`
- Protected Expo Router group: `app/(dev)`
- Founder audit service: `src/services/founderAudit.ts`
- Initial combined dashboard: `app/(dev)/index.tsx`
- Founder account excluded from normal analytics

This is the shell, not the finished Control Room.

## Product rule

All future audit packs must become modules or data sources inside the Control Room.

Do not create separate production dashboards for:

- structural audit
- RLS audit
- voice architecture
- migration tracking
- memory audit
- companion evaluation
- user behavior
- rewards/store health
- infrastructure costs

Static HTML reports may remain as reference artifacts, but the live app must present one unified Control Room.

## Control Room modules

### 1. Overview

Show:

- unresolved critical issues
- total live incidents
- affected surfaces
- latest build status
- latest Supabase migration status
- Worker/API health
- active founder ideas
- release readiness score

### 2. Fix Queue

Every actionable item should become a normalized issue card.

Fields:

```text
id
source
category
severity
status
title
summary
suggested_fix
affected_surface
affected_users
first_seen_at
last_seen_at
occurrence_count
owner
linked_release
metadata
```

Statuses:

```text
open
investigating
planned
building
testing
resolved
ignored
```

Sources:

```text
runtime
structural_scan
rls_scan
voice_metrics
companion_eval
behavior_signal
build_pipeline
supabase_advisor
cloudflare_log
founder_idea
manual
```

### 3. Structural Health

Track:

- missing route targets
- dead-end redirects
- Expo Router route/module mismatches
- legacy wrapper drift
- duplicate implementations
- missing assets
- broken aliases/imports
- orphaned files
- type-check failures
- lint failures
- bundle/export failures

Structural scans should run in CI or developer tooling, then write summarized findings to the Control Room.

Do not run repository-wide source scans on every mobile app launch.

### 4. Security and RLS

Track:

- tables without RLS
- RLS-enabled tables without policies
- overly broad policies
- missing owner checks
- unsafe storage bucket policies
- client exposure of privileged secrets
- Edge Functions with weak authentication
- Supabase advisor findings
- schema drift between migrations and production

The RLS CSV templates should become seed/reference data for a normalized policy inventory, not the production UI itself.

Recommended tables:

```text
control_room_rls_inventory
control_room_rls_findings
control_room_storage_findings
```

### 5. Voice Runtime

Use the planned voice tables:

```text
voice_sessions
voice_turns
voice_events
voice_latency_metrics
```

Show:

- session success rate
- timeout rate
- reconnect rate
- barge-in success rate
- STT first-token latency
- LLM first-token latency
- TTS first-byte latency
- playback-start latency
- total response latency
- failures grouped by companion and app surface

Voice Bip, Circle voice, Pages voice, Bridge rehearsal, and companion speech must share one runtime and one telemetry format.

### 6. Companion and AI Health

Track per companion:

- live reply success rate
- fallback rate
- model/provider failures
- persona drift
- wrong companion identity/name
- unsafe response rate
- memory mismatch rate
- repeated/stale reply rate
- average latency
- user abandonment after response

Companions:

```text
raylene
rylane
cloud
night
oracle
```

Evaluation results should create issue cards when thresholds are exceeded.

### 7. Memory Health

Track:

- memory read/write failures
- duplicate memories
- contradictory memories
- low-confidence memories
- stale memories
- sensitive-content write blocks
- retrieval misses
- memory usage by companion
- summary job failures

Do not store full private teen transcripts in audit records.

Audit metadata must be redacted and privacy-safe.

### 8. User Behavior Signals

Track safe, aggregated product signals:

- screen opened but action not completed
- repeated button presses
- flow abandonment
- failed submissions
- empty-state loops
- unusually slow screens
- feature adoption
- companion selection
- completion rates

Examples:

```text
Circle opened but no post created
Parent Bridge abandoned before share
Voice Bip opened but recording never started
Reward redemption attempted but failed
```

Do not show private journal text, raw audio, or sensitive Circle content in founder analytics.

### 9. Circle Health

Track:

- post creation success
- reaction/comment failures
- moderation queue health
- blocked-user enforcement
- identity/privacy policy violations
- anonymous profile failures
- feed load latency
- unsafe content flags
- abandoned post composer rate

### 10. Parent Window Health

Track:

- teen share delivery success
- parent link failures
- parent response completion
- privacy-boundary violations
- parent splash/entry failures
- delayed or duplicate notifications
- recap generation failures

### 11. Rewards and Store Health

Track:

- points awarded
- points drained
- duplicate transactions
- redemption failures
- inventory/sync failures
- Shopify webhook failures
- reward abuse flags
- fulfillment status
- cost per redeemed reward

Founder ideas related to rewards and merch belong in the same queue.

### 12. Infrastructure and Cost

Track:

- Supabase database/storage usage
- Edge Function failures
- Cloudflare Worker failures
- OpenAI requests, failures, tokens, and estimated cost
- voice provider usage
- email/notification delivery
- build failures
- deployment status

Never place provider secrets in client code or audit metadata.

### 13. Founder Ideas

Founder ideas are first-class records, not hardcoded forever in `founderAuditPlaybook`.

Recommended table:

```text
founder_ideas
```

Fields:

```text
id
title
description
category
status
priority
source
notes
created_by
created_at
updated_at
shipped_at
```

Statuses:

```text
backlog
researching
planned
building
testing
shipped
paused
rejected
```

Examples:

- MySpace-style room music
- Shopify rewards store
- Night emotion set
- Parent splash tap-to-enter
- Circle anonymous mood posting
- Founder voice testing mode

### 14. Releases

Recommended tables:

```text
control_room_releases
control_room_release_checks
```

Each release should show:

- linked fixes
- linked founder ideas
- migration status
- build status
- type-check/lint/test status
- Expo export status
- Supabase advisor status
- rollback plan
- deployment state

## Recommended database model

Keep `audit_events` as the append-only raw event ledger.

Add normalized operational tables in phases:

```text
control_room_issues
control_room_issue_events
control_room_scans
control_room_metrics
control_room_integrations
founder_ideas
control_room_releases
control_room_release_checks
control_room_rls_inventory
```

### Raw event vs issue

`audit_events` answers:

> What happened?

`control_room_issues` answers:

> What must be fixed?

Many repeated audit events should update one issue record instead of creating hundreds of duplicate cards.

Example:

```text
67 voice_timeout events
        ↓ grouped by fingerprint
1 open issue: Voice Bip Worker timeout spike
occurrence_count: 67
affected_users: 21
```

## Privacy rules

The Control Room must never expose more private content than is necessary to diagnose a system problem.

Never store in audit metadata by default:

- full journal entries
- raw teen messages
- raw parent/teen Bridge content
- raw audio
- full voice transcripts
- passwords or tokens
- service-role keys
- private provider credentials

Prefer:

```text
event_type
surface
error_code
safe state flags
latency
provider
redacted identifiers
counts
```

Founder access does not override teen privacy boundaries.

## Access rules

- Only `developer`, `admin`, or `founder` roles with `can_view_audits = true` may read Control Room data.
- Only `admin` or `founder` with `can_manage_app = true` may resolve, assign, or delete issues.
- Founder test activity should remain excluded from normal analytics.
- Access must be enforced through RLS, not only through hidden navigation.

## Navigation

The Control Room should not appear in normal teen or parent bottom navigation.

Recommended founder-only entry points:

- direct route `/dev`
- founder-only card inside More/Settings after role verification
- optional hidden long-press shortcut for development builds

A hidden button is convenience, not security. RLS and profile-role checks remain mandatory.

## Implementation phases

### Phase 0 — Preserve and document

- Keep current founder profile and audit tables.
- Keep existing `/dev` route.
- Store this document as the source of truth.
- Inventory all uploaded dashboards and SQL packs.
- Do not apply unverified migrations directly to production.

### Phase 1 — Control Room shell

- Add module navigation/tabs.
- Add filters by category, severity, status, source, and surface.
- Add issue details screen.
- Add resolve/reopen actions.
- Move static founder ideas from code into Supabase.
- Add founder-only entry card in More/Settings.

### Phase 2 — Issue normalization

- Add `control_room_issues`.
- Add event fingerprinting and deduplication.
- Group repeated runtime events into one issue.
- Add affected-user and occurrence counters.
- Add assignment, notes, and status history.

### Phase 3 — Runtime instrumentation

Instrument:

- Supabase read/write failures
- Worker/API failures
- AI fallback use
- missing assets
- route failures
- voice failures
- Circle failures
- Parent Window failures
- reward/store failures

Every event should use a shared event-name registry and privacy-safe metadata schema.

### Phase 4 — Security and structural scanners

- Add CI structural scan output.
- Add RLS/schema audit job.
- Pull Supabase advisor findings.
- Create issues from new findings.
- Resolve findings automatically when scans pass.

### Phase 5 — Voice and AI telemetry

- Validate voice migrations in a branch/preview environment.
- Add shared voice runtime.
- Add latency/session metrics.
- Add companion evals and fallback metrics.
- Add threshold-based issue generation.

### Phase 6 — Product intelligence

- Add safe behavior funnels.
- Add Circle and Parent Window health.
- Add rewards/store health.
- Add cost reporting.
- Add suggested fixes based on repeated patterns.

### Phase 7 — Release operations

- Add release records and checklists.
- Link fixes and ideas to releases.
- Add deployment/build status.
- Add rollback readiness.

## First implementation PRs

### PR 1 — Founder Control Room UI foundation

- module navigation
- filters
- issue card model
- founder-only More/Settings entry
- founder ideas table and UI

### PR 2 — Issue normalization

- `control_room_issues`
- issue event links
- fingerprinting
- status/assignment/history

### PR 3 — Runtime instrumentation

- shared logger
- API/Worker/Supabase/asset/route failure events
- privacy-safe metadata validation

### PR 4 — Structural and RLS scans

- CI scripts
- scan result ingestion
- Supabase advisor ingestion

### PR 5 — Voice telemetry

- validate and apply voice migrations
- shared audio runtime
- voice health module

## Definition of done

The Control Room is successful when:

1. The founder logs in with the founder profile and opens one screen.
2. All major operational areas are visible from that screen.
3. Repeated failures become one actionable issue instead of noise.
4. Every issue explains impact, likely cause, and next fix path.
5. Founder ideas can move from backlog to shipped.
6. Security, privacy, and release readiness are visible without exposing teen content.
7. Static audit packs support the system but no longer fragment it.
