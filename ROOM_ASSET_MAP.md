# ROOM_ASSET_MAP.md
# Se'kret Bip — Room Asset Inventory
# Generated: Phase 1 extraction planning document
# Status: INVENTORY ONLY — no assets deleted or moved

---

## HOW TO READ THIS FILE

- **Source Room** — which room background this element currently lives inside
- **Asset Filename** — current filename (backgrounds) or proposed extraction filename (baked elements)
- **Status** — `production` (live), `archive` (backup copy), `reference` (design mockup only), `baked` (embedded in flat PNG, needs extraction)
- **Recolor** — whether the element is a good candidate for palette-swap color variants
- **Hotspot** — whether this element currently acts as (or should become) an interactive hotspot
- **Extraction Priority** — `HIGH` (needed for user room MVP), `MED` (next phase), `LOW` (future)

---

## SECTION 1 — ROOM BACKGROUNDS (Flat PNG composites)

These are fully rendered single-layer PNGs. Each image contains walls, lighting, furniture, and hotspot objects all baked together. Extraction = slicing in Figma/Photoshop to produce separate layers.

### 1A — Raylene Room (7 phases × 2 copies = 14 files)

| Phase | Production File | Archive File | Status |
|-------|----------------|--------------|--------|
| Day | `assets/images/bg-raylene-room-day.png` | `assets/images/archive/bg-raylene-room-day.png` | production + archive |
| Midday | `assets/images/bg-raylene-room-midday.png` | `assets/images/archive/bg-raylene-room-midday.png` | production + archive |
| Afternoon | `assets/images/bg-raylene-room-afternoon.png` | `assets/images/archive/bg-raylene-room-afternoon.png` | production + archive |
| Evening | `assets/images/bg-raylene-room-evening.png` | `assets/images/archive/bg-raylene-room-evening.png` | production + archive |
| Night | `assets/images/bg-raylene-room-night.png` | `assets/images/archive/bg-raylene-room-night.png` | production + archive |
| Deep Night | `assets/images/bg-raylene-room-deep-night.png` | `assets/images/archive/bg-raylene-room-deep-night.png` | production + archive |
| Rain | `assets/images/bg-raylene-room-rain.png` | `assets/images/archive/bg-raylene-room-rain.png` | production + archive |

**Raylene Room — Baked Elements Inventory:**

| Element | Type | Current Status | Proposed Extraction Filename | Recolor | Hotspot | Priority |
|---------|------|---------------|------------------------------|---------|---------|----------|
| Walls + floor + ceiling | Structural | baked | `assets/rooms/base/raylene-bare-room.png` | NO | NO | HIGH |
| Fairy light string | Structural / lighting | baked | `assets/rooms/decor/raylene-fairy-lights.png` | YES (color tint) | NO | MED |
| Window (left wall) | Structural | baked | `assets/rooms/base/raylene-window.png` | NO | YES (moodCheckIn) | HIGH |
| Bed (right side) | Furniture | baked | `assets/rooms/furniture/bed-raylene.png` | YES | YES (comfort) | HIGH |
| Journal / notebook | Hotspot Object | baked | `assets/rooms/hotspots/journal-raylene.png` | YES | YES (pages) | HIGH |
| Headphones | Hotspot Object | baked | `assets/rooms/hotspots/headphones-raylene.png` | YES | YES (voiceBip) | HIGH |
| Cloud lamp | Hotspot Object | baked | `assets/rooms/hotspots/cloud-lamp.png` | YES | YES (cloudThoughts) | HIGH |
| Corkboard / growth board | Furniture | baked | `assets/rooms/furniture/corkboard-raylene.png` | YES | YES (bippin2) | MED |
| Photo wall | Furniture | baked | `assets/rooms/furniture/photo-wall-raylene.png` | YES | YES (circle) | MED |
| Bridge object | Hotspot Object | baked | `assets/rooms/hotspots/bridge-raylene.png` | NO | YES (bridge) | MED |
| Rug | Furniture | baked | `assets/rooms/furniture/rug-raylene.png` | YES | NO | MED |
| Desk | Furniture | baked | `assets/rooms/furniture/desk-raylene.png` | YES | NO | MED |
| Shelves | Furniture | baked | `assets/rooms/furniture/shelves-raylene.png` | YES | NO | LOW |
| Decorative plants | Decor | baked | `assets/rooms/decor/plant-raylene.png` | NO | NO | LOW |
| Mood lighting overlay (per phase) | Lighting | code (ROOM_PHASE_OVERLAYS) | — | YES | NO | — |

---

