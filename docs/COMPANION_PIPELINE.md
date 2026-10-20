# Se'kret Bip Companion Production Pipeline v2 — Repo Guide

This is the GitHub side of the v2.0 companion production pipeline: **asset storage,
manifest, helper wiring, and app integration**. Image *generation* happens outside the
repo (Canva canon + an external generator); this repo owns where finished PNGs live and
how the app loads them.

- **Spec encoded as code:** `src/constants/companionPipeline.ts` (batches, pose intents,
  locked-identity prompt, `buildCompanionPrompt()`).
- **Pose set / types:** `src/types/companions.ts`
- **Manifest (status per pose):** `src/constants/companionManifest.ts`
- **Image registry (require map):** `src/constants/companionImages.ts`
- **Loader helper:** `getTeenCompanionAsset()` in `src/utils/companions.ts`
- **Validator:** `npm run validate:companions` → `scripts/validate-companion-assets.mjs`

## Companions and poses

Cloud and the Se'kret/Oracle layer are out of scope (legacy system).

| Companion | Poses |
| --- | --- |
| Raylene | neutral, happy, listening, thinking, writing, encouraging, sleepy |
| Rylane | neutral, happy, listening, thinking, writing, encouraging, calm |
| Night | neutral, happy, headphones, thinking, listening, writing, comfort, window, rain |

> **Night is a hybrid set:** keeps the signature `headphones` pose *and* adds the shared
> `happy` + `listening` poses, so Batches 1 and 3 apply to all three companions.

## Batch order

| Batch | Poses | Status |
| --- | --- | --- |
| 0 — Identity Lock | neutral (all) | ✅ complete (live) |
| 1 — Happy | happy (all) | pending |
| 2 — Thinking | thinking (all) | pending |
| 3 — Listening | listening (all) | pending |
| 4 — Writing | writing (all) | pending |
| 5 — Signature | Raylene: encouraging, sleepy · Rylane: encouraging, calm · Night: headphones, comfort, window, rain | pending |

## Canonical source = Canva

The locked neutral references live in Canva as `[CANONICAL]`-tagged designs:

| Companion | Canva design ID |
| --- | --- |
| Raylene | `DAHN8KWabgQ` |
| Night | `DAHN8gbBtpg` |
| Rylane | `DAHN8hIqr8Y` |

Export from Canva as PNG (default size; free-plan accounts cannot export transparent
backgrounds, so use clean-white-background exports — both satisfy the Export Contract).

## Waiver log

| Asset | Issue | Decision |
| --- | --- | --- |
| `…/{raylene,night,rylane}/neutral.png` | 512×1024, below the 2048×2048 floor | **Waived** — phone-optimized (iOS screen). Re-export larger from Canva later if needed; the validator passes these via `RESOLUTION_WAIVERS`. |
| Canva export resolution | Free plan caps PNG upscaling; transparent export blocked | Use default-size white-background exports. |
| Aspect ratio | Raylene ≈2:3 vs Night/Rylane ≈1:2 | Open: re-frame in Canva to a common ratio for true "consistent scale" before later batches. |

## Adding a finished pose (drop-in steps)

1. Place the PNG at `assets/images/companions/teen/<companion>/<pose>.png`.
2. Add its static `require()` to `src/constants/companionImages.ts`.
3. Flip its manifest status to `production` in `src/constants/companionManifest.ts`
   (`buildEntries('<companion>', { <pose>: 'production' })`).
4. Run `npm run validate:companions` (and `npm run type-check`).
5. Screens load it via `getTeenCompanionAsset('<companion>', '<pose>')`, which falls back
   to neutral and then `null`, so a missing asset never crashes the app.

To generate a pose on-model, use `buildCompanionPrompt(companion, pose)` from
`src/constants/companionPipeline.ts` — it fills the spec's locked-identity prompt.

## Export Contract (enforced by the validator)

- PNG format; present wherever status is `production`.
- One character per file at the canonical path.
- Every `production` pose wired with a `require()`.
- Resolution ≥ 2048×2048 is a **soft** check (warns, does not fail) — phone-optimized art
  is allowed per product direction; the three Batch 0 neutrals are explicitly waived.
