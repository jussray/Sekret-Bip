# USER ROOM ARCHITECTURE
# Se'kret Bip V2 — User Rooms + VibeLab Refactor
# Status: PROPOSAL — no code written yet

---

## OVERVIEW

Transform Se'kret Bip's four static character rooms (Raylene, Rylane, Cloud, Night) into a layered, customizable **User Room** system. The room becomes the user's personal space — a digital bedroom, mood board, and identity canvas they build over time.

The existing character rooms become the **starting point templates**, not permanent destinations.

---

## PART 1 — LAYER ARCHITECTURE

### Current System (flat)

```
Room = one baked PNG background
     + avatar image on top
     + invisible hotspot tap zones
```

### New System (layered)

```
Room = LAYER 0: Base Room Shell      (structural — walls, floor, window, ceiling)
     + LAYER 1: Lighting             (time-of-day phase overlay, applied in code)
     + LAYER 2: Furniture Layer      (extracted furniture PNGs, user-repositioned)
     + LAYER 3: Decoration Layer     (stickers, wall art, polaroids, plants, doodles)
     + LAYER 4: Hotspot Layer        (interactive objects — journal, headphones, etc.)
     + LAYER 5: Companion Layer      (character avatar sitting naturally in room)
     + LAYER 6: UI Chrome            (edit mode controls, VibeLab button, etc.)
```

Each layer is a separate React Native `View` with `position: absolute` and `pointerEvents` set appropriately.

---

## PART 2 — USER ROOM DATA MODEL

### TypeScript Type Definition

```typescript
// src/types/userRoom.ts

export type RoomBaseId =
  | 'raylene'    // lavender bedroom
  | 'rylane'     // city night bedroom
  | 'cloud'      // floating sky space
  | 'night'      // deep violet room
  | 'user-blank' // future: empty canvas

export type LightingMode =
  | 'daylight'
  | 'midday'
  | 'afternoon'
  | 'sunset'
  | 'rain-glow'
  | 'purple-neon'
  | 'fairy-lights'
  | 'cozy-lamp'
  | 'deep-night'

export type FurniturePalette =
  | 'original'  // as extracted from source room
  | 'pastel'
  | 'dark'
  | 'neon'
  | 'cozy'

export interface PlacedFurniture {
  id: string                  // unique placement id
  assetKey: string            // maps to assets/rooms/furniture/
  palette: FurniturePalette
  x: number                   // 0-1 normalized position
  y: number                   // 0-1 normalized position
  scale: number               // 0.5 - 2.0
  zIndex: number              // stacking order within furniture layer
  flipX?: boolean             // mirror horizontally
}

export interface PlacedDecor {
  id: string
  assetKey: string            // sticker key or custom decor key
  x: number
  y: number
  scale: number
  rotation: number            // degrees, -45 to 45
  zIndex: number
  tintColor?: string          // optional color tint for recolorable assets
}

export interface RoomHotspot {
  id: string                  // matches existing RoomTarget keys
  assetKey: string            // which hotspot object image to render
  target: RoomTarget          // navigation destination (existing system)
  x: number
  y: number
  scale: number
  pulse?: boolean
  enabled: boolean
}

export interface CompanionPresence {
  companionId: 'raylene' | 'rylane' | 'cloud' | 'night' | 'none'
  pose: string                // from existing AVATARS map
  x: number                   // 0-1 normalized (left edge of avatar)
  y: number                   // 0-1 normalized (bottom edge of avatar)
  scale: number
  tappable: boolean           // tapping opens sekret/chat screen
}

export interface UserRoom {
  userId: string
  baseRoomId: RoomBaseId
  lightingMode: LightingMode
  furniture: PlacedFurniture[]
  decor: PlacedDecor[]
  hotspots: RoomHotspot[]
  companion: CompanionPresence
  wallColor?: string          // optional hex override for wall tint
  roomName?: string           // user-set nickname for their space
  createdAt: string
  updatedAt: string
}
```

### Default User Room (first-time user)

When a user first opens their room, their `UserRoom` is seeded from a character template derived from their chosen companion. This preserves existing art while introducing the new system.

```typescript
const DEFAULT_USER_ROOMS: Record<PersonalityId, Partial<UserRoom>> = {
  raylene: {
    baseRoomId: 'raylene',
    lightingMode: 'afternoon',
    companion: { companionId: 'raylene', pose: 'neutral', x: 0.08, y: 0.35, scale: 0.85, tappable: true },
    hotspots: [...RAYLENE_HOTSPOTS_AS_PLACED_OBJECTS],
    furniture: [...RAYLENE_STARTER_FURNITURE],
    decor: [],
  },
  rylane: { ... },
  cloud:  { ... },
  night:  { ... },
}
```

