# Se’kret Bip Canonical Character & Visual Constitution

Status: **approved direction; active design authority**

This document defines the visual contract for every Se’kret Bip character, illustration, welcome door, animation, loading state, story scene, and marketing asset.

## Golden rule

> Every character must look like they walked out of the same animated film.

Teen, Parent Space, and Bip Jr may carry different emotional tones, but they must never drift into different rendering styles or unrelated franchises.

## Authority hierarchy

1. **Teen welcome-door artwork** is the rendering and cinematic-style authority.
2. **Canonical standing/reference sheets** define identity, hair, clothing, accessories, personality, and silhouette.
3. **Parent Space and Bip Jr scenes** define age, role, emotional tone, and environment without inventing a new rendering engine.

Canva sticker/reference sheets are identity references. They do not override the approved cinematic rendering language.

## Canonical family

### Teen

- Night
- Suhana
- Sy

### Parent Space

- Mom
- Dad

Mom and Dad must feel like believable older relatives derived from the same family and rendering system as Night, Suhana, and Sy.

### Bip Jr

- Four younger children with distinct personalities and age-true proportions

Bip Jr characters may be younger and more playful, but must retain the same eye language, skin rendering, detailed coily/curly hair treatment, clothing material, violet lighting, and painterly finish.

### Cloud

Cloud is the connective character across every door. Cloud must keep one face, one glow model, and one rendering language throughout Teen, Parent Space, and Bip Jr.

## Rendering contract

### Faces and proportions

- Expressive eyes with soft anime influence, never exaggerated into a separate chibi-only style.
- Mature, emotionally readable facial proportions.
- Age differences are communicated through proportion and pose, not through a different art franchise.
- Family resemblance must remain visible across children, teens, and adults.

### Skin

- Warm painterly skin tones.
- Subtle gradients and dimensional highlights.
- No flat vector fills, waxy 3D plastic, or generic skin treatment.

### Hair

- Detailed coils, curls, twists, and visible volume.
- Soft movement and deep-violet rim lighting.
- Never reduce textured hair to a generic silhouette or blob.

### Clothing and materials

- Shared black, purple, lavender, silver, and restrained glow palette.
- Visible fabric, jewelry, accessories, and individual personality.
- Clothing may vary by character and door, but it must remain inside the same world.

### Lighting

- Moonlit cinematic atmosphere.
- Deep violet rim light.
- Soft pink or lavender highlights.
- Warm skin illumination and controlled glow.

## Never mix

Do not combine the approved cinematic family with:

- flat sticker rendering as final production art;
- unrelated vector mascots;
- Pixar-only rendering;
- anime-only rendering;
- generic photorealistic 3D;
- watercolor or painterly styles that do not match the Teen door;
- character proportions that make one door feel like another franchise.

## One family, three doors

### Teen

Emotional center: wonder, identity, friendship, secrets, and growing up.

### Parent Space

Emotional center: peace, safety, connection, family rhythm, and warmth.

### Bip Jr

Emotional center: curiosity, play, comfort, discovery, and imagination.

The emotional room changes. The animated film does not.

## Environment contract

Shared world elements include:

- moon and stars;
- restrained hearts and doodles;
- purple mist and soft clouds;
- lantern or ambient glow;
- gentle sparkles;
- premium nighttime atmosphere.

These elements support the characters. They must not bury the cast or turn the interface into a poster placed inside a webpage.

## Motion contract

The world should breathe rather than bounce:

- Cloud drifts;
- stars shimmer;
- hair moves softly;
- lantern glow pulses;
- moonlight shifts gently;
- ambient effects stop or remain still when reduced motion is requested or motion preference cannot be resolved safely.

## UI contract

- Premium, rounded, elegant, and spacious.
- Character artwork remains the emotional hero.
- Text and buttons remain real accessible interface elements, not critical copy baked into production art.
- Labels must not block the family, Cloud, or focal expressions.
- Each welcome door keeps a clear primary action above the safe area.
- Design-reference mockups are never imported directly as runtime interfaces.

## Approval gate: the same-film test

Before approving any visual, ask:

- Could Mom stand beside Night without looking imported from another artist?
- Could a Bip Jr child stand beside Sy without feeling like another franchise?
- Do eyes, hair, skin, clothing, and lighting obey one rendering system?
- Does the door preserve its emotional audience while remaining in the same universe?
- Is Cloud visually consistent across all spaces?
- Does the UI support the artwork rather than cover or compete with it?

If the frame could not exist in the same Se’kret Bip animated film, it is not approved.

## Runtime asset boundary

Production screens use semantic assets from `assets/images/`. Files in `design-references/` remain reference-only and must not be rendered as full-screen interfaces.

Existing runtime filenames may retain historical path names until an explicit code migration is reviewed. The filename does not override current character identity or this visual constitution.

Current legacy full-body paths:

| Current identity | Legacy runtime path |
|---|---|
| Suhana | `assets/images/companions/raylene/raylene-master.png` |
| Night | `assets/images/companions/night/night-master.png` |
| Sy | `assets/images/companions/rylane/rylane-master.png` |

A future asset migration must preserve compatibility or update every consumer in one verified change.

## Canva source of truth

Editable visual constitution:

- **Design:** `Se’kret Bip — Visual Constitution v1.0`
- **Canva design ID:** `DAHRfRz1uFQ`
- **View:** https://www.canva.com/d/hzdoHNK1iy_LMh3

The approved cinematic family portrait and future isolated standing sheets for Mom, Dad, and each Bip Jr child belong under this constitution.

## Verification rule

Documentation approval does not prove runtime appearance. Any implementation claim involving a screen, welcome door, animation, responsive layout, or production asset requires exact-head browser proof before merge.

## Rollback

Historical artwork remains in repository history and Canva source designs. New visual assets should be added under new semantic filenames until the replacement is verified. Do not destroy or overwrite historical source art during migration.
