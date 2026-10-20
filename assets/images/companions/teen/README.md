# Teen companion assets

Canonical teen-side production sprites live here.

## Companions and required poses

### Raylene

`neutral.png`, `happy.png`, `listening.png`, `thinking.png`, `writing.png`, `encouraging.png`, `sleepy.png`

### Rylane

`neutral.png`, `happy.png`, `listening.png`, `thinking.png`, `writing.png`, `encouraging.png`, `calm.png`

### Night

`neutral.png`, `happy.png`, `headphones.png`, `thinking.png`, `listening.png`, `writing.png`, `comfort.png`, `window.png`, `rain.png`

## Production rules

- Cloud remains on the existing asset system and is not part of this migration.
- Use one full-body character per transparent PNG.
- Keep the full character visible from hair to shoes with safe padding.
- Keep face, skin tone, hair, outfit, age, proportions, line weight, and shading consistent with the locked reference.
- Do not include rooms, labels, borders, collage elements, or decorative backgrounds.
- Do not remove legacy assets until the new registry is populated and the app type-checks and exports successfully.

## Wiring a finished PNG

After placing a PNG in its matching folder:

1. Add its static `require()` to `src/constants/companionImages.ts`.
2. Change its manifest status from `missing` to `production` in `src/constants/companionManifest.ts`.
3. Screens should request it through `getTeenCompanionAsset()` from `src/utils/companions.ts`.

The helper falls back to the companion's neutral image and returns `null` when no safe asset exists, preventing missing-image crashes.
