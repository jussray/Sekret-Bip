# Se’kret Bip Living Room Production Engine

**Status:** authoritative product and automation contract  
**First vertical slice:** Night  
**Runtime owner:** Expo / React Native / Reanimated  
**Production foreman and release governor:** Playwright

## Locked product rules

1. The teen bottom navigation remains exactly **Room, Pages, Calm, Circle, More**. Its order, labels, routes, icons, and active behavior are not redesigned from mockups.
2. Uploaded screen mockups are visual targets for the matching screens already present in the repository. Characters shown inside those mockups are not character canon.
3. Raylene, Rylane, Night, and Cloud use approved canonical masters. Old character art and flattened room screenshots never substitute for a missing pose.
4. The **User Room** is the teen’s personal command center. Updates, streaks, reminders, rewards, continue cards, customization, collectibles, goals, and personal activity belong there.
5. Companion rooms are permanent destinations with focused emotional jobs. They do not contain dashboard cards, random updates, streak panels, or account clutter.
6. Companion-room objects are the interface. Journal, microphone, headphones, window, chair, bed, desk, record player, and other room objects open existing routes or trigger companion activity.
7. One recognizable room persists through day, midday, afternoon, evening, rain, night, and deep night. Lighting and ambience may change; furniture geometry does not drift.
8. Existing routes and safety/privacy boundaries remain intact.

## Tool ownership

### LeonardoAI — production art

Creates transparent character poses, transition frames, object-use states, clean room masters, lighting overlays, weather overlays, and isolated room objects. It must use the final canonical master as identity reference and must not invent new clothes, faces, furniture, or room geometry.

### Figma — choreography and interaction specification

Defines phone frames, room anchors, movement paths, hitboxes, safe zones, companion scale, responsive behavior, state transitions, and screen visual targets. Figma does not become runtime code.

### Canva — approval wall

Stores character canon, room comparisons, approved/rejected outputs, visual reference batches, and handoff pages. Canva does not own runtime positioning or navigation.

### GitHub — source of truth

Stores manifests, approved app assets, runtime code, state machines, memory integration, tests, reports, and pull requests.

### Playwright — production foreman and release governor

Playwright coordinates browser-based creative workspaces through manual checkpoints, captures evidence, validates manifests and exports, checks the running web build, enforces the product contract, and blocks regressions. It never stores or types passwords, bypasses MFA/CAPTCHAs, or replaces the native room runtime.

## Room runtime architecture

```text
RoomBackground
+ LightingWeatherLayer
+ InteractiveObjectLayer
+ CompanionActorLayer
+ AmbientAnimationLayer
+ RoomMemoryState
+ Existing app navigation
```

The companion actor moves between named anchors. Movement is deterministic and room-aware rather than random screen translation.

```ts
type CompanionActorState =
  | 'idle'
  | 'walking'
  | 'thinking'
  | 'writing'
  | 'listening'
  | 'usingHeadphones'
  | 'usingMicrophone'
  | 'lookingOutWindow'
  | 'resting'
  | 'talking';
```

Every transition records the current room, anchor, activity, pose, and visit time. Missing assets fall back to the canonical neutral master. Reduced-motion mode uses crossfades rather than movement.

## Night vertical slice

Night is completed before the other companion rooms expand.

Required anchors:

- door
- window
- desk
- journal
- moon chair
- microphone
- record player
- floor

Required behaviors:

- idle near the window
- transition to the journal and write
- sit in the moon chair
- use headphones or record player
- move to the microphone for Voice Bip
- react to mood without changing identity
- change room lighting by phase and rain state
- restore the last room activity
- tap Night to open the existing conversation flow

## Production queue

The machine-readable queue lives in `config/room-production.manifest.json`.

```bash
npm run room:foreman:plan
npm run room:foreman:verify
npm run room:foreman:interactive -- --tool canva
npm run room:foreman:interactive -- --tool figma
npm run room:foreman:interactive -- --tool leonardo
npm run test:e2e:rooms
```

Figma and Leonardo workspace URLs are supplied locally through `ROOM_FOREMAN_FIGMA_URL` and `ROOM_FOREMAN_LEONARDO_URL`. They are never committed. Canva uses the existing Se’kret Bip Master Visual Reference Library declared in the manifest.

## Playwright release gates

A room build cannot merge when any of these fail:

- visible bottom navigation differs from Room, Pages, Calm, Circle, More
- a companion room contains User Room dashboard/update cards
- a mockup character replaces canonical character art
- an object opens a different route than its contract
- phase switching changes room geometry
- a required asset is missing without canonical fallback
- phone width overflows
- sign-out or account switching leaks room memory
- reduced-motion behavior is absent
- Night cannot complete its anchor transition contract

## Security boundary

The foreman uses persistent local browser profiles only to preserve user-approved login sessions. Those profiles and evidence runs are ignored by Git. The script does not automate authentication, approvals, purchases, publishing, destructive edits, or merge actions. Official APIs/connectors remain preferred; Playwright fills browser-workflow gaps and captures proof.
