# Se'kret Bip — Funder Overview

Last reviewed: 2026-07-13

## The problem

Teens often need private space to process emotions, build healthy routines, and ask for help. Existing digital products can force a false choice between total isolation and broad adult visibility. Parents may want connection, but unrestricted access can undermine trust and discourage honest reflection.

## The product direction

Se'kret Bip is a privacy-first emotional growth and self-expression app for teens. It combines private journaling, voice reflection, emotional-regulation tools, habit support, character-based companions, trusted peer connection, and an intentional teen-parent sharing system called Bridge.

The core rule is simple: private reflection remains private, and parent visibility is based on what a teen intentionally shares, not silent monitoring.

## Intended users

- Teens seeking a private and expressive space for emotional growth.
- Parents or guardians seeking consent-based connection rather than surveillance.
- Youth-serving organizations exploring privacy-preserving digital wellbeing tools.

## Differentiation

Se'kret Bip is designed around:

- privacy by default;
- teen-controlled sharing;
- relationship-based parent access;
- no open stranger direct messages;
- expressive, non-clinical companion experiences;
- technical enforcement through server checks, database policies, rollout controls, and tests;
- machine-checked evidence states that prevent planned work from being presented as released product.

## Current stage

The repository contains a substantial active implementation across React Native, Expo Router, Supabase, Cloudflare Workers, AI and voice services, privacy controls, and automated validation.

Current integrated capabilities include:

- teen and parent route groups;
- Supabase Auth, synchronization, migrations, RLS, Storage, and Edge Functions;
- AI reply, transcription, TTS, and metadata-only telemetry through the canonical Worker;
- a versioned Se'kret identity and companion-style runtime wrapper;
- Bridge account-link, consent, summary, and revocation contracts;
- Founder Control Room operational sources;
- exact-release production verification through deployed commit metadata and Playwright;
- an Implementation Evidence gate that rejects unsupported completion claims.

Verified security and operations slices include:

- sampled owner access and cross-user/anonymous denial proof;
- server-only configuration tables with zero client grants;
- a documented service-role-only notification delivery boundary;
- JWT-protected retirement of obsolete release and probe functions.

The product is not represented as production-complete. Parent-side completion, controlled Bridge production proof, account deletion, broader authorization behavior tests, safety-auth negative tests, password-breach protection, accessibility, legal review, moderation, and full release testing remain gated work.

Durable L4 continuity memory, persistent goals, scheduled reflection, and inter-companion coordination remain planned rather than implemented.

## Near-term funding use

Priority uses of support are:

1. Complete and verify the parent and Bridge experience without expanding parent visibility.
2. Fund independent privacy, security, safeguarding, and accessibility reviews.
3. Conduct structured usability testing with appropriate teen and parent participants.
4. Complete account deletion, authorization behavior tests, safety-auth negative tests, and Auth hardening.
5. Cover infrastructure, AI, voice, storage, notifications, and multi-device testing.
6. Prepare a controlled pilot with qualified youth-serving partners.
7. Build L4 continuity only after the required privacy and deletion contracts are approved.

## Milestone framing

Support should be tied to verified deliverables rather than broad claims. Example milestones include:

- parent onboarding and account-link lifecycle verified end to end;
- Bridge sharing, summary, and revocation boundaries proven with controlled accounts;
- critical database, Storage, and server-auth boundaries independently reviewed;
- account deletion and data cleanup verified across database, Storage, and local cache;
- accessibility findings documented and remediated;
- exact-release and incident-response checks operational;
- pilot protocol, consent materials, and evaluation criteria prepared;
- one privacy-reviewed L4 continuity path integrated and tested before broader memory claims.

## Partnership opportunities

Se'kret Bip may be a fit for:

- youth wellbeing and education grantmakers;
- privacy and responsible-technology programs;
- family communication and digital-literacy initiatives;
- cloud and developer-credit programs;
- qualified pilot partners;
- aligned early-stage funders who respect the privacy model.

## Non-negotiables

Funding or partnership may not purchase access to private teen data, weaken consent rules, create surveillance features, or require advertising based on emotional information.

## Evidence and due diligence

Product claims should be checked against:

- `implementation-ledger.json`
- `README.md`
- `docs/CURRENT_STATUS.md`
- `docs/DEMO_READINESS_ENFORCEMENT.md`
- `docs/security/SUPABASE_AUTHORIZATION_PHASE0.md`
- `docs/ARCHITECTURE.md`
- `docs/PRIVACY_POLICY.md`
- `docs/COPPA_COMPLIANCE.md`
- `docs/legal/LAUNCH_COMPLIANCE_CHECKLIST.md`
- `DEPLOYMENT.md`

A document is not evidence by itself. The repository treats runtime paths, tests, live configuration, rollout, telemetry, and rollback as the proof set.
