# Bridge Family Visit Mode

<!-- truth-mode: durable -->

## Purpose

Bridge Family Visit Mode is a visible, reflection-only support flow for child-parent encounters where a family may be separated by foster care, court involvement, CYS/child-welfare involvement, CASA, or another approved agency context.

Its purpose is **not surveillance**. Se’kret helps the people involved reflect on an encounter without requiring the child to carry the whole burden of translating their experience for every adult.

This document describes the source contract. It is not proof that the migrations, Worker rollout, professional verification, case assignment, or production UI are live. Current provider/database/release truth must be read from the systems that own it.

## Non-surveillance rule

Family Visit Mode v1 has no recording layer.

```text
microphone       NONE
camera           NONE
video            NONE
transcript       NONE
background listen NONE
free-text visit log NONE
passive AI observation NONE
```

A session uses only participant-selected structured markers and structured post-visit reflections. The database contract fixes `capture_mode` to `none`, and the summary Worker fails if that value ever drifts.

The UI must say plainly that Se’kret is not recording before anyone joins and while the session is active.

## Account and authority model

Public account identity remains:

```text
teen | parent
```

There is no public `CYS`, `caseworker`, or `professional` signup choice.

A professional uses a permanent adult account, then receives a separate server-reviewed `bridge_professional` capability. Founder/admin review controls professional verification. Case assignment is separately founder/admin authorized and names exactly one child account, one parent account, and one verified professional account.

Professional capability and case assignment are separate from ordinary `parent_links`. Neither may silently widen Parent Bridge visibility.

Suspension or revocation of professional authority revokes active Family Visit assignments. Re-verification never silently restores a case; a new assignment is required.

## Session state

```text
verified assignment
      ↓
awaiting_ack
  child ✓
  parent ✓
  professional ✓
      ↓
active
      ↓
reflection
  child reflection ✓
  parent reflection ✓
  professional reflection ✓
      ↓
ready
```

Any participant may decline/stop the session. Assignment expiry/revocation or professional-authority drift fails closed.

A session cannot become active until all three named participants acknowledge the same visible no-recording notice.

A session cannot become `ready` and freeze audience summaries until the child, parent, and professional have each saved a structured post-visit reflection. `not_sure` and `insufficient_evidence` remain valid inputs, so this rule guarantees participation without forcing certainty.

Each case assignment may have at most one open session in `awaiting_ack`, `active`, or `reflection`. Repeated start requests return the existing open session instead of creating a second consent/reflection timeline.

## Structured input only

During an active visit, participants may deliberately tap constrained markers such as:

- felt connected;
- felt heard;
- needed a pause;
- support offered;
- boundary respected;
- repair attempt;
- felt pressured;
- want human review.

After the visit, child/parent reflections use constrained answers about being heard, comfort, ability to pause, connection afterward, and desired next support. The professional submits only a constrained review-routing signal.

There is no narrative text field for the encounter.

Raw markers and reflections are submitter-only client data. The privileged backend may read them to build minimized summaries, but Parent and Professional clients do not receive each other’s raw input.

## `/human` summaries

One structured encounter produces two different generated summaries.

### Parent summary

Purpose: help the parent understand how the interaction **may** have landed for the child and what might help connection next time.

It may contain:

- cautious child-experience interpretations;
- connection moments;
- practical next-time suggestions;
- uncertainty;
- limitations.

It must not reveal the professional review signal or professional disposition.

### Professional summary

Purpose: help the assigned professional understand structured interaction patterns, child-centered signals, and what deserves human review.

It may use one routing disposition:

```text
supportive
mixed
needs_human_review
insufficient_evidence
```

That disposition is not a custody, visitation, parental-fitness, abuse, neglect, legal, clinical, or safety adjudication.

## Evidence grammar

Every generated evidence item uses one label:

- `OBSERVED` — a participant deliberately submitted the structured marker/reflection. It does **not** mean Se’kret passively watched the room.
- `INFERRED` — a cautious interpretation supported by structured inputs.
- `UNKNOWN` — the structured evidence is insufficient.
- `HUMAN_REVIEW` — a human professional should interpret the situation; Se’kret is not deciding it.

The model may not state the child’s internal feelings as certain fact.

## Child transparency

The child may inspect **both generated audience summaries**.

```text
child → parent summary + professional summary
parent → parent summary only
professional → professional summary only
```

This prevents Se’kret from creating an invisible AI dossier about the child while still maintaining adult-to-adult audience separation.

## AI boundary

The Worker receives only minimized structured evidence:

```text
role + marker enum + reflection enums
```

No names, case IDs, timestamps, transcript, audio, video, or narrative visit text are sent to the model.

Generated output is schema-validated and rejected if it drifts into clinical/legal conclusions, invented dialogue, parent-fitness labels, custody/visitation decisions, definitive child mind-reading, or professional-only information in the parent summary. Invalid output gets one corrective retry, then a conservative static fallback.

Even the professional who triggers generation receives only metadata that the two summaries were created. Summary content is read afterward through audience-scoped RLS.

## Storage and RLS

Family Visit Mode uses separate tables for:

- professional capability;
- case assignment;
- session state and acknowledgements;
- structured markers;
- structured reflections;
- audience-specific generated summaries.

Authenticated clients cannot directly insert/update/delete these tables. State-changing participant actions go through constrained SECURITY DEFINER RPCs. Founder/admin professional review and case assignment are server-controlled RPCs and are not exposed in the public client service.

A partial unique index plus idempotent `start_bridge_family_visit_session` RPC prevents one assignment from having multiple simultaneously open visit sessions.

## Rollout

The summary Worker is gated by `BRIDGE_FAMILY_VISITS_ROLLOUT`:

- unset / `disabled` → blocked;
- `enabled` → authorized accounts may use the feature;
- comma-separated user IDs → controlled cohort.

The rollout variable cannot create professional authority or case assignment. All database/RLS checks still apply.

## Production gates

Before this feature can be called live, separately prove:

1. migrations reviewed and deliberately applied to the intended Supabase project;
2. RLS/advisor review plus real multi-account isolation proof;
3. one verified professional capability created through founder/admin authority;
4. one bounded case assignment created through founder/admin authority;
5. exact deployed `sekret-backend` identity with the Family Visit Worker source;
6. controlled rollout configured without exposing secret values;
7. browser/device journey for child, parent, professional, wrong adult, suspended professional, revocation, and expiry;
8. repeated professional start requests resolve to one open session for the assignment;
9. summary generation stays blocked until all three participants have saved structured reflections;
10. parent cannot read professional summary or raw child/professional reflection;
11. professional cannot read parent summary or raw child/parent reflection;
12. child can inspect both generated summaries;
13. no microphone/camera/transcription permission is requested by this flow;
14. rollback disables rollout and revokes assignments without deleting evidence history.

Production migration, provider configuration, professional verification, assignment creation, deployment, and rollout are separate founder gates. Source implementation does not authorize those mutations.
