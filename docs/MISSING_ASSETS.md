# Image asset audit

## Runtime policy

Runtime images live in `assets/images/`. Full-screen mockups, character reference
boards, and design sheets live in `docs/design-references/assets/` and are not
part of the runtime image map. Expo's native splash is color-only; the React
Native opening screen builds its atmosphere, content, and actions from
components rather than displaying a screenshot.

Do not add a `require()` for anything under `docs/design-references/`. If a
reference contains a reusable illustration, export that illustration as a
separate, deliberately named runtime asset first.

## Reference-only files

The following files were removed from `assets/images/` during this audit:

- `circle-mockup.png`
- `parent-dashboard-background-reference.png`
- `parent-dashboard-mockup.png`
- `parent-dashboard-splash-mockup.png`
- `raylene-fan-sheet.png`
- `raylene-happy-reference-sheet.png`
- `raylene-neutral-reference-sheet.png`
- `raylene-rainy-window-sheet.png`
- `raylene-reference-sheet.png`
- `raylene-thinking-sheet-v2.png`
- `raylene-thinking-sheet.png`
- `rylane-chibi-sticker-mini-reference-sheet.png`
- `rylane-profile-sheet.png`
- `rylane-reference-board.png`
- `rylane-reference-sheet.png`

Several Raylene sheets and `circle-mockup.png` are two-byte placeholders. The
Rylane sheets and dashboard references are loadable images, but remain
reference-only because they are composite boards or screen mockups. The former
`sekret-splash.png` was byte-identical to the parent dashboard mockup and is now
stored as `parent-dashboard-splash-mockup.png` to make its role explicit.

## Runtime fallbacks

A number of old runtime filenames are also two-byte placeholders. None is
passed to React Native's image loader. `constants/theme.ts` maps those semantic
slots to valid standalone character art or room art until proper exports are
available.

- Room variants currently fall back to `bg-raylene-room-night.png`.
- Missing Raylene poses fall back to standalone neutral, happy, writing, or
  window art.
- Missing Rylane poses fall back to standalone neutral, full-body, or window
  art.
- Circle uses `room-bg-dark.png`; it never loads the reference mockup.

## Verification expectations

- No file matching `*mockup*`, `*reference*`, or `*sheet*` belongs under
  `assets/images/`.
- No source file imports an image from `docs/design-references/`.
- `app.json` must not configure a mockup or reference image as the native
  splash.
- Screen structure, cards, text inputs, actions, and navigation remain React
  Native components.