### 1B — Rylane Room (7 phases × 2 copies = 14 files)

| Phase | Production File | Archive File | Status |
|-------|----------------|--------------|--------|
| Day | `assets/images/bg-rylane-room-day.png` | `assets/images/archive/bg-rylane-room-day.png` | production + archive |
| Midday | `assets/images/bg-rylane-room-midday.png` | `assets/images/archive/bg-rylane-room-midday.png` | production + archive |
| Afternoon | `assets/images/bg-rylane-room-afternoon.png` | `assets/images/archive/bg-rylane-room-afternoon.png` | production + archive |
| Evening | `assets/images/bg-rylane-room-evening.png` | `assets/images/archive/bg-rylane-room-evening.png` | production + archive |
| Night | `assets/images/bg-rylane-room-night.png` | `assets/images/archive/bg-rylane-room-night.png` | production + archive |
| Deep Night | `assets/images/bg-rylane-room-deep-night.png` | `assets/images/archive/bg-rylane-room-deep-night.png` | production + archive |
| Rain | `assets/images/bg-rylane-room-rain.png` | `assets/images/archive/bg-rylane-room-rain.png` | production + archive |

**Rylane Room — Baked Elements Inventory:**

| Element | Type | Current Status | Proposed Extraction Filename | Recolor | Hotspot | Priority |
|---------|------|---------------|------------------------------|---------|---------|----------|
| Walls + floor + ceiling | Structural | baked | `assets/rooms/base/rylane-bare-room.png` | NO | NO | HIGH |
| City window (left, large) | Structural | baked | `assets/rooms/base/rylane-window.png` | NO | YES (moodCheckIn) | HIGH |
| Neon signs / city glow | Structural / lighting | baked | `assets/rooms/decor/rylane-neon-glow.png` | YES (tint) | NO | MED |
| Bed (right side) | Furniture | baked | `assets/rooms/furniture/bed-rylane.png` | YES | YES (comfort) | HIGH |
| Journal / notebook (desk) | Hotspot Object | baked | `assets/rooms/hotspots/journal-rylane.png` | YES | YES (pages) | HIGH |
| Headphones (center) | Hotspot Object | baked | `assets/rooms/hotspots/headphones-rylane.png` | YES | YES (voiceBip) | HIGH |
| Cloud neon sign | Hotspot Object | baked | `assets/rooms/hotspots/cloud-neon.png` | YES | YES (cloudThoughts) | HIGH |
| Growth board (top center) | Furniture | baked | `assets/rooms/furniture/corkboard-rylane.png` | YES | YES (bippin2) | MED |
| Photo wall (right) | Furniture | baked | `assets/rooms/furniture/photo-wall-rylane.png` | YES | YES (circle) | MED |
| Bridge object | Hotspot Object | baked | `assets/rooms/hotspots/bridge-rylane.png` | NO | YES (bridge) | MED |
| Desk | Furniture | baked | `assets/rooms/furniture/desk-rylane.png` | YES | NO | MED |
| Rug / floor mat | Furniture | baked | `assets/rooms/furniture/rug-rylane.png` | YES | NO | MED |
| Shelves | Furniture | baked | `assets/rooms/furniture/shelves-rylane.png` | YES | NO | LOW |
| String lights | Decor | baked | `assets/rooms/decor/lights-rylane.png` | YES | NO | LOW |

---

### 1C — Cloud Room (7 phases, production only)

| Phase | Production File | Archive File | Status |
|-------|----------------|--------------|--------|
| Day | `assets/images/bg-cloud-room-day.png` | `assets/images/archive/bg-cloud-room-day.png` | production + archive |
| Midday | `assets/images/bg-cloud-room-midday.png` | `assets/images/archive/bg-cloud-room-midday.png` | production + archive |
| Afternoon | `assets/images/bg-cloud-room-afternoon.png` | `assets/images/archive/bg-cloud-room-afternoon.png` | production + archive |
| Evening | `assets/images/bg-cloud-room-evening.png` | `assets/images/archive/bg-cloud-room-evening.png` | production + archive |
| Night | `assets/images/bg-cloud-room-night.png` | `assets/images/archive/bg-cloud-room-night.png` | production + archive |
| Deep Night | `assets/images/bg-cloud-room-deep-night.png` | `assets/images/archive/bg-cloud-room-deep-night.png` | production + archive |
| Rain | `assets/images/bg-cloud-room-rain.png` | `assets/images/archive/bg-cloud-room-rain.png` | production + archive |

**Note:** Cloud Room has no traditional walls — it is a floating sky/cloud environment. The structural layer IS the sky and cloud islands themselves. Extraction model differs from bedroom-style rooms.