### Supabase Schema Addition

```sql
create table if not exists public.user_rooms (
  user_id        uuid          primary key references auth.users(id),
  base_room_id   text          not null default 'raylene',
  lighting_mode  text          not null default 'afternoon',
  furniture      jsonb         not null default '[]',
  decor          jsonb         not null default '[]',
  hotspots       jsonb         not null default '[]',
  companion      jsonb         not null default '{}',
  wall_color     text,
  room_name      text,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

alter table public.user_rooms enable row level security;

create policy "Users manage own room"
  on public.user_rooms
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## PART 3 — VIBELAB V2 (Room Customization Interface)

VibeLab evolves from a mood tracker into the full room editor. Accessed from the room screen via a dedicated edit button.

### VibeLab V2 Tab Structure

```
VibeLab V2
├── TAB 1: Base Room       — pick room shell (raylene / rylane / cloud / night)
├── TAB 2: Furniture       — browse + place furniture items
├── TAB 3: Decor           — stickers, wall art, polaroids, plants
├── TAB 4: Lighting        — time of day + mood lighting
└── TAB 5: Companions      — which companion lives here + their pose
```

### VibeLab Entry Point

Add a small "edit room" button to `RoomScreen.tsx` — visually minimal (pencil or sparkle icon, bottom-right corner). Tapping enters VibeLab V2 overlay mode.

### Furniture Browser

Each furniture category displays a scrollable horizontal tray:

```
Beds        → [bed-raylene] [bed-rylane] [bed-night] [bed-pastel] [bed-dark] [bed-neon]
Desks       → [desk-raylene] [desk-rylane] [desk-night] [desk-pastel]
Chairs      → [moon-chair-night] [beanbag] [desk-chair] ...
Shelves     → [shelves-raylene] [shelves-rylane] ...
Rugs        → [rug-raylene] [rug-rylane] [rug-pastel] ...
Boards      → [corkboard-raylene] [corkboard-rylane] ...
```

Tap to select → drag to place → pinch to resize. Long press to remove.

### Decor Browser (Sticker Library as Room Items)

The existing 53 stickers become available as room decor objects. Users place them anywhere on the room canvas.

Additional decor categories beyond stickers:

```
Mood Board    — polaroids, tape strips, cutout shapes
Plants        — extracted plant PNGs from existing rooms
Lights        — fairy light string, neon glow, lamp overlay
Art           — poster templates, photo frames
Words         — typed mood text with custom font/color
```

### Lighting Selector

Nine lighting presets, each combining:
- Phase overlay color (rgba, applied in code — existing `ROOM_PHASE_OVERLAYS` system)
- Decor lighting layer (fairy lights, neon signs, lamp glow — PNG overlays)

```
Daylight       — warm white, open window feel
Midday         — bright neutral
Afternoon      — golden hour warmth
Sunset         — orange-pink tones
Rain Glow      — deep blue-grey, wet window shimmer
Purple Neon    — violet/magenta neon wash (Rylane DNA)
Fairy Lights   — warm amber twinkle overlay
Cozy Lamp      — soft orange glow, warm corners
Deep Night     — near-black, stars, minimal light
```

### Companion Selector

User chooses which companion lives in their room. The companion sits naturally in the room environment — no popup card, no summon animation. They are just there, like a room resident.

Options:
- Raylene — neutral pose, left side, sitting near desk
- Rylane — thinking pose, near window
- Cloud — floating pose, center-upper area (floats)
- Night — relaxed pose, near moon chair
- None — solo room

Tapping the companion opens their chat/sekret screen (existing `sekret` route). This replaces the invisible `summon` hotspot that currently exists — the companion image IS the hotspot.

---

## PART 4 — COMPANION PRESENCE MODEL CHANGE

### Current Model

```
Character → invisible hotspot zone overlaid on room background
User taps hotspot → navigates to sekret screen
Companion card appears as modal popup
```

### New Model (matching Cloud in Voice Bip)

```
Character → placed PNG image directly in the room (Companion Layer)
User taps character image directly → navigates to sekret screen
No popup card, no invisible zone
Companion feels like a room resident, not a navigation element
```

**Implementation:**

```tsx
// In the new RoomScreen layer system:
<CompanionLayer>
  <TouchableOpacity onPress={() => navigateTo('sekret')}>
    <Image
      source={AVATARS[companion.companionId][companion.pose]}
      style={{
        position: 'absolute',
        left: `${companion.x * 100}%`,
        bottom: `${(1 - companion.y) * 100}%`,
        width: width * companion.scale * 0.35,
        resizeMode: 'contain',
      }}
    />
  </TouchableOpacity>
