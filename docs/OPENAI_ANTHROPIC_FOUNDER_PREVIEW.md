# OpenAI + Anthropic Handoff: Se’kret Bip Founder Preview

Status: **development-only, integrated on `agent/founder-preview-unlock`, pending founder-device proof**

Audience:

- OpenAI Codex and ChatGPT coding agents
- Anthropic Claude Code and Claude coding agents
- Human maintainers reviewing feature readiness

This is the shared operating contract for letting the founder inspect the full Se’kret Bip product shape without opening unfinished or sensitive behavior to public users.

## Founder request translated into engineering scope

“All features unlocked” means:

1. Every built Teen route is reachable from one development catalog.
2. Every built Parent route is reachable from the same catalog.
3. Point-gated companions open without changing the real point wallet.
4. Hidden Expo Router routes become one-tap preview entries.
5. Implemented Crew and Bridge client gates open in development.
6. Features requiring real accounts, accepted links, permissions, or backend configuration say so clearly.
7. Architecture-only or incomplete features are labeled `FOUNDER PREVIEW` or `NOT BUILT YET` rather than impersonating finished software.
8. Production remains fail-closed.

It does **not** mean bypassing:

- age verification;
- authentication;
- guardian or parent consent;
- accepted Bip-ID relationships;
- Supabase Row Level Security;
- ownership checks;
- privacy boundaries;
- moderation or safety checks;
- microphone and device permissions;
- server-side rollout controls.

Those are safety and authorization boundaries, not product locks.

## Platform behavior

Canonical gate:

```text
src/constants/founderPreview.ts
```

Behavior:

| Environment | Default |
|---|---|
| Expo Go / native development | Founder Preview ON |
| Web development | Founder Preview OFF |
| Web development with `EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW=true` | Founder Preview ON |
| Any development platform with `EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW=false` | Founder Preview OFF |
| Production / `__DEV__ === false` | Founder Preview always OFF |

Web defaults closed so blank-browser onboarding, guardian verification, and authorization guardrail tests remain valid.

Commands:

```bash
# Expo Go / native development: preview opens by default
npx expo start --clear

# Controlled local web preview
EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW=true npx expo start --web --clear

# Test normal locked behavior
EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW=false npx expo start --clear
```

Do not redesign this as a client-only production founder authorization system. Production founder/admin tools must continue to rely on authenticated `app_profiles` roles and permissions.

## Where the founder opens everything

Primary route:

```text
/(dev)/feature-preview
```

Visible entry points:

- Teen side → **More** → **Open every Bip feature**
- Parent side → **Parent More** → **Open every Bip feature**

Source of truth:

```text
FOUNDER_PREVIEW_FEATURES
src/constants/founderPreview.ts
```

The catalog is grouped across Teen, Parent, and Founder surfaces.

Status meanings:

| Status | Meaning |
|---|---|
| `OPEN NOW` | Screen and core local flow are implemented. |
| `OPEN · NEEDS REAL DATA` | Screen is inspectable, but meaningful use requires an account, link, permission, record, or configured backend. |
| `SERVER ROLLOUT CLOSED` | Client UI exists, but the Worker or server cohort gate remains closed. |
| `FOUNDER PREVIEW` | A labeled local prototype or partial implementation is available. |
| `NOT BUILT YET` | Types, plans, or architecture exist, but no honest complete product surface exists. |

Never change these labels merely to make the product appear more complete.

## What is covered

### Teen surfaces

- Room and Bip Story return loop
- Pages, New Page, Pages History
- Calm and Breathe
- Voice Bip
- Circle and Circle Weather
- More
- Discover and Companion Picker
- Raylene, Rylane, Cloud, and Night chat routes
- Cloud Thoughts and Emergency Comfort
- Meaningful History
- Bip Points and Energy
- Growth Tools and Bippin 2
- Mind Reset, Body Reset, Body Workout
- Period Calendar and Chores
- Bip Crew
- Bridge and Se’krets 2 Tell compose mode
- Parent Link verification
- Memory & Continuity
- Profile, Settings, Resources
- Emotional Scrapbook visual prototype
- Approved Companion Memory readiness status

### Parent surfaces

- Parent Room and Parent Bridge
- Bridge AI Summary readiness status
- Parent Pages and Parent Circle
- Parent More and Dashboard
- Parent Calm
- Parent Voice Bip and Voice Reflect
- Repair and Growth tools
- Parent Se’kret Coach
- Parent S2Tell Inbox and Approvals
- Parent Period Calendar
- Parent Profile, Settings, Resources

### Founder surfaces

- Control Room
- Teen + Parent Split View
- Founder Feature Catalog
- Emotional Scrapbook prototype

## Preview points

File:

```text
src/features/activity/ledger.ts
```

Founder Preview exposes a display-only total of `999` points so Rylane, Cloud, and Night pass existing UI thresholds.

It must never:

- insert a point transaction;
- modify `point_balances`;
- create Bip Tickets;
- reserve or redeem rewards;
- change the intentional Bip Energy fade;
- create permanent room unlocks.