**Cloud Room — Baked Elements Inventory:**

| Element | Type | Current Status | Proposed Extraction Filename | Recolor | Hotspot | Priority |
|---------|------|---------------|------------------------------|---------|---------|----------|
| Sky background / gradient | Structural | baked | `assets/rooms/base/cloud-bare-sky.png` | YES (tint) | NO | HIGH |
| Cloud islands / platform clouds | Structural | baked | `assets/rooms/base/cloud-islands.png` | YES | NO | HIGH |
| Floating headphones | Hotspot Object | baked | `assets/rooms/hotspots/headphones-cloud.png` | YES | YES (calm) | HIGH |
| Floating journal | Hotspot Object | baked | `assets/rooms/hotspots/journal-cloud.png` | YES | YES (pages) | HIGH |
| Cloud mic | Hotspot Object | baked | `assets/rooms/hotspots/mic-cloud.png` | YES | YES (voiceBip) | HIGH |
| Big cloud (top thought cloud) | Hotspot Object | baked | `assets/rooms/hotspots/thought-cloud.png` | YES | YES (cloudThoughts) | HIGH |
| Atmospheric glow / stars | Decor | baked | `assets/rooms/decor/cloud-glow.png` | YES | NO | MED |
| Soft particle effects | Lighting | code / visual | — | YES | NO | LOW |

---

### 1D — Night Room (7 phases, production only)

| Phase | Production File | Archive File | Status |
|-------|----------------|--------------|--------|
| Day | `assets/images/bg-night-room-day.png` | `assets/images/archive/bg-night-room-day.png` | production + archive |
| Midday | `assets/images/bg-night-room-midday.png` | `assets/images/archive/bg-night-room-midday.png` | production + archive |
| Afternoon | `assets/images/bg-night-room-afternoon.png` | `assets/images/archive/bg-night-room-afternoon.png` | production + archive |
| Evening | `assets/images/bg-night-room-evening.png` | `assets/images/archive/bg-night-room-evening.png` | production + archive |
| Night | `assets/images/bg-night-room-night.png` | `assets/images/archive/bg-night-room-night.png` | production + archive |
| Deep Night | `assets/images/bg-night-room-deep-night.png` | `assets/images/archive/bg-night-room-deep-night.png` | production + archive |
| Rain | `assets/images/bg-night-room-rain.png` | `assets/images/archive/bg-night-room-rain.png` | production + archive |

**Night Room — Baked Elements Inventory:**

| Element | Type | Current Status | Proposed Extraction Filename | Recolor | Hotspot | Priority |
|---------|------|---------------|------------------------------|---------|---------|----------|
| Walls + floor | Structural | baked | `assets/rooms/base/night-bare-room.png` | NO | NO | HIGH |
| City window (top-left, large) | Structural | baked | `assets/rooms/base/night-window.png` | NO | YES (cloudThoughts) | HIGH |
| Moon chair / crescent chair | Furniture | baked | `assets/rooms/furniture/moon-chair-night.png` | YES | YES (comfort) | HIGH |
| Journal / desk area | Hotspot Object | baked | `assets/rooms/hotspots/journal-night.png` | YES | YES (pages) | HIGH |
| Voice Bip Corner sign | Hotspot Object | baked | `assets/rooms/hotspots/voice-corner-night.png` | YES | YES (voiceBip) | HIGH |
| Bridge / reach out element | Hotspot Object | baked | `assets/rooms/hotspots/bridge-night.png` | NO | YES (bridge) | MED |
| Desk | Furniture | baked | `assets/rooms/furniture/desk-night.png` | YES | NO | MED |
| Night clock / time element | Decor | baked | `assets/rooms/decor/clock-night.png` | YES | NO | LOW |
| Ambient city glow (window) | Lighting | baked | `assets/rooms/decor/city-glow-night.png` | YES | NO | LOW |
| Deep violet atmosphere overlay | Lighting | code (CHARACTER_OVERLAYS) | — | YES | NO | — |

---

### 1E — Parent Rooms (5 phases each)

| Room | Files | Status |
|------|-------|--------|
| Mom Room | `bg-mom-room-day/evening/night/deep-night/rain.png` | production (no archive) |
| Dad Room | `bg-dad-room-day/evening/night/deep-night/rain.png` | production (no archive) |

**Note:** Parent rooms are NOT part of the User Room customization system. They remain as-is. No extraction planned for Phase 1.

---

## SECTION 2 — SCENE COMPOSITES

Pre-rendered merges of character + room background. These are reference/marketing assets.

