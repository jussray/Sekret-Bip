# Se’kret Bip Character Canon

This directory owns **who exists**.

`registry.json` is the machine-readable character fingerprint registry for visual production.

## Hard rule

```text
WORLD_REFERENCE != CHARACTER_REFERENCE
```

Do not use a portal poster, ensemble poster, generated storyboard, or world concept to identify a companion.

For supported Higgsfield generation, compile a friendly trigger to the exact reusable element placeholder:

```text
@NIGHT_CANON -> <<<25b76824-adb9-4cc6-803f-9d272ed8417b>>>
```

The raw `@NIGHT_CANON` string is a repository trigger, not proof that a provider will bind the right reference automatically.

## Cast lock

Every generated shot must declare an exact cast before generation.

Unlisted people are forbidden unless the episode explicitly defines background inhabitants.

Bip Jr. characters are opt-in per shot. “Cute younger kid”, “extra children”, or any other generic substitute is not an acceptable replacement.

## Identity check before animation

A character still must be reviewed for:
- face and silhouette;
- age lane;
- hair and stable visual markers;
- clothing continuity required by the episode;
- role and relationship;
- exact cast count;
- absence of substitute or duplicate characters.

Failure in any item blocks video generation for that shot.

## Sorian pair-recognition gate

The Sorian pair architecture is machine-readable in `registry.json` under `sorian_pairs`:

```text
Night + Nyra   = Awareness  / Crescent Eye
Suhana + Suhan = Belonging  / Open Circle
Sy + Sya       = Discovery  / Split Star
```

The pair rule is:

> **Pairs rhyme, never clone.**

Night, Suhana, and Sy already have approved character-authority/provider references. Their face, hair, clothing, proportions, and silhouette must come from those exact references, never from prose or an ensemble/world image.

Nyra, Suhan, and Sya currently have founder-approved **design contracts**, not approved visual character-authority references. Their design contracts may define intended differentiation, palette, symbol, magic direction, and silhouette requirements, but they must remain:

```text
character_authority_bound = false
provider_reference_bound = false
generation_allowed = false
continuity_cookie_eligible = false
```

until an exact isolated character-authority reference is approved and bound.

A beautiful render does not promote itself to canon. A world poster does not promote itself to canon. A counterpart must pass the same-film test and the recognition gate before it becomes generation-eligible.

### Recognition sequence

```text
approved original references
→ isolated counterpart character-authority reference
→ six-character neutral contact sheet
→ 128 px silhouette read
→ 64 px silhouette read
→ face / palette / symbol / accessory review
→ provider reference binding
→ character fingerprint verification
→ generation eligibility
→ shot-specific still review
→ continuity cookie eligibility
```

The 128 px and 64 px checks are recognition tests, not permission to flatten textured hair or erase stable identity markers. The visual constitution still requires detailed textured hair, age-true proportions, shared cinematic rendering, and individual clothing/accessory identity.

Run the machine gate before visual production:

```text
npm run verify:character-canon
```

If the registry claims a pending counterpart is generation-ready without exact character authority and a provider reference, verification must fail closed.
