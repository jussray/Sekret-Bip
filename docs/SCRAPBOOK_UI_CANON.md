# Se’kret Bip Scrapbook UI Canon

Status: **canonical visual direction for teen mobile companion scenes**  
First approved receipt: **Sy — Evening Check-In**  
Reference frame: `docs/design/reference/scrapbook-evening-sy-reference.jpg`  
Target frame: **390 × 844 mobile**

## Product intent

Se’kret Bip should feel like a private sketchbook a teen actually wants to return to, not a clinical dashboard. Companion scenes combine a lived-in room with handmade paper layers so emotional check-ins feel personal, expressive, and grounded in the Bip world.

## Visual contract

Every scrapbook companion scene should preserve these ingredients unless a later approved design explicitly supersedes them:

- white or warm-white sketchbook-paper surfaces;
- imperfect masking-tape attachments;
- hand-drawn doodles, arrows, stars, moons, or hearts;
- slightly rotated white Polaroid-style character frames;
- cozy dark-mode room backgrounds rather than flat dashboard panels;
- warm interior light paired with cooler window/moon light where appropriate;
- time-of-day-aware atmosphere using the existing `getRoomPhase` / `getRoomScene` system;
- companion art as a separate actor layer so one layout can be reused across companions;
- deliberately imperfect spacing/rotation so the composition feels assembled by hand rather than generated from a rigid card grid;
- readable contrast and at least 44pt interactive targets for mobile controls.

The dark room remains the product world. Paper, tape, doodles, and Polaroids sit **inside that world** instead of replacing it with a generic white UI.

## Companion identity

Visible names are canonical:

- **Suhana**
- **Sy**
- **Cloud**
- **Night**

Legacy identifiers may remain only as internal compatibility aliases while the runtime is migrated:

```text
raylene -> Suhana
rylane  -> Sy
```

Do not surface `Raylene` or `Rylane` as current character copy.

## First approved scene

The first locked composition is **Sy — Evening Check-In**:

- cozy nighttime bedroom / city-window atmosphere;
- moon and hand-drawn star/heart doodles;
- central taped Polaroid frame;
- character inside the Polaroid;
- torn-paper-style note reading `you made it through today.`;
- scrapbook CTA reading `Bip with Sy →`;
- pink/violet accent appropriate to the evening scene.

The approved generated reference is design evidence. It is not proof that the Expo implementation visually matches until the same route is rendered and inspected.

## Runtime implementation

Reusable scene component:

- `components/rooms/ScrapbookCompanionScene.tsx`

Teen route:

- `app/(teen)/scrapbook-check-in.tsx`

Room entry point:

- `app/(teen)/room.tsx` renders `ScrapbookCheckInLauncher`

Route registry:

- `src/teen/routes.ts` → `scrapbookCheckIn`

The scene resolves the selected companion into the existing compatibility key, chooses the existing companion/room assets, resolves the current room phase, and renders one shared scrapbook composition rather than four copied screens.

The main CTA continues into the existing Se’kret Pages path with the active companion selected. This slice does not introduce a second chat backend, second journal system, new database state, or new telemetry.

## Time-of-day behavior

The layout is stable while atmosphere and short copy shift with the existing Room phase:

- day / midday: lighter warmth;
- afternoon: golden warmth;
- evening: violet-pink glow and `you made it through today.`;
- rain: cool blue softness;
- night / deepNight: darker violet/indigo atmosphere and quieter copy.

Do not create a separate navigation tree for each time period.

## Privacy and data boundary

Supabase dependency for this UI slice: **none**.

The scene reads the already-selected companion and local theme/asset state. It does not add journal reads, message reads, parent visibility, analytics payloads, profile data, image uploads, microphone access, or private-data persistence.

## Verification state

Implementation status: **integrated on feature branch**.  
Design QA status: **blocked until an actual rendered 390 × 844 capture of the route is compared with the approved reference**.  
Release status: **not released by this document**.

Required before merge/release claims:

1. focused scrapbook UI contract test;
2. TypeScript check;
3. lint;
4. Expo/web build as required by the current release gate;
5. Product Design Playwright or equivalent rendered-route capture;
6. visual comparison for typography, spacing, paper/tape/Polaroid fidelity, companion placement, time-of-day atmosphere, responsiveness, and visible accessibility risks;
7. exact-head repository/release checks.

## Rollback

Remove the scrapbook route registration, hidden tab entry, Room launcher, reusable scene component, reference asset, contract test, and this canon document. No database or provider rollback is required for this slice.