| File | Character | Phase | Usage | Status |
|------|-----------|-------|-------|--------|
| `assets/images/raylene-room-day-scene.png` | Raylene | Day | Reference | reference |
| `assets/images/raylene-room-night-scene.png` | Raylene | Night | Reference | reference |
| `assets/images/raylene-room-rain-scene.png` | Raylene | Rain | Reference | reference |
| `assets/images/rylane-room-day-scene.png` | Rylane | Day | Reference | reference |
| `assets/images/rylane-room-night-scene.png` | Rylane | Night | Reference | reference |
| `assets/images/rylane-room-rain-scene.png` | Rylane | Rain | Reference | reference |
| `assets/images/cloud-room-day-scene.png` | Cloud | Day | Reference | reference |
| `assets/images/night-room-night-scene.png` | Night | Night | Reference | reference |

**Action:** Keep as-is. Do not delete. Do not render in production UI.

---

## SECTION 3 — CHARACTER IMAGES (Avatar layer — already separate)

These are already separate from room backgrounds. They render as a floating image layer on top of the room background in `RoomScreen.tsx`. These are ready for the avatar layer in the new system with no extraction needed.

### 3A — Raylene (17 states)

| File | Mood/State | Recolor | Hotspot | Production |
|------|-----------|---------|---------|------------|
| `assets/images/raylene-neutral-new.png` | neutral | NO | NO | YES |
| `assets/images/raylene-neutral-v3.png` | neutral v3 | NO | NO | YES |
| `assets/images/raylene-happy-new.png` | happy | NO | NO | YES |
| `assets/images/raylene-happy-v3.png` | happy v3 | NO | NO | YES |
| `assets/images/raylene-confident-new.png` | confident | NO | NO | YES |
| `assets/images/raylene-playful-new.png` | playful | NO | NO | YES |
| `assets/images/raylene-sad-new.png` | sad | NO | NO | YES |
| `assets/images/raylene-mad-new.png` | mad | NO | NO | YES |
| `assets/images/raylene-surprised-new.png` | surprised | NO | NO | YES |
| `assets/images/raylene-crouching-new.png` | crouching | NO | NO | YES |
| `assets/images/raylene-thinking-new.png` | thinking | NO | NO | YES |
| `assets/images/raylene-window-new.png` | window / wistful | NO | NO | YES |
| `assets/images/raylene-window-rainy.png` | window / rain | NO | NO | YES |
| `assets/images/raylene-writing.png` | writing | NO | NO | YES |
| `assets/images/raylene-voice-day.png` | voice active (day) | NO | NO | YES |
| `assets/images/raylene-voice-night.png` | voice active (night) | NO | NO | YES |
| `assets/images/raylene-fullbody.png` | full body standing | NO | NO | YES |

### 3B — Rylane (10 states)

| File | Mood/State | Recolor | Hotspot | Production |
|------|-----------|---------|---------|------------|
| `assets/images/rylane-neutral.png` | neutral | NO | NO | YES |
| `assets/images/rylane-neutral-v2.png` | neutral v2 | NO | NO | YES |
| `assets/images/rylane-happy.png` | happy | NO | NO | YES |
| `assets/images/rylane-thinking.png` | thinking | NO | NO | YES |
| `assets/images/rylane-writing.png` | writing | NO | NO | YES |
| `assets/images/rylane-window.png` | window | NO | NO | YES |
| `assets/images/rylane-window-day.png` | window (day) | NO | NO | YES |
| `assets/images/rylane-fullbody.png` | full body | NO | NO | YES |
| `assets/images/rylane-voice-day.png` | voice active (day) | NO | NO | YES |
| `assets/images/rylane-voice-night.png` | voice active (night) | NO | NO | YES |

### 3C — Cloud (6 states)

| File | Mood/State | Recolor | Hotspot | Production |
|------|-----------|---------|---------|------------|
| `assets/images/cloud.png` | neutral / default | NO | NO | YES |
| `assets/images/cloud-happy.png` | happy | NO | NO | YES |
| `assets/images/cloud-headphones.png` | headphones on | NO | NO | YES |
| `assets/images/cloud-headphones-v2.png` | headphones v2 | NO | NO | YES |
| `assets/images/cloud-sleepy.png` | sleepy | NO | NO | YES |
| `assets/images/cloud-stormy.png` | stormy | NO | NO | YES |

### 3D — Night (20 states)

