# Se'kret Bip Figma Screen System

This document is the design handoff contract for new Se'kret Bip screens. Figma work should use the same identity, verification, permission, and privacy rules implemented in code.

## Design language

- Dark/night mode first
- Deep plum, indigo, smoky berry, paper beige, moon gold, and cloud blue
- Scrapbook layering, taped notes, stickers, private notebook textures, and soft glow
- Production-ready mobile layouts for React Native and Expo
- Standard frame: 390 x 844
- Minimum touch target: 44 x 44

Tokens live in `src/constants/designTokens.ts`.
Frame contracts live in `src/constants/figmaFrames.ts`.

## Product guardrails

- Parents verify safety and age; they do not receive private thoughts.
- Parents never receive journal text, Voice Bip transcripts, AI chats, private memories, private notes, or message bodies.
- No open stranger DMs.
- Public Circle identity never falls back to real account identity.
- Limited Mode keeps private wellness spaces available while social surfaces remain locked.
- Verification state drives routing and access. Figma screens must not invent separate boolean rules.

## Required first frames

1. Welcome
2. Teen Onboarding
3. Parent Onboarding
4. Limited Mode
5. Parent Link Verify
6. Emergency Alert
7. Parent Doorbell
8. Teen Profile

## Figma component families

Create reusable component sets for:

- scrapbook card: default, highlighted, locked, and quiet
- tape label: neutral, moon, cloud, and berry
- primary CTA: teen, parent, safety, and disabled
- status chip: unverified, pending, limited, verified, review, and suspended
- privacy label: private, shared by teen, parent-safe event, and circle-safe identity
- event card: info, watch, and urgent
- avatar identity card: account-private, public-circle, friends, crew, and parent context

## Screen handoff checklist

Every Figma frame must include:

- exact frame name from `FIGMA_FRAME_SPECS`
- route target
- user type
- purpose
- loading, empty, error, and pending states
- privacy annotation
- navigation in and out
- component names matching the shared component set
- safe-area behavior
- keyboard behavior for forms
- implementation notes for React Native

## Copy tone

Copy should sound like a protective older cousin: warm, direct, slightly playful, never clinical or controlling.

Preferred:

- “Your private spaces are ready now.”
- “A trusted adult helps unlock the social side. They do not get access to your thoughts.”
- “Quiet right now. That is okay.”

Avoid:

- surveillance language
- punishment-first wording
- medicalized language when not necessary
- promises that a parent can view private content

## Implementation boundary

Perplexity/Figma owns visual hierarchy, component variants, motion ideas, responsive layouts, and microcopy proposals.

GitHub architecture owns identity types, verification transitions, permissions, routing guards, parent-safe event payloads, and tests.

Design may propose enhancements, but it must consume the shared contracts rather than create alternate identity or verification models.