</CompanionLayer>
```

The companion image itself pulses gently (opacity animation, 0.85 → 1.0 → 0.85) to signal interactivity without a visible hotspot ring.

---

## PART 5 — ROOM OWNERSHIP CONCEPT

### User Room as Identity Layer

Every user gets ONE room. It persists. It is:
- Their home screen when they open Se'kret Bip
- Their profile expression
- Their mood board
- Their safe space

The room accumulates over time:
- Stickers placed after journaling sessions
- Lighting that matches their mood log
- Furniture they earned or unlocked
- Their companion living there

### Room Name

Users can name their room (optional):
```
"my little corner"
"the study spot"
"rainy day room"
"night brain zone"
```

This shows as a soft label in the top-left of the room screen.

### Future: Room Profile

Other users in Circle can eventually see a snapshot of a user's room when they tap their avatar on a Circle post. The room becomes a visual identity card.

---

## PART 6 — MIGRATION PLAN

### What Changes

| Before | After |
|--------|-------|
| `RoomScreen.tsx` renders one of 4 character room PNGs based on `character` field | `RoomScreen.tsx` renders a `UserRoom` config from Supabase |
| Hotspots are invisible `TouchableOpacity` zones defined in code | Hotspot objects are placed images in the room canvas |
| Companion is baked into room background or rendered as separate avatar | Companion is an explicit tappable image in Companion Layer |
| Character choice = room choice | Character choice seeds the default room; user then customizes independently |
| `RoomMemory.character` drives entire room appearance | `UserRoom` config drives room appearance |

### Migration Steps

**Step 1 — Parallel Room Screen (no breaking changes)**

Add a `UserRoomScreen.tsx` alongside existing `RoomScreen.tsx`. Do not modify `RoomScreen.tsx`. Route `(teen)/room.tsx` to `UserRoomScreen.tsx` only when the user has a `user_rooms` record in Supabase. If no record exists, fall back to `RoomScreen.tsx`. This means existing users see no change until they opt in via VibeLab.

**Step 2 — VibeLab V2 Entry**

Add VibeLab V2 button to existing `RoomScreen.tsx`. When user first opens VibeLab V2, it creates their `user_rooms` record seeded from their current character room. From that point on they see `UserRoomScreen.tsx`.

**Step 3 — Asset Extraction**

Working in Figma: open each room source file, separate layers, export:
- `assets/rooms/base/` — bare room shells
- `assets/rooms/furniture/` — furniture pieces
- `assets/rooms/hotspots/` — hotspot objects
- `assets/rooms/decor/` — decor items

These are NEW files. Original `assets/images/bg-*.png` files are not touched.

**Step 4 — Hotspot System Migration**

The existing `RAYLENE_HOTSPOTS`, `RYLANE_HOTSPOTS`, `CLOUD_HOTSPOTS`, `NIGHT_HOTSPOTS` arrays define positions as percentages. These seed the initial `hotspots` array in the default `UserRoom` config. Users can then move, replace, or remove hotspot objects in VibeLab.

**Step 5 — Companion Card Removal**

Once `UserRoomScreen.tsx` is stable and all users migrated, remove the `summon` hotspot from old `RoomScreen.tsx` hotspot arrays. The companion tappable image replaces it.

**Step 6 — Archive Old Room Screen**

Move `RoomScreen.tsx` to `screens/archive/RoomScreen.legacy.tsx`. Keep it. Do not delete.

### What Is NOT Changing (Yet)

- `ParentRoomScreen.tsx` — untouched
- `assets/images/bg-*.png` — all preserved
- `assets/images/archive/` — all preserved
- Scene composites — preserved as reference
- All character avatar images — preserved, promoted to Companion Layer
- All sticker files — preserved, promoted to Decor Library
- Existing `VoiceBipScreen.tsx` — Cloud interaction model unchanged
- `RoomMemory` type in Supabase — kept as engagement tracker, supplemented by `user_rooms`

---

## PART 7 — COMPONENT TREE (UserRoomScreen)

```tsx
<UserRoomScreen>
  <StatusBar hidden />

  {/* Layer 0: Base Room Shell */}
  <BaseRoomLayer baseRoomId={room.baseRoomId} />

  {/* Layer 1: Lighting */}
  <LightingLayer mode={room.lightingMode} />

  {/* Layer 2: Furniture */}
  <FurnitureLayer items={room.furniture} />

  {/* Layer 3: Decor / Stickers */}
  <DecorLayer items={room.decor} />

  {/* Layer 4: Hotspot Objects */}
  <HotspotLayer hotspots={room.hotspots} onHotspotTap={handleHotspotTap} />

  {/* Layer 5: Companion */}
  <CompanionLayer
    companion={room.companion}
    onTap={() => navigateTo('sekret')}
  />

  {/* Layer 6: UI Chrome (only visible in edit mode) */}
  {editMode && <VibeLab2Overlay room={room} onSave={saveRoom} onClose={exitEditMode} />}

  {/* Edit button (always visible, bottom corner) */}
  <EditRoomButton onPress={enterEditMode} />