| File | Mood/State | Recolor | Hotspot | Production |
|------|-----------|---------|---------|------------|
| `assets/images/night-neutral.png` | neutral | NO | NO | YES |
| `assets/images/night-softsmile.png` | soft smile | NO | NO | YES |
| `assets/images/night-happy.png` | happy | NO | NO | YES |
| `assets/images/night-thinking.png` | thinking | NO | NO | YES |
| `assets/images/night-tired.png` | tired | NO | NO | YES |
| `assets/images/night-annoyed.png` | annoyed | NO | NO | YES |
| `assets/images/night-sad.png` | sad | NO | NO | YES |
| `assets/images/night-overwhelmed.png` | overwhelmed | NO | NO | YES |
| `assets/images/night-protective.png` | protective | NO | NO | YES |
| `assets/images/night-lonely.png` | lonely | NO | NO | YES |
| `assets/images/night-hopeful.png` | hopeful | NO | NO | YES |
| `assets/images/night-relaxed.png` | relaxed | NO | NO | YES |
| `assets/images/night-listening.png` | listening | NO | NO | YES |
| `assets/images/night-writing.png` | writing | NO | NO | YES |
| `assets/images/night-window.png` | window / gazing | NO | NO | YES |
| `assets/images/night-playful.png` | playful | NO | NO | YES |
| `assets/images/night-hurting.png` | hurting | NO | NO | YES |
| `assets/images/night-inhishead.png` | in his head | NO | NO | YES |
| `assets/images/night-in-love.png` | in love | NO | NO | YES |
| `assets/images/night-fullbody.png` | full body | NO | NO | YES |

---

## SECTION 4 — STICKER LIBRARY (53 stickers, already separate)

Stickers are already individual PNGs and are the primary candidate for room decoration layer items in the User Room system.

### 4A — Raylene Stickers (19 production)

| File | Label | Mood/Pose | Recolor | Room Decor Use | Production |
|------|-------|-----------|---------|----------------|------------|
| `stickers/raylene/raylene-sticker-standing.png` | Standing | neutral | YES | YES | YES |
| `stickers/raylene/raylene-sticker-lounging.png` | Lounging | relaxed | YES | YES | YES |
| `stickers/raylene/raylene-sticker-studying.png` | Studying | focused | YES | YES | YES |
| `stickers/raylene/raylene-sticker-sleepy.png` | Sleepy | tired | YES | YES | YES |
| `stickers/raylene/raylene-sticker-peace.png` | Peace | calm | YES | YES | YES |
| `stickers/raylene/raylene-sticker-listening.png` | Listening | present | YES | YES | YES |
| `stickers/raylene/raylene-sticker-comfort.png` | Comfort | warm | YES | YES | YES |
| `stickers/raylene/raylene-sticker-sunglasses.png` | Sunglasses | playful | YES | YES | YES |
| `stickers/raylene/raylene-sticker-happy.png` | Happy | happy | YES | YES | YES |
| `stickers/raylene/raylene-sticker-journaling.png` | Journaling | focused | YES | YES | YES |
| `stickers/raylene/raylene-sticker-thinking.png` | Thinking | thoughtful | YES | YES | YES |
| `stickers/raylene/raylene-sticker-boba.png` | Boba | cozy | YES | YES | YES |
| `stickers/raylene/raylene-sticker-crown.png` | Crown | confident | YES | YES | YES |
| `stickers/raylene/raylene-sticker-sunnies.png` | Sunnies | playful | YES | YES | YES |
| `stickers/raylene/raylene-sticker-hoodie.png` | Hoodie | cozy | YES | YES | YES |
| `stickers/raylene/raylene-sticker-sekret-bip.png` | Se'kret Bip | brand | YES | YES | YES |
| `stickers/raylene/raylene-sticker-sekret-heart.png` | Se'kret Heart | love | YES | YES | YES |
| `stickers/raylene/raylene-sticker-pillow.png` | Pillow | cozy | YES | YES | YES |
| `stickers/raylene/raylene-sticker-icon-cloud.png` | Cloud Icon | brand | YES | YES | YES |

### 4B — Rylane Stickers (19 production)

