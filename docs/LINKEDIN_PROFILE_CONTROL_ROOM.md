# LinkedIn Profile Control Room

## Purpose

The LinkedIn Profile Control Room is the founder-only operating layer for managing Ray's public professional identity and Se’kret Bip thought-leadership publishing without exposing private product architecture.

It belongs inside the unified Founder Control Room. It must not become a separate unsupervised social bot.

## Operating objective

Maintain a deliberate, evidence-backed LinkedIn presence that:

- leads with Se’kret Bip as the primary public product;
- positions Ray as Founder & Chief Product Architect;
- explains privacy-first emotional wellness technology without medical claims;
- publishes only claims that current product evidence can support;
- protects private repositories, prompts, safety logic, business logic, unreleased architecture, Control Room internals, L99 internals, and proprietary founder infrastructure;
- preserves human approval before publication;
- records what changed, who approved it, when it was published, and what happened afterward.

## Public identity lock

### Primary identity

- Name: Ray
- Public role: Founder & Chief Product Architect at Se’kret Bip
- Primary product: Se’kret Bip
- Public category: privacy-first emotional wellness and self-expression technology for teens and families

### Supporting positioning

AI-native founder infrastructure may be described only as supporting planning, red-team analysis, implementation, verification, storytelling, and operational control.

Do not publicly expose internal prompt text, protected system architecture, private repo contents, confidential business logic, safety implementation details, unreleased features, or provider credentials.

## Desired-state profile

The Control Room should store approved desired-state values for:

- headline;
- banner statement and banner asset specification;
- About section;
- current Experience entry;
- Featured items;
- skills ordering;
- founder/product links;
- approved public claims;
- prohibited or not-yet-proven claims;
- last verified profile state;
- profile drift findings.

## LinkedIn permission boundary

The system must distinguish between three execution modes.

### 1. Official API mode

Use LinkedIn-approved APIs only for fields and actions for which the connected application has explicit authorization.

Currently proven in the connected workflow:

- account connection;
- draft creation;
- review and approval;
- scheduling;
- immediate LinkedIn publishing;
- post status and platform result capture;
- available post analytics synchronization.

### 2. Guided profile-edit mode

For profile fields not exposed by the authorized API, the Control Room should generate exact paste-ready values and a verified change checklist. The founder completes the restricted save action directly in LinkedIn.

### 3. Verification mode

Where LinkedIn permits profile reads, compare current state with desired state and create drift findings. Where read access is unavailable, retain the last founder-confirmed state and label it as founder-confirmed rather than API-verified.

## Prohibited execution

Do not use hidden, unattended browser automation, credential replay, scraping, or unapproved extensions to bypass LinkedIn's permission model.

Do not claim that restricted profile fields were changed unless the system has direct confirmation.

## Core records

Recommended records:

```text
linkedin_profile_states
linkedin_profile_change_sets
linkedin_profile_findings
linkedin_content_posts
linkedin_content_approvals
linkedin_publish_attempts
linkedin_post_metrics
linkedin_content_experiments
```

### Profile state fields

```text
id
account_id
state_source              # api_verified | founder_confirmed | desired
headline
banner_statement
about_text
experience_json
featured_json
skills_json
links_json
verified_at
verified_by
created_at
updated_at
```

### Content post fields

```text
id
external_post_id
account_id
brand
content_lane
title
body
hashtags
status                    # draft | pending_approval | approved | scheduled | posted | failed | rejected
scheduled_at
approved_at
approved_by
posted_at
platform_url
claim_evidence_refs
redteam_result
media_count
created_at
updated_at
```

## Approval invariant

AI may draft, evaluate, recommend timing, and prepare a change set.

Only the founder may approve, schedule, publish, reject, or authorize a restricted profile-field save.

Every approval record must include the exact final text, target account, schedule, media count, and approval timestamp.

## Red-team gates

Before approval, evaluate each profile or post change for:

- unsupported product assertions;
- medical, diagnostic, treatment, or guaranteed-outcome language;
- teen-privacy risk;
- surveillance framing;
- intellectual-property leakage;
- provider or credential leakage;
- unreleased-feature promises;
- conflicting founder titles;
- false urgency or misleading scarcity;
- character limits and formatting drift;
- duplicate or stale content;
- platform-policy risk.

A failing red-team gate returns the item to draft with a specific reason.

## Content lanes

The 30-day operating cadence uses three lanes:

1. Founder thesis and product principles
2. Verified Se’kret Bip build progress
3. Responsible AI-native product operations

The public product remains the subject. Founder infrastructure is supporting evidence, not the headline product.

## OODA cadence

Run one OODA review after every three published posts.

### Observe

Capture available impressions, reactions, comments, shares, profile views, qualified conversations, publication failures, and topic signals.

### Orient

Compare content lane, opening structure, post length, time slot, claim type, and call-to-action strength. Separate meaningful product attention from vanity engagement.

### Decide

Keep, revise, pause, or replace the next queued posts. Do not alter already approved copy silently.

### Act

Create a versioned change set, run red-team validation, obtain founder approval, then reschedule or publish.

## Initial timing experiment

For the first 30-day calendar:

- Monday: 9:17 AM America/New_York
- Wednesday: 12:07 PM America/New_York
- Friday: 9:17 AM America/New_York

This produces three posts per week and alternates morning versus midday behavior without daily posting noise.

## Emergency controls

The module must support:

- stop all scheduled posts;
- reject one queued post;
- pause one content lane;
- revoke account publishing access;
- retain an immutable audit record;
- retry failed publishing only after the current error is displayed and reviewed.

## Current baseline

The first Se’kret Bip LinkedIn post was published on July 17, 2026 through Cambiante. It establishes the operating claim that public promises must be supported by system evidence.

The next 30-day calendar is stored in:

```text
content/linkedin/2026-07-17-30-day-founder-calendar.md
```

## Definition of done

The LinkedIn Profile Control Room is successful when:

1. The founder can see desired profile state, last verified state, and drift in one founder-only module.
2. Restricted LinkedIn profile edits are truthfully labeled and converted into exact guided change sets.
3. Drafts cannot publish without founder approval.
4. Every scheduled post shows final text, target account, schedule, media count, and approval status.
5. Every public claim has evidence or is explicitly labeled as founder perspective.
6. Private Se’kret Bip architecture remains private.
7. OODA reviews can modify future queued content without rewriting history.
8. Publishing failures create actionable Control Room issues instead of silent retries.
