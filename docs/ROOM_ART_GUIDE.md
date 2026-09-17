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

## Runtime Source and Fallback Rules

The Teen User Room uses `components/rooms/BareRoomRenderer.tsx` as its production background authority. That renderer loads the room-only PNGs from `assets/images/archive/` directly so reference composites cannot drift into runtime.

1. `BareRoomRenderer` selects the archive PNG for the active legacy room key and lighting phase.
2. If the requested phase is unavailable in the map, the renderer falls back to that room's `day` variant.
3. The companion is rendered once by `UserRoomScreen` as a separate controlled visual layer with its own bounded tap target.
4. Scene/reference JPEG composites under `assets/images/resized-bg/*-room-*-scene.jpg` are design evidence only and must never be loaded as production room backgrounds.
5. Legacy `constants/theme.ts` room image entries may still serve other surfaces. Do not remove or reinterpret them without auditing those consumers separately.

See `ROOM_ASSET_MAP.md` for the production/reference/avatar source-of-truth split.

## Art Style Rules

- Room layout must remain unchanged between lighting variants. Only atmosphere and lighting should change.
- Production room backgrounds stay room-only. Do not bake a second companion into the background.
- The Teen User Room may render exactly one canonical companion visual above the room background, with interaction owned by a separate bounded hit target.
- Scene/reference composites are for composition review and prompt/reference work only, never runtime backgrounds.
- No duplicate companion visuals, sticker-style companion duplicates, or additional floating avatar copies.
- See [PHASE_2_ROOM_INTEGRATION.md](PHASE_2_ROOM_INTEGRATION.md) and `ROOM_ASSET_MAP.md` for the full runtime composition contract.

## Enforced By

```bash
npm run audit:runtime-assets   # confirms IMAGES keys resolve to real files
npm run verify:room-archives   # confirms archive backups are real and match live SHAs
```