| File | Label | Mood/Pose | Recolor | Room Decor Use | Production |
|------|-------|-----------|---------|----------------|------------|
| `stickers/rylane/rylane-sticker-mini.png` | Mini | neutral | YES | YES | YES |
| `stickers/rylane/rylane-sticker-reading.png` | Reading | focused | YES | YES | YES |
| `stickers/rylane/rylane-sticker-phone.png` | Phone | casual | YES | YES | YES |
| `stickers/rylane/rylane-sticker-thinking.png` | Thinking | thoughtful | YES | YES | YES |
| `stickers/rylane/rylane-sticker-sitting.png` | Sitting | relaxed | YES | YES | YES |
| `stickers/rylane/rylane-sticker-headphones.png` | Headphones | music | YES | YES | YES |
| `stickers/rylane/rylane-sticker-hoodie.png` | Hoodie | cozy | YES | YES | YES |
| `stickers/rylane/rylane-sticker-calm.png` | Calm | calm | YES | YES | YES |
| `stickers/rylane/rylane-sticker-stormy.png` | Stormy | stormy | YES | YES | YES |
| `stickers/rylane/rylane-sticker-peace.png` | Peace | peaceful | YES | YES | YES |
| `stickers/rylane/rylane-sticker-happy.png` | Happy | happy | YES | YES | YES |
| `stickers/rylane/rylane-sticker-sleepy.png` | Sleepy | tired | YES | YES | YES |
| `stickers/rylane/rylane-sticker-night.png` | Night | late night | YES | YES | YES |
| `stickers/rylane/rylane-sticker-music.png` | Music | music | YES | YES | YES |
| `stickers/rylane/rylane-sticker-late-night.png` | Late Night | night | YES | YES | YES |
| `stickers/rylane/rylane-sticker-protect.png` | Protect | protective | YES | YES | YES |
| `stickers/rylane/rylane-sticker-why-i-love.png` | Why I Love | love | YES | YES | YES |
| `stickers/rylane/rylane-sticker-writing.png` | Writing | writing | YES | YES | YES |
| `stickers/rylane/rylane-sticker-speech.png` | Speech | expressive | YES | YES | YES |

### 4C — Cloud Stickers (15 production)

| File | Label | Mood/Pose | Recolor | Room Decor Use | Production |
|------|-------|-----------|---------|----------------|------------|
| `stickers/cloud/cloud-sticker-sleepy.png` | Sleepy | tired | YES | YES | YES |
| `stickers/cloud/cloud-sticker-happy.png` | Happy | happy | YES | YES | YES |
| `stickers/cloud/cloud-sticker-listening.png` | Listening | present | YES | YES | YES |
| `stickers/cloud/cloud-sticker-voice-bip.png` | Voice Bip | voice active | YES | YES | YES |
| `stickers/cloud/cloud-sticker-journal.png` | Journal | journaling | YES | YES | YES |
| `stickers/cloud/cloud-sticker-comfort.png` | Comfort | warm | YES | YES | YES |
| `stickers/cloud/cloud-sticker-hug.png` | Hug | loving | YES | YES | YES |
| `stickers/cloud/cloud-sticker-proud.png` | Proud | proud | YES | YES | YES |
| `stickers/cloud/cloud-sticker-stormy.png` | Stormy | stormy | YES | YES | YES |
| `stickers/cloud/cloud-sticker-crying.png` | Crying | sad | YES | YES | YES |
| `stickers/cloud/cloud-sticker-cheer.png` | Cheer | energetic | YES | YES | YES |
| `stickers/cloud/cloud-sticker-cozy.png` | Cozy | cozy | YES | YES | YES |
| `stickers/cloud/cloud-sticker-dreamy.png` | Dreamy | dreamy | YES | YES | YES |
| `stickers/cloud/cloud-sticker-thinking.png` | Thinking | thoughtful | YES | YES | YES |
| `stickers/cloud/cloud-sticker-bippin-brb.png` | Bippin BRB | brand | YES | YES | YES |

---

## SECTION 5 — OTHER ROOM-RELATED ASSETS

| File | Usage | Status | Action |
|------|-------|--------|--------|
| `assets/images/room-bg-dark.png` | Circle screen background | production | Keep as-is |
| `assets/images/window.png` | Window object composite | production | Candidate for hotspot extraction |
| `assets/images/rylane-window.png` | Rylane character at window | production | Keep as-is (avatar) |

---

## SECTION 6 — UUID REFERENCE FILES

These are design mockup/reference PNGs imported from Figma. They are not rendered in production.

