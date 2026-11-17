# Phase 2 Room Integration

This document defines the gate checklist, composite specification, and rollback procedure for the Se'kret Bip room integration pass — the process of painting each Se'kret character into their room backgrounds so the scene reads as one complete illustration.

## The Gate — Do Not Begin Until All Pass

Run this before touching any room PNG:

```bash
npm run verify:room-archives
```

All 28 checks must print `✅`. If any print `❌`, fix the archive before proceeding.

### Full gate checklist

- [ ] `npm run verify:room-archives` — all 28 archive SHAs match live SHAs, all files > 1 MB
- [ ] `npm run audit:runtime-assets` — all IMAGES keys resolve
- [ ] `npm run type-check` — zero TypeScript errors
- [ ] `npm run lint` — zero ESLint errors
- [ ] `git lfs pull` has been run and all `bg-*.png` are MB-sized on disk

## Composite Specification

### What to do

1. Use the existing room background as the master canvas.
2. Pull the appropriate existing character reference art from `assets/images/`.
3. Composite the character directly into the room.
4. Match: room lighting, color temperature, shadows, perspective, scale, ambient light.
5. Add: contact shadows, floor shadows, bed/chair seating shadows, subtle room light spill, environmental color reflection.
6. Blend character edges so they appear painted into the scene rather than layered above it.
7. Character should feel physically present in the room.

### What not to do

- Do NOT create new artwork.
- Do NOT redesign characters.
- Do NOT create floating avatars.
- Do NOT place PNGs on top of backgrounds as overlays.
- Do NOT change room layout.
- Do NOT change character identity.
- Do NOT change filenames.

### Lighting rules by variant

| Variant | Lighting spec |
|---|---|
| `day` / `midday` / `afternoon` | Match sunlight direction. Warm light hits character naturally. |
| `evening` | Golden hour warmth. Long low shadows. |
| `night` / `deep-night` | Soft purple/blue ambient. Subtle window glow if present. |
| `rain` | Cooler reflected light from window. Slight atmospheric softness. |

## Output Requirements

- Filename: unchanged (same as input)
- Dimensions: identical to original (verified by `verify:room-archives`)
- Format: PNG
- Minimum size: the composite must be at least as large as the original
- Final result: one complete illustration where the Se'kret lives inside the room

## Commit Procedure

After completing composites for a Se'kret:

1. Run `npm run verify:room-archives` — confirm archive still matches pre-composite originals.
2. Place finished composites in `assets/images/` using the exact original filenames.
3. Run `npm run audit:runtime-assets` — confirm no broken image keys.
4. Run `npm run verify:bundle` — confirm the app still builds.
5. Commit with message format:
   ```
   art: integrate {sekret} into room backgrounds ({variant} variants)
   ```
6. Push. The `verify:prepush` hook will re-run all checks.

## Rollback

If a composite needs to be reverted:

```bash
cp assets/images/archive/bg-{sekret}-room-{variant}.png assets/images/bg-{sekret}-room-{variant}.png
git add assets/images/bg-{sekret}-room-{variant}.png
git commit -m "revert: restore original bg-{sekret}-room-{variant}.png from archive"
git push origin main
```

The archive is the single source of truth for pre-composite originals. It must not be modified after the gate passes.