The ledger retains `actualTotal` and marks the displayed value with `isPreview`.

## Crew sample mode

File:

```text
src/screens/CrewAccountabilityScreen.tsx
```

When no real accepted Crew data exists, Founder Preview loads local sample members, check-ins, and encouragements. Sample interactions update React state only and write nothing to Supabase.

The real path still requires accepted connections and uses the guarded `get_public_circle_profiles` RPC instead of directly reading `circle_profiles`.

## Bridge Summary sample mode

File:

```text
src/features/bridge/ParentBridgeSummaryInbox.tsx
```

When no real summary exists, Founder Preview displays one labeled privacy-safe sample. It does not read teen content or insert a summary.

The sample demonstrates:

- generalized themes;
- non-surveillant conversation starters;
- explicit limitations;
- viewed/unviewed interaction.

## Emotional Scrapbook prototype

File:

```text
app/(dev)/scrapbook-preview.tsx
```

The visual prototype demonstrates private memory cards, frames, stickers, mood, soundtrack metadata, and future sharing boundaries.

It does **not** implement persistence, upload, storage, sharing, moderation, archive, edit, delete, or offline sync. Do not call it released or backend-complete.

## Bridge AI Summary server rollout

The client preview does not override:

```text
wrangler.toml
BRIDGE_SUMMARIES_ROLLOUT = "disabled"
```

The Worker supports:

- blank or `disabled`: nobody;
- `enabled`: everybody;
- comma-separated authenticated user UUIDs: controlled cohort.

Never set it to `enabled` merely for founder testing.

As verified on July 14, 2026, neither `mcgill.raylene@gmail.com` nor `sekretbip@gmail.com` exists in this Supabase project’s `auth.users` or `public.app_profiles`. There is therefore no verified founder UUID to allowlist yet.

After the real founder account exists:

1. Verify its email and UUID in Auth and `public.app_profiles`.
2. Verify `role`, `can_view_audits`, and `can_manage_app` through a trusted admin path.
3. Add only the exact UUID to `BRIDGE_SUMMARIES_ROLLOUT`.
4. Deploy and run controlled teen/parent proof.
5. Keep the sample clearly labeled until real proof passes.

## OpenAI implementation boundary

OpenAI-backed product calls must remain server-side.

Never put an OpenAI secret in Expo, React Native, committed environment files, or client bundle extras.

For Bridge Summaries preserve:

- `BRIDGE_JSON_SCHEMA`;
- `passesPrivacyValidator`;
- generalized themes and conversation starters;
- no source snippets returned to the parent;
- no raw private prompts persisted as summary output;
- fallback behavior when model output fails validation;
- authenticated ownership and cohort rollout checks.

An OpenAI coding agent must not claim an API-backed feature works merely because its local sample renders.

## Anthropic implementation boundary

Anthropic is not currently the configured production runtime provider in this repository.

If Claude is asked to add an Anthropic provider:

1. Use a server-side provider adapter.
2. Preserve the same JSON schema and privacy validator.
3. Preserve provenance without exposing source content.
4. Keep the OpenAI path until an explicit provider migration is approved.
5. Add provider-specific contract and fallback tests.
6. Do not interpret “Claude may edit the repo” as permission to replace OpenAI throughout the product.

Claude Code as a coding agent and Anthropic as a runtime provider are separate decisions.

## Rules both providers must preserve

OpenAI and Anthropic agents must not:

- bypass age, login, guardian, consent, or linking in production;
- weaken RLS or grants to make a preview load;
- use user-editable metadata for authorization;
- expose teen journals, voice notes, chats, moods, or private media to parents;
- turn Circle support into public popularity totals;
- write fake preview points into the economy;
- subtract Bip Tickets, redeemed rewards, or permanent room unlocks;
- disable the intentional Bip Energy fade;
- globally enable Bridge Summary generation for convenience;
- label sample data as backend proof;
- label a type definition as a completed feature.

## Validation

Required source and CI proof:

```bash
npm run type-check
node --test test/founder-preview-unlock.test.mjs
node --test test/feature-flow-contracts.test.mjs
node scripts/verify-implementation-ledger.mjs
npx playwright test
```

Manual Expo Go proof:

1. Open Teen More.
2. Tap **Open every Bip feature**.
3. Open Rylane, Cloud, and Night without changing real point data.
4. Open Crew and interact with the labeled sample state.
5. Open Parent Bridge and mark the sample summary viewed.
6. Open the Scrapbook prototype and change frames and stickers.
7. Switch between Teen and Parent routes.
8. Confirm Supabase point balances and transactions did not change.
9. Set `EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW=false`, reload, and confirm normal locks return.
10. Run blank-browser Playwright guardrails with web preview disabled.

## Truthful release state

Founder Preview is not a public release mechanism.

A feature remains:

- **prototype** until its durable data and complete user path exist;
- **integrated** until exact-head and controlled-account proof pass;
- **verified** only after device and authorization-boundary testing;
- **released** only after a real build or deployment and observation window.

The purpose is to let the founder see the complete product shape without corrupting production security or pretending unfinished work is finished.
