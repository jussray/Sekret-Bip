# Se'kret Bip — COPPA Compliance Position

**Version 1.1 — June 2026**  
**Applies to:** Se'kret Bip production app and Se'kret Bip Demo web preview

> **Status notice:** This document describes Se'kret Bip's intended 13+ privacy posture and current architectural principles. It is not a legal opinion or a certification of compliance. Public launch, public demos, app-store release, and production teen-data collection remain blocked on the implementation and verification items listed below.

## Product Position

Se'kret Bip is designed for teens ages **13–17**. The service is not intended for children under 13, and the production service must prevent under-13 account creation before collecting account, journal, voice, community, or AI interaction data.

COPPA applies to online services directed to children under 13 and to services with actual knowledge that they are collecting personal information from a child under 13. Se'kret Bip therefore treats an enforceable minimum-age boundary as a launch requirement, while also applying privacy-minimization principles to all teen accounts.

**Privacy is a product feature, not a legal checkbox.**

## Minimum Age Policy

- Minimum account age: **13**.
- Users whose date of birth indicates they are under 13 must be blocked before account creation or collection of non-essential personal information.
- Age enforcement must exist at both the user-interface layer and the server/API layer.
- Any non-production demo must warn users not to submit real personal, journal, voice, or crisis information.
- Se'kret Bip does not currently offer an under-13 experience.

A self-declared age field alone is not considered sufficient launch verification until API bypass tests pass.

## Core Privacy Commitments

1. Teens control whether private reflections cross into the Parent Window.
2. Parents cannot browse private journals, private voice recordings, private companion conversations, period data, or unshared reflections.
3. Parent-visible information must come from teen-initiated sharing, explicitly consented summaries, privacy-safe aggregates, or parent-authored records.
4. Participation must not require disclosure of more personal information than is reasonably necessary.
5. Se'kret Bip does not sell personal information or use teen content for behavioral advertising.
6. Sensitive content must be protected with access controls, encryption in transit, and documented deletion procedures.

## Data Categories

The exact production data inventory must be verified against deployed database migrations, storage buckets, analytics configuration, and vendor settings before launch.

| Category | Examples | Intended owner/access |
|---|---|---|
| Account identity | Email, nickname, date of birth or age eligibility, Bip ID, preferences | Account holder; limited operational access |
| Pages | Journal text, attachments, saved companion replies | Teen only unless the teen explicitly shares a selected item |
| Voice Bip | Audio reflections and optional transcripts | Account holder only unless explicitly shared |
| Mood and regulation | Mood check-ins, calm activity markers | Teen; parent only through consented share or safe summary |
| Circle identity | Anonymous display name, avatar, support preferences, Crew visibility | Teen-controlled community identity |
| Circle and Crew | Posts, reactions, accepted Crew relationships, check-ins | Based on the selected Circle/Crew visibility context |
| Bippin 2 | Points, streaks, milestones, rewards, growth history | Teen; parent only through approved summaries or support workflows |
| Bridge | Teen-selected shares, permissions, parent responses, support history | Teen and linked parent according to explicit sharing rules |
| Parent spaces | Parent Pages, Parent Circle, Parent Voice Bip, support memories | Parent account only |
| Profile memories | Safe activity or milestone markers from other spaces | Account holder; never a copy of private content by default |
| AI processing | Prompt context and generated companion response | Transient processing unless intentionally saved into an account-owned feature |

## Memory Architecture

Memories are a background identity layer, not a duplicate content store.

- **Pages owns private writing and attachments.**
- **Circle owns community and Crew interactions.**
- **Bippin 2 owns growth, points, streaks, rewards, and milestones.**
- **Bridge owns support connections, permissions, and shared moments.**
- **Calm owns regulation tools and calm activity.**
- **Profile may display safe memory markers that those events occurred.**

A Profile memory must not expose raw journal text, raw voice content, private AI conversation text, period information, or unshared teen reflections. Parent Profile memories must describe the parent's own support activity, not the teen's private activity.

## Parent Window — Privacy by Design