| File | Status | Action |
|------|--------|--------|
| `assets/images/0E3D4BD6-...png` | reference | Keep, do not render |
| `assets/images/110F5AE4-...png` | reference | Keep, do not render |
| `assets/images/1966FBC2-...png` | reference | Keep, do not render |
| `assets/images/284231DD-...png` | reference | Keep, do not render |
| `assets/images/2A27D30A-...png` | reference | Keep, do not render |
| `assets/images/4BB4A7DF-...png` | reference | Keep, do not render |
| `assets/images/5397B783-...png` | reference | Keep, do not render |
| `assets/images/5886DDCD-...png` | reference | Keep, do not render |
| `assets/images/68238EB5-...png` | reference | Keep, do not render |
| `assets/images/6AEA1FF8-...png` | reference | Keep, do not render |
| `assets/images/6F71DD53-...png` | reference | Keep, do not render |
| `assets/images/7814EE18-...png` | reference | Keep, do not render |
| `assets/images/ACC1D780-...png` | reference | Keep, do not render |
| `assets/images/AD015F7B-...png` | reference | Keep, do not render |
| `assets/images/AFA90A45-...png` | reference | Keep, do not render |
| `assets/images/B15B0EDD-...png` | reference | Keep, do not render |
| `assets/images/B8350F20-...png` | reference | Keep, do not render |
| `assets/images/E250BCEA-...png` | reference | Keep, do not render |
| `assets/images/E3425210-...png` | reference | Keep, do not render |
| `assets/images/E88CD2C7-...png` | reference | Keep, do not render |
| `assets/images/EFF1CA3D-...png` | reference | Keep, do not render |
| `assets/images/F952C378-...png` | reference | Keep, do not render |

---

## SECTION 7 — PROPOSED ASSET DIRECTORY STRUCTURE

```
assets/
└── rooms/
    ├── base/                        # Bare structural shells — walls, floor, window only
    │   ├── raylene-bare-room.png    # Extracted from Raylene Room (all phases share one base)
    │   ├── rylane-bare-room.png     # Extracted from Rylane Room
    │   ├── night-bare-room.png      # Extracted from Night Room
    │   ├── cloud-bare-sky.png       # Extracted from Cloud Room (sky + cloud islands)
    │   ├── raylene-window.png       # Window element (standalone, reusable)
    │   ├── rylane-window.png        # City window (standalone)
    │   └── night-window.png         # Night city window (standalone)
    │
    ├── furniture/                   # Individual furniture pieces
    │   ├── beds/
    │   │   ├── bed-raylene.png      # Lavender / soft bed
    │   │   ├── bed-rylane.png       # Cool/dark bed
    │   │   ├── bed-night.png        # Moon chair (Night's crescent chair)
    │   │   ├── bed-pastel.png       # Recolor variant
    │   │   ├── bed-dark.png         # Dark mode variant
    │   │   └── bed-neon.png         # Neon variant
    │   ├── desks/
    │   │   ├── desk-raylene.png
    │   │   ├── desk-rylane.png
    │   │   ├── desk-night.png
    │   │   └── desk-pastel.png
    │   ├── shelves/
    │   │   ├── shelves-raylene.png
    │   │   └── shelves-rylane.png
    │   ├── rugs/
    │   │   ├── rug-raylene.png
    │   │   ├── rug-rylane.png
    │   │   └── rug-pastel.png
    │   └── boards/
    │       ├── corkboard-raylene.png
    │       └── corkboard-rylane.png
    │
    ├── decor/                       # Decorative overlays and standalone decor
    │   ├── lighting/
    │   │   ├── fairy-lights.png
    │   │   ├── neon-glow-purple.png
    │   │   ├── city-glow-night.png
    │   │   └── cloud-glow.png
    │   ├── plants/
    │   │   └── plant-raylene.png
    │   ├── wall/
    │   │   ├── photo-wall-raylene.png
    │   │   ├── photo-wall-rylane.png
    │   │   └── corkboard-raylene.png
    │   └── misc/
    │       └── clock-night.png
    │
    ├── hotspots/                    # Interactive objects (navigation triggers)
    │   ├── journal-raylene.png      → target: pages
    │   ├── journal-rylane.png       → target: pages
    │   ├── journal-cloud.png        → target: pages
    │   ├── journal-night.png        → target: pages
    │   ├── headphones-raylene.png   → target: voiceBip
    │   ├── headphones-rylane.png    → target: voiceBip
    │   ├── headphones-cloud.png     → target: calm
    │   ├── mic-cloud.png            → target: voiceBip
    │   ├── cloud-lamp.png           → target: cloudThoughts
    │   ├── cloud-neon.png           → target: cloudThoughts
    │   ├── thought-cloud.png        → target: cloudThoughts
    │   ├── voice-corner-night.png   → target: voiceBip
    │   ├── bridge-raylene.png       → target: bridge
    │   ├── bridge-rylane.png        → target: bridge
    │   └── bridge-night.png         → target: bridge
    │
    └── user/                        # User-generated room state (runtime, not source assets)
        └── [user_id]/
            └── room.json            # Serialized UserRoom config per user
```

---

## SECTION 8 — CURRENT HOTSPOT REGISTRY

