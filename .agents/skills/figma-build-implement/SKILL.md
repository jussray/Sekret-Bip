---
name: figma-build-implement
description: Build, implement, and verify Se'kret Bip product UI through Figma without weakening teen privacy, consent, Expo architecture, or release proof.
---

# Se'kret Bip Figma Build + Implementation

Load this skill for every Figma, design-system, screen-design, design-to-code, Code Connect, visual QA, or Figma handoff task in this repository.

## Required tool skills

- Load `figma-use` before every Figma write.
- Load `figma-generate-library` when creating or changing tokens, variables, components, variants, themes, or a reusable library.
- Use `figma-generate-design` only to capture a running web view into an existing design file; rebuild editable structure with `figma-use`.
- Use `figma-code-connect` only when the component is published, a node-specific Figma URL is available, the plan supports Code Connect, and the mapped TypeScript component has been verified.
- Use Product Design image-to-code or design QA only after the product brief and target implementation are explicit.

## Repository profile

- Runtime: Expo Router, React Native, TypeScript, Expo web, Supabase, and Cloudflare Workers.
- Preferred implementation: existing React Native primitives, existing components, Expo APIs, and existing services before new abstractions or dependencies.
- Primary design targets: teen screens, parent screens, onboarding, settings, Parent Bridge, companion and room states, Circle-safe surfaces, founder preview, and responsive Expo web.
- Source-of-truth code: current `app/`, `src/components/`, `src/services/`, shared types, current design tokens, and verified runtime behavior.
- Figma is an editable specification and review surface. It is never proof that a screen, consent rule, auth boundary, database path, or runtime behavior exists.

## Mandatory operating sequence

1. Run the repository 5W1H contract and verify `SPRINT.md`/repo truth.
2. Redteam the requested experience before designing it: privacy, age appropriateness, coercion, parent visibility, anonymous identity, accessibility, offline/error states, and unsupported clinical implications.
3. Inspect existing code and Figma assets. Reuse existing routes, components, tokens, room blueprints, and design-system library assets before creating new ones.
4. Lock the exact design scope: account side, route, device classes, states, content classification, implementation files, and proof commands.
5. Build foundations before components; build components before screens; keep mobile and responsive web behavior explicit.
6. Implement the selected design in Expo/React Native. Do not create a parallel web-only product path unless the task explicitly requires one.
7. Redteam the implemented plan again: auth, consent, RLS assumptions, real-device behavior, loading/error/empty states, leakage, rollback, and whether the Figma file drifted from code.
8. Verify the smallest applicable stack: TypeScript/contracts, Expo web or build checks, Playwright for web behavior, and Maestro or controlled device proof for native-critical flows.
9. Record exact Figma file/node URLs, code paths, tests, screenshots/traces, known differences, rollback, and the next founder gate.

## Data and safety boundary

- Use synthetic or deliberately redacted fixture content in Figma and screenshots.
- Never place real teen or parent names, journal text, voice transcripts, private messages, safety signals, identifiers, tokens, or service keys into Figma.
- Do not represent optional parent visibility as mandatory.
- Do not design dark patterns around consent, linking, sharing, retention, deletion, or safety escalation.
- Do not change auth, consent, account linking, RLS, privacy, or production data because a mockup implies it; those remain separate implementation and approval gates.

## Code Connect contract

Code Connect is optional and conditional. Before mapping:

- prove the component is published to an eligible team library;
- use the exact Figma node ID;
- inspect the actual TypeScript props;
- map every Figma variant exhaustively;
- never invent props or expose private content in examples;
- store templates beside the repo's verified Figma configuration, creating that configuration only in a dedicated reviewed change.

## Definition of done

A Figma task is complete only when the editable design, repo implementation status, responsive/state coverage, accessibility review, privacy review, exact evidence, unresolved differences, and rollback are all reported truthfully. A screenshot, prototype link, or local preview alone is not implementation proof.