</UserRoomScreen>
```

---

## PART 8 — VibeLab V2 TYPE ADDITIONS

Extend `src/types/index.ts`:

```typescript
// Room customization types for VibeLab V2

export type RoomBaseId = 'raylene' | 'rylane' | 'cloud' | 'night' | 'user-blank'

export type LightingMode =
  | 'daylight' | 'midday' | 'afternoon' | 'sunset'
  | 'rain-glow' | 'purple-neon' | 'fairy-lights' | 'cozy-lamp' | 'deep-night'

export type FurniturePalette = 'original' | 'pastel' | 'dark' | 'neon' | 'cozy'

export interface PlacedFurniture {
  id: string
  assetKey: string
  palette: FurniturePalette
  x: number        // 0-1 normalized
  y: number        // 0-1 normalized
  scale: number
  zIndex: number
  flipX?: boolean
}

export interface PlacedDecor {
  id: string
  assetKey: string
  x: number
  y: number
  scale: number
  rotation: number
  zIndex: number
  tintColor?: string
}

export interface RoomHotspotConfig {
  id: string
  assetKey: string
  target: string
  x: number
  y: number
  scale: number
  pulse?: boolean
  enabled: boolean
}

export interface CompanionPresence {
  companionId: PersonalityId | 'none'
  pose: string
  x: number
  y: number
  scale: number
  tappable: boolean
}

export interface UserRoom {
  userId: string
  baseRoomId: RoomBaseId
  lightingMode: LightingMode
  furniture: PlacedFurniture[]
  decor: PlacedDecor[]
  hotspots: RoomHotspotConfig[]
  companion: CompanionPresence
  wallColor?: string
  roomName?: string
  createdAt: string
  updatedAt: string
}
```

---

## DELIVERABLES CHECKLIST

- [x] **Inventory of all room assets** → `ROOM_ASSET_MAP.md`
- [x] **Breakdown of every room into reusable components** → Section 1 of ROOM_ASSET_MAP.md
- [ ] **Bare room versions** → Needs extraction in Figma (planning complete, work pending)
- [ ] **Furniture asset library** → Needs extraction in Figma (planning complete, work pending)
- [x] **VibeLab V2 architecture plan** → Part 3 of this document
- [x] **User Room data model** → Part 2 of this document
- [x] **Asset map documentation** → `ROOM_ASSET_MAP.md`
- [x] **Migration plan** → Part 6 of this document

---

## NEXT ACTIONS (in order)

1. **Figma work** — Open each room source file, separate layers, export bare room + furniture + hotspot PNGs to `assets/rooms/`
2. **Add types** — Add `UserRoom` and related types to `src/types/index.ts`
3. **Supabase migration** — Create `user_rooms` table via `apply_migration`
4. **Build `UserRoomScreen.tsx`** — Layer-based room renderer (parallel to existing `RoomScreen.tsx`)
5. **Build VibeLab V2** — Room editor overlay (starts with Lighting + Companion tabs only for MVP)
6. **Seed default rooms** — Generate default `UserRoom` configs from existing hotspot arrays
7. **Wire route** — Update `app/(teen)/room.tsx` to route to `UserRoomScreen` when `user_rooms` record exists
8. **QA** — Verify existing room screen is completely unaffected for users without a `user_rooms` record
