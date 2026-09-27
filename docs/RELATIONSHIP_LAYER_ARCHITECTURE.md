# Se’kret Bip Relationship Layer — Architecture Baseline

Parent goal: #238  
Phase issue: #239

## Purpose

This document grounds the Parent–Teen Translation Layer, Bridge Learning, Emotional Accountability Crew, Emotional Scrapbook, and Persistent Companion Memory in the repository that exists today. It does not authorize parent surveillance, automatic sharing, or silent memory retention.

## Existing foundations

### Parent and teen linking

`src/utils/parentLink.ts` is the current client contract for parent linking. It:

- creates an eight-character invite through `create_parent_link_invite`;
- redeems an invite through `redeem_parent_link_invite`;
- reads active links from `parent_links`;
- treats a usable link as `status = 'active'` and `is_active = true`;
- permits a teen to revoke an active link by setting `status = 'revoked'` and `is_active = false`.

Relationship-layer features must reuse this canonical active-link check. A parent link alone never grants access to raw teen content.

Relevant migrations already include:

- `supabase/migrations/20260630002000_limited_mode_parent_invite.sql`
- `supabase/migrations/20260630003000_reconcile_parent_link_contract.sql`
- `supabase/migrations/20260628_consent_visibility.sql`
- `supabase/migrations/20260630005000_bridge_s2tell_existing_tables.sql`
- `supabase/migrations/20260618_bridge_oracle_tables.sql`

Before new Bridge tables are added, these migrations must be reconciled to avoid a second competing parent-sharing model.

### Crew

The repo already uses `crew_members`, including `bip_id` and `connection_status`. Phase 2 should extend the existing accepted-connection model rather than introduce a separate friendship graph.

Pending, blocked, removed, or otherwise non-accepted connections must not receive real-name or support-activity access.

### Tasks, approvals, points, and events

The repo already contains:

- `bip_tasks`
- `task_submissions`
- `reward_catalog`
- `reward_redemptions`
- `point_transactions`
- `bip_events`

Recent task RPCs write canonical events using `bip_events(user_id, event_type, meta)`. New relationship-layer analytics must use that canonical shape and must never place raw journal, chat, image, voice, summary, or memory text in `meta`.

### Safety

`supabase/functions/safety-scan/index.ts` and the existing safety flow remain separate from ordinary Parent Window sharing. Safety escalation is not consent for Bridge summaries, Bridge Learning, Crew disclosure, scrapbook sharing, or companion memory.

### Deployment and API boundary

The production direction is Cloudflare-first. Client code must not contain model-provider secrets. AI summary, teaching, and memory operations belong behind the Worker/service boundary with typed request and response validation.

## Canonical feature boundaries

### 1. Bridge Summaries

Owner: teen.  
Permitted reader: one currently active linked parent selected by the teen.  
Source access: service-only for the exact source IDs explicitly selected by the teen.  
Parent access: generated summary only.  
Revocation: ordinary parent access ends immediately when the share or parent link is revoked.  
Retention: defined before schema ships; raw content is referenced, not duplicated.

Required states: draft, pending, processing, ready, viewed, revoked, expired, failed, deleted.

### 2. Bridge Learning

Owner: the teen and linked parent pair inside one consent-controlled shared learning session.  
Permitted readers: the active teen, the active linked parent for that session, and service code required to produce the teaching packet.  
Source access: shared-session content, explicit session attachments, and approved reference/curriculum material only.  
Parent access: the shared learning session only; private Study Buddy history, journals, unshared uploads, Circle content, emotional-memory records, school identifiers, and report-card material remain outside the boundary.  
Notification access: lock-screen copy is exact-template allowlisted and must not include subject, question, grade, answer, source document, mistake, or private-study detail.  
Revocation: parent-link or session revocation ends ordinary shared access immediately.  
Retention: defined before schema ships; shared-session recap must be minimized.

Required states: invited, working_together, teen_stumped, parent_stumped, both_stumped, sekret_teaching, trying_again, teach_back, completed, needs_outside_help, declined, revoked, expired.

### 3. Crew Accountability

Owner: the teen creating a check-in, reminder, or support preference.  
Permitted readers: accepted crew members explicitly included by the owner.  
Revocation: block/remove invalidates access immediately.  
Parent access: none by default.  
Public access: none.

### 4. Emotional Scrapbook

Owner: teen.  
Default visibility: private.  
Media: private owner-scoped storage paths with short-lived signed access.  
Sharing: an explicit destination-specific action; sharing to Circle, Crew, or Parent Window does not change the private default for future memories.  
Deletion: removes database references and stored objects according to the retention contract.

### 5. Companion Memory

Owner: teen.  
Default state: disabled.  
Creation: candidate memories are proposed and require teen approval.  
Retrieval: strict owner filtering happens before relevance ranking.  
Deletion: deleted memory is excluded from retrieval immediately.  
Parent access: none unless the teen separately shares a recap through an approved Parent Window flow.

## Shared contracts

Canonical TypeScript contracts live in `src/types/relationshipLayer.ts`.

Feature rollout states live in `src/constants/relationshipFeatureFlags.ts`. All five features are closed by default unless a feature has an explicit non-public internal gate. Supported rollout states are:

- `disabled`
- `internal`
- `beta`
- `enabled`

Feature flags are release gates, not authorization. RLS and server-side checks remain mandatory when a feature is enabled.

## Proposed service boundaries

These names are directional and must be reconciled with current utilities before implementation:

- `src/services/bridgeSummaryService.ts`
- `src/services/bridgeLearningService.ts`
- `src/services/crewAccountabilityService.ts`
- `src/services/scrapbookService.ts`
- `src/services/companionMemoryService.ts`