All hotspots defined in `screens/RoomScreen.tsx`. These are invisible tap zones overlaid on the baked room background. In the new system they become positioned interactive sticker objects.

### Raylene Room Hotspots

| ID | Label | Target Screen | Position | Pulse |
|----|-------|--------------|----------|-------|
| `pages` | Journal | pages | bottom 10%, left 14%, 36%×18% | YES |
| `voiceBip` | Headphones | voiceBip | bottom 14%, left 2%, 18%×12% | NO |
| `cloudThoughts` | Cloud Lamp | cloudThoughts | top 38%, left 26%, 14%×12% | YES |
| `comfort` | Bed | comfort | top 38%, right 6%, 34%×34% | NO |
| `bippin2` | Growth Board | bippin2 | top 4%, left 22%, 24%×26% | NO |
| `circle` | Photo Wall | circle | top 4%, right 0%, 18%×55% | NO |
| `moodCheckIn` | Window | dashboard | top 4%, left 0%, 18%×50% | YES |
| `bridge` | Bridge | bridge | bottom 24%, right 36%, 16%×12% | NO |
| `summon` | Se'kret | sekret | top 38%, left 4%, 20%×30% | NO |

### Rylane Room Hotspots

| ID | Label | Target Screen | Position | Pulse |
|----|-------|--------------|----------|-------|
| `pages` | Journal | pages | bottom 8%, left 18%, 38%×20% | YES |
| `voiceBip` | Headphones | voiceBip | top 40%, left 28%, 14%×10% | NO |
| `cloudThoughts` | Cloud Neon | cloudThoughts | top 26%, left 36%, 14%×12% | YES |
| `comfort` | Bed | comfort | top 36%, right 6%, 36%×36% | NO |
| `bippin2` | Growth Board | bippin2 | top 2%, left 26%, 24%×28% | NO |
| `circle` | Photo Wall | circle | top 2%, right 0%, 20%×50% | NO |
| `moodCheckIn` | Window | dashboard | top 2%, left 0%, 20%×55% | YES |
| `bridge` | Bridge | bridge | bottom 24%, right 36%, 16%×12% | NO |
| `summon` | Se'kret | sekret | top 30%, left 2%, 24%×36% | NO |

### Cloud Room Hotspots

| ID | Label | Target Screen | Position | Pulse |
|----|-------|--------------|----------|-------|
| `headphones` | Headphones | calm | top 28%, left 8%, 24%×18% | YES |
| `pages` | Floating Journal | pages | top 44%, left 32%, 36%×20% | YES |
| `voiceBip` | Cloud Mic | voiceBip | top 22%, right 10%, 20%×16% | NO |
| `cloudThoughts` | Big Cloud | cloudThoughts | top 8%, left 22%, 56%×20% | YES |
| `summon` | Cloud Se'kret | sekret | top 62%, left 18%, 64%×22% | NO |

### Night Room Hotspots

| ID | Label | Target Screen | Position | Pulse |
|----|-------|--------------|----------|-------|
| `window` | Window | cloudThoughts | top 4%, left 4%, 44%×44% | YES |
| `pages` | Journal | pages | bottom 16%, left 6%, 50%×20% | YES |
| `voiceBip` | Voice Bip Corner | voiceBip | top 20%, right 2%, 26%×28% | NO |
| `comfort` | Moon Chair | comfort | top 26%, left 34%, 36%×40% | NO |
| `bridge` | Reach Out | bridge | bottom 30%, right 6%, 22%×16% | NO |
| `summon` | Night Se'kret | sekret | bottom 36%, left 2%, 32%×32% | NO |

---

## ASSET TOTALS SUMMARY

| Category | Count | Notes |
|----------|-------|-------|
| Room backgrounds (production) | 38 | 4 teen rooms × 7 phases + 2 parent rooms × 5 phases |
| Room backgrounds (archive) | 28 | Raylene + Rylane + Cloud + Night all 7 phases |
| Scene composites | 8 | Reference/marketing only |
| Character avatar images | 53 | Raylene 17, Rylane 10, Cloud 6, Night 20 |
| Character stickers | 53 | Raylene 19, Rylane 19, Cloud 15 |
| UUID design references | 22 | Figma exports, not rendered |
| Other room assets | 3 | window.png, rylane-window.png, room-bg-dark.png |
| **TOTAL** | **205** | |

| Baked elements to extract (all 4 rooms) | ~45 | Structural + furniture + hotspot objects |
| Proposed new asset files (post-extraction) | ~60 | base + furniture + decor + hotspots folders |
