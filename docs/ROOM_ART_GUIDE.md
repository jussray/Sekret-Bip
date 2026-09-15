# Room Art Guide

This guide defines naming conventions, format requirements, fallback rules, and the asset map for all room background PNGs in Se'kret Bip.

## Naming Convention

All room backgrounds follow this exact pattern:

```
bg-{sekret}-room-{time-of-day}.png
```

### Se'kret slugs

Canonical display names are shown below. The `raylene` and `rylane` slugs remain legacy compatibility keys for existing assets and runtime state.

| Se'kret | Slug |
|---|---|
| Suhana | `raylene` |
| Sy | `rylane` |
| Cloud | `cloud` |
| Night | `night` |

### Time-of-day slugs

| Slug | Light condition |
|---|---|
| `day` | Morning sunlight |
| `midday` | Bright overhead sun |
| `afternoon` | Warm directional light |
| `evening` | Golden hour / low sun |
| `night` | Moonlit / window glow |
| `deep-night` | Dark ambient only |
| `rain` | Grey overcast / window rain |

### Full file list (28 files)

```
bg-raylene-room-day.png
bg-raylene-room-midday.png
bg-raylene-room-afternoon.png
bg-raylene-room-evening.png
bg-raylene-room-night.png
bg-raylene-room-deep-night.png
bg-raylene-room-rain.png

bg-rylane-room-day.png
bg-rylane-room-midday.png
bg-rylane-room-afternoon.png
bg-rylane-room-evening.png
bg-rylane-room-night.png
bg-rylane-room-deep-night.png
bg-rylane-room-rain.png

bg-cloud-room-day.png
bg-cloud-room-midday.png
bg-cloud-room-afternoon.png
bg-cloud-room-evening.png
bg-cloud-room-night.png
bg-cloud-room-deep-night.png
bg-cloud-room-rain.png

bg-night-room-day.png
bg-night-room-midday.png
bg-night-room-afternoon.png
bg-night-room-evening.png
bg-night-room-night.png
bg-night-room-deep-night.png
bg-night-room-rain.png
```

## Format Requirements

| Property | Requirement |
|---|---|
| File format | PNG |
| Minimum size | 1 MB (confirms real art, not a stub or placeholder) |
| Dimensions | Match original canvas — do not resize |
| Color space | sRGB |
| Transparency | Not required — rooms are full-bleed backgrounds |

## Fallback Rules

If a room background is missing or fails to load at runtime:

1. `constants/theme.ts` → `IMAGES` map provides the fallback chain.
2. The `BackgroundLayer` component falls back to the nearest time-of-day variant for the same Se'kret.
3. If no variant exists for that Se'kret, it falls back to the `day` variant.
4. If no day variant exists, it renders the solid theme color for that Se'kret.

Do not remove any `bg-*.png` entries from the `IMAGES` map in `constants/theme.ts` without updating the fallback chain.

## Art Style Rules

- Room layout must remain unchanged between variants — only lighting changes.
- Character composites (Phase 2) must be painted into the room, not layered on top.
- No floating avatars, no PNG overlays, no sticker-style placements.
- See [PHASE_2_ROOM_INTEGRATION.md](PHASE_2_ROOM_INTEGRATION.md) for the full composite spec.

## Enforced By

```bash
npm run audit:runtime-assets   # confirms IMAGES keys resolve to real files
npm run verify:room-archives   # confirms archive backups are real and match live SHAs
```