The Parent Window is designed as a doorway to support, not surveillance.

> Parents see only teen-selected shares, permissioned summaries, privacy-safe aggregates, and parent-authored content.

This boundary must be enforced by database policies and application data contracts. Interface copy alone is not sufficient. Parent routes must not directly query teen-private journals, voice recordings, companion memory, period data, or unshared Circle content.

## AI Processing

Se'kret Bip uses API-based AI services to generate companion responses.

- AI interactions are **transient by default**.
- A response may persist when the user intentionally saves it as part of a Page, reflection, voice artifact, memory marker, or other account-owned feature.
- The product must not claim that no AI content is stored if saved companion replies or reflections are persisted.
- Safety instructions must prohibit diagnosis, treatment claims, sexualized content involving minors, coercive dependency, and instructions facilitating self-harm or violence.
- Safety checks must occur server-side where practical and must fail safely.
- Vendor settings and contracts must be reviewed before launch. OpenAI states that API inputs and outputs are not used to train models by default unless the customer opts in.

## Vendors and Processors

Current or planned processors may include:

- **Supabase** — authentication, database, and private storage
- **Cloudflare** — Worker/API routing and security controls
- **OpenAI** — companion response generation and related AI processing

Before launch, Se'kret Bip must document each processor's purpose, retention settings, security commitments, subprocessors, deletion behavior, and contract terms. Vendors must not be authorized to use teen content for advertising.

## Security Requirements

- TLS for data in transit
- Row Level Security or equivalent authorization on every user-data table
- Private storage buckets with owner-scoped access policies
- Service-role, AI, and internal shared-secret credentials stored only in server-side secret managers
- No production secrets committed to the repository or shipped in the client bundle
- Sign-out clears private local caches
- Security and privacy tests for parent/teen data separation
- Documented incident-response and breach-notification procedures before launch

## Crisis and Safety Response

Companions must not diagnose, provide clinical treatment, or present themselves as emergency services.

When language indicates possible self-harm, suicide, abuse, or immediate danger, the product should:

1. respond with warmth and direct safety-oriented language;
2. encourage contacting a trusted person nearby;
3. direct the user to regionally appropriate crisis or emergency resources;
4. use 988 and Crisis Text Line references only for users in locations where those resources apply;
5. clearly direct users to local emergency services when danger is immediate.

Crisis-resource presentation must be localized rather than permanently hardcoded to one country.

## Account Access, Correction, and Deletion

Before launch, users must have a working in-app method to:

- review core account information;
- correct editable account information;
- delete the account;
- delete associated database records;
- delete private storage objects;
- delete Circle identity, Crew records, Bridge records, memories, growth history, journals, and voice artifacts as applicable;
- understand legally required retention exceptions, if any.

A local cache reset or account deactivation does not satisfy full deletion.

## Launch Blockers

The following must be completed and verified before public launch, public demo, app-store release, or production teen-data collection:

- [ ] Public Privacy Policy at a stable URL
- [ ] Age-appropriate Terms of Service at a stable URL
- [ ] Server/API-enforced minimum-age check
- [ ] Tests proving under-13 account creation cannot bypass the UI
- [ ] Complete account and storage deletion flow
- [ ] Data inventory matched to deployed schema and vendors
- [ ] RLS/storage-policy audit for teen/private and parent/shared data
- [ ] Vendor data-processing and retention review
- [ ] Localized crisis-resource strategy
- [ ] App Store and Google Play age/content disclosures
- [ ] Incident-response and breach-notification plan
- [ ] Legal review covering COPPA and applicable state/international teen privacy rules

## Investor Summary

Se'kret Bip is structured as a 13+ service with privacy-minimizing product boundaries. Its differentiator is the Parent Window's opt-in support model: teen-private content remains private, while teens can intentionally open a Bridge to support.

The accurate current position is:

> Se'kret Bip is designed around COPPA principles and a 13+ minimum-age model. Its architecture prioritizes teen privacy, data minimization, and consented parent support. Compliance certification should not be claimed until the listed launch blockers are implemented, tested, and legally reviewed.
