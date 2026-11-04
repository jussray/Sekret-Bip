# Historical onboarding root implementations before canonicalization

This file preserves exact recovery coordinates for the two superseded root-level onboarding implementations. They were not erased from repository history; their active paths now re-export the canonical implementations under `src/` so the repository has one runtime state machine.

## Snapshot authority

- Base commit: `9cd5d6d4641160b9425320e31482a4bd05eb25c2`
- Snapshot date: 2026-07-23
- Status: historical source, not active runtime authority

## Original root service

- Original path: `services/onboarding.ts`
- Exact blob SHA: `c558e86cbac57b9139833367bed609fb73c11cf1`
- Commit-pinned source: <https://github.com/jussray/Sekret-Bip/blob/9cd5d6d4641160b9425320e31482a4bd05eb25c2/services/onboarding.ts>
- Current active authority: `src/services/onboarding.ts`
- Current compatibility path: `services/onboarding.ts`

## Original root context

- Original path: `context/OnboardingContext.tsx`
- Exact blob SHA: `6b4e520824638d3d5a75c1b74a1be804d66b1fa7`
- Commit-pinned source: <https://github.com/jussray/Sekret-Bip/blob/9cd5d6d4641160b9425320e31482a4bd05eb25c2/context/OnboardingContext.tsx>
- Current active authority: `src/context/OnboardingContext.tsx`
- Current compatibility path: `context/OnboardingContext.tsx`

## Why the active files changed

The root implementation targeted the correct table and contained useful helpers, but it was outside the active import path and depended on a context boundary that was not present. The active `src/` implementation was much thinner and targeted a table that does not exist. PR #595 consolidates the useful behavior into the active `src/` path, while these commit- and blob-pinned coordinates preserve the exact prior source for audit, comparison, or restoration.

Do not restore either snapshot as a second active implementation. Port any future useful behavior into the canonical `src/` service and context with focused tests.
