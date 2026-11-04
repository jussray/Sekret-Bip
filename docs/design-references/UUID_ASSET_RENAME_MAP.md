# UUID Asset Rename Map

Status: canonical names established and live splash routing migrated on `agent/rename-uuid-image-assets`.

This migration is intentionally non-destructive. Existing UUID image files remain as compatibility aliases so historical notes and external links do not break. No image bytes were deleted. Production room art already had clean filenames, so those existing files are the canonical targets rather than creating more duplicates.

## Runtime source of truth

- `components/sekret/SekretSplashScreen.tsx` loads `assets/images/splash-teen.jpeg` for the teen side and `assets/images/splash-parent.png` for the parent side.
- `constants/theme.ts` is the public theme entrypoint and overrides every exported splash alias with those canonical paths.
- `constants/theme.base.ts` preserves the previous theme implementation byte-for-byte for compatibility and review history. It is an internal base module, not the public import target and not a source for new asset paths.
- New runtime code must import from `constants/theme.ts` or use the canonical image paths directly. It must not import `constants/theme.base.ts`.

## App entry splashes

| Original UUID file | Canonical path | Confidence | Evidence |
|---|---|---:|---|
| `A2EB8B5A-0109-4A02-927A-FA7080B5F501.png` | `assets/images/splash-parent.png` | Confirmed | Byte-identical to `parent-space-splash.png`; repository history renamed this UUID as the parent splash. |
| `80B326EB-C67B-4369-A3EE-CFE0348E0701.jpeg` | `assets/images/splash-teen.jpeg` | High | The remaining distinct app-entry splash in the two-side splash set after the parent artwork is resolved. |

## Production room art

These UUID files are byte-identical source duplicates of already-clean production assets.

| Original UUID file | Canonical production path |
|---|---|
| `2A27D30A-F5F2-4853-BFB5-100BAC56A34C.png` | `assets/images/bg-raylene-room-midday.png` |
| `5886DDCD-4B72-4B62-BE54-E06E521E77AD.png` | `assets/images/bg-raylene-room-afternoon.png` |
| `B8350F20-D4AB-4256-B4F0-EDA698B28130.png` | `assets/images/bg-rylane-room-midday.png` |
| `5397B783-61B8-47A4-8A46-98C418B0AEF1.png` | `assets/images/bg-rylane-room-afternoon.png` |
| `AFA90A45-003E-4AF4-825A-D8C1C02CC275.png` | `assets/images/bg-cloud-room-day.png` |
| `4BB4A7DF-3B8C-4170-91B4-62FB2F404F68.png` | `assets/images/bg-cloud-room-midday.png` |
| `EFF1CA3D-E615-48E0-8D70-4A0A68AAFB8A.png` | `assets/images/bg-cloud-room-afternoon.png` |
| `E88CD2C7-C930-4632-9B33-27463A71DDB9.png` | `assets/images/bg-cloud-room-evening.png` |
| `AD015F7B-2956-430D-8CBA-97382DAE39CB.png` | `assets/images/bg-cloud-room-night.png` |
| `E250BCEA-A80A-4D90-A382-1FDE4C714702.png` | `assets/images/bg-cloud-room-rain.png` |
| `6AEA1FF8-29D1-4BFF-8AD6-ADB0D1A4F256.png` | `assets/images/bg-night-room-day.png` |
| `6F71DD53-E869-4C34-B485-97792510119F.png` | `assets/images/bg-night-room-midday.png` |
| `ACC1D780-D22F-4CED-8CC1-3B0868C3F4E1.png` | `assets/images/bg-night-room-afternoon.png` |
| `284231DD-7319-4872-AB67-0811F42132F4.png` | `assets/images/bg-night-room-evening.png` |
| `7814EE18-ECA9-4C7E-8F6A-959085A0BD20.png` | `assets/images/bg-night-room-night.png` |

## Unidentified design-screen references

Repository history proves these are reference-only images, but does not contain reliable screen identities. They receive stable, clean reference names without inventing product meaning.

| Original UUID file | Canonical reference path |
|---|---|
| `0E3D4BD6-E079-435A-9557-B02E7024656E.png` | `docs/design-references/assets/legacy-screens/screen-reference-01.png` |
| `110F5AE4-04DD-40A5-B840-46D174A64DE1.png` | `docs/design-references/assets/legacy-screens/screen-reference-02.png` |
| `1966FBC2-50B0-426B-B16C-9B9C860F98DB.png` | `docs/design-references/assets/legacy-screens/screen-reference-03.png` |
| `68238EB5-14B3-4B30-B45F-0F7006410B43.png` | `docs/design-references/assets/legacy-screens/screen-reference-04.png` |
| `A17B276E-AA39-40D2-B989-FBCCA739B6A3.png` | `docs/design-references/assets/legacy-screens/screen-reference-05.png` |
| `B15B0EDD-FA1F-40EC-9BB8-0CB916FDBEDB.png` | `docs/design-references/assets/legacy-screens/screen-reference-06.png` |
| `E3425210-2334-47E9-B8DB-F19AEAB5E607.png` | `docs/design-references/assets/legacy-screens/screen-reference-07.png` |

## Migration rule

New code and documentation must use the canonical paths above. UUID image files exist only for backward compatibility and must not be introduced into new imports. `constants/theme.base.ts` is preservation-only and must not become a direct dependency.
