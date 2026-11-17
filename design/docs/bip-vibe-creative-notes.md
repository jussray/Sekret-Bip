# Bip Vibe Creative Notes
## Figma & Canva Direction per Preset

All token values from `constants/vibeColors.ts`. No palette invention.

---

## 🌸 raylene — "Raylene's Room"

**Feel:** Warm afternoon light through sheer curtains. A cozy bedroom at 4pm.

| Dimension | Direction |
|-----------|-----------|
| **Lighting** | Soft top-right diffuse light. Warm white source. Shadows fall bottom-left, low opacity (0.06–0.10). No hard shadows. |
| **Sticker / cutout style** | Rounded die-cut stickers with a 2px white outline and 1px soft drop shadow. Pastel-on-pastel. Stars, hearts, tiny florals. No glitter, no foil. |
| **Paper texture** | Matte cream cardstock. Faint grain at ~3% opacity over card bg (#FFF1E6). Hint of laid paper lines at 1% opacity. |
| **Glow treatment** | warmPeach (#FFB289) radial glow behind companion/hero element. Radius 48px. Opacity 18%. Softlight blend mode. No sharp edge. |
| **Selector ring** | warmPeach stroke, 2px, inside align. Subtle pulse animation (scale 1.0→1.02→1.0, 1200ms breath). |
| **❌ Do not** | Use neon or saturated colors. Add foil/metallic effects. Use hard drop shadows. Use any color outside the raylene palette. Center-align all text — body text is left-aligned. |

---

## 🌃 rylane — "Rylane After Dark"

**Feel:** Evening by a rain-streaked window. Cool, calm, slightly dreamy.

| Dimension | Direction |
|-----------|-----------|
| **Lighting** | Cool diffuse light from the top-left. Blue-tinted ambient. Rim light on companion from the right at low opacity (0.12). |
| **Sticker / cutout style** | Clean matte cutouts — no outlines. Soft shapes: clouds, moons, tiny stars. Slightly frosted look (backdrop blur:4 on sticker layer). |
| **Paper texture** | Light watercolor paper grain at 2% opacity over #E4EFF6 card. Very subtle. Not newsprint, not kraft. |
| **Glow treatment** | skyBlue (#7EC8E3) radial glow. Radius 52px. Opacity 15%. Screen blend mode for the cool tint effect. |
| **Selector ring** | skyBlue (#7EC8E3) stroke, 2px. No pulse — static ring with a soft outer glow (box-shadow). |
| **❌ Do not** | Use warm tones (orange, gold) as dominant elements. Make it feel "nighttime dark" — this is cool evening, not dark mode. Use high-contrast shadows. Add sparkle or star-burst effects. |

---

## ☁️ cloud — "Cloud Drift"

**Feel:** Floating. Gentle. Outdoors midday but soft, no harsh sun.

| Dimension | Direction |
|-----------|-----------|
| **Lighting** | Even, diffuse overhead light. No directional shadow. Everything feels slightly lifted — low elevation model. |
| **Sticker / cutout style** | Puffy die-cut style. Rounded blobs: clouds, bubbles, rounded stars. White outline 3px. Very soft drop shadow (y:4, blur:12, #A8E6CF at 20%). |
| **Paper texture** | Almost none. Very faint cotton-paper grain at 1.5% over #E8FAF4. Clean and airy. |
| **Glow treatment** | softMint (#A8E6CF) radial glow. Radius 44px. Opacity 20%. Normal blend. Diffuse, not concentrated — spread wide. |
| **Selector ring** | softMint (#A8E6CF), 2px. Gentle float animation (translateY -2px → 0, 1200ms, easeInOut loop). |
| **❌ Do not** | Use dark shadows or grounded effects — everything should float. Add grass, earth, or grounded scene elements. Use saturated accent colors. Make the companion mascot look "character-driven" — Cloud is abstract/mascot. |

---

## 🌙 night — "Night Comfort"

**Feel:** Cozy dark room. Lamp on, rest mode. Safe and warm despite the darkness.

| Dimension | Direction |
|-----------|-----------|
| **Lighting** | Single warm point light source (bottom-center of scene, like a bedside lamp). sunGold (#FFD166) glow. Everything else is dark ambient. |
| **Sticker / cutout style** | Glowing stickers — not neon, but warm-illuminated. Stars with soft glow halos (#FFD166 at 8%). Moon crescent, firefly shapes. White fills with low-opacity gold outline. |
| **Paper texture** | Dark vellum. Faint noise grain at 4% over card bg (#2A2440). Slightly textured, not flat. |
| **Glow treatment** | sunGold (#FFD166) concentrated glow. Radius 56px. Opacity 22%. Overlay blend mode. Source appears near companion base — like they're lit from below. |
| **Selector ring** | sunGold (#FFD166), 2px. Slow shimmer (opacity 1.0→0.6→1.0, 1500ms). |
| **❌ Do not** | Use any light backgrounds — this is the only dark preset. Apply the invariant safety (#FFF3F3) and privacy (#7EC8E3) surfaces with the dark bg — they must remain their original light values. Use cold/blue tones as dominant elements. Make it look scary or sad — this is cozy rest, not horror. |

---

## 🌧️ rain — "Window Rain"

**Feel:** Watching rain through glass. Reflective, peaceful, slightly melancholy but safe.

| Dimension | Direction |
|-----------|-----------|
| **Lighting** | Flat grey-blue ambient light from behind the window (the scene). Interior is slightly darker. No strong shadows — diffuse only. |
| **Sticker / cutout style** | Watercolor-style cutouts. Raindrops (elongated teardrops), umbrellas, tiny clouds. Semi-transparent fills (65% opacity). No outlines — just the painted shape. |
| **Paper texture** | Watercolor paper — visible grain at 5% opacity over #E4EEF6 card. Slightly rough. Best achieved with SVG `feTurbulence` filter at low scale. |
| **Glow treatment** | skyBlue (#7EC8E3) very diffuse glow. Radius 40px. Opacity 12%. Behind card elements like window-reflection light. Low-key — this is the subtlest glow of all 6 vibes. |
| **Selector ring** | skyBlue (#7EC8E3), 2px. Slow drip animation (scale Y from 1.0 at top to 1.0 at bottom, 800ms stagger per drop). |
| **❌ Do not** | Make it feel cold or unwelcoming. Use hard-edged design elements — everything should be slightly soft. Add lightning or storm visuals. Use the warmPeach (#FFB289) accentB as the dominant color — it's a supporting accent only in this vibe. |

---

## 🌇 sunset — "Sunset Exhale"

**Feel:** End of day, warm horizon. Peaceful completion, golden hour.

| Dimension | Direction |
|-----------|-----------|
| **Lighting** | Horizontal light from the right (sun setting). Long warm shadows extending left. sunGold (#FFD166) raking light across scene. |
| **Sticker / cutout style** | Bold die-cut with warm outlines (warmPeach #FFB289, 2px). Sun rays, horizon lines, silhouetted birds (tiny). Warm gradient fills allowed on stickers only. |
| **Paper texture** | Warm-toned watercolor wash over card bg (#FFE8CC). Slightly orange-tinted grain at 4%. Gives a "golden hour photograph" feel. |
| **Glow treatment** | sunGold (#FFD166) large-radius glow. Radius 60px — the most expansive glow of all 6 vibes. Opacity 18%. Lighten blend mode. Fills the whole top of the scene, like actual sunset sky. |
| **Selector ring** | sunGold (#FFD166), 2px. Warm pulse (opacity 1.0→0.5→1.0, 900ms — slightly faster than raylene, matches the energy). |
| **❌ Do not** | Use cool colors (blue, mint) as dominant elements. Make it feel rushed or energetic — this is the exhale, not the hustle. Use softBerry (#E07A9F) as anything other than a subtle tertiary. Stack multiple gradient layers — one warm wash is enough. |

---

## Invariant Surfaces — All Vibes

These three surfaces **never change** regardless of active vibe. They must look the same in every frame:

| Surface | bg | border/indicator | text |
|---------|-----|-----------------|------|
| Safety warning | `#FFF3F3` | `#E07A9F` 1.5px | `#8B1A3A` |
| Privacy badge | `#E8F5FA` | `#7EC8E3` | `#1A4A5C` |
| Parent boundary | `#FFFBE6` | `#FFD166` 2px | `#2C1A0E` |
| Verification badge | `#E8FAF4` | — | `#0E2E22` |

In the night frame specifically: these surfaces appear as bright islands against the dark background. This is intentional — they must remain readable. Do not tint them with the night palette.
