# Se’kret Bip Short Engine

Status: **CANONICAL PRODUCTION CONTRACT**

This engine turns approved canon into episode assets without spending video credits to discover whether the characters are correct.

Read with:
- `sekret-bip-world-bible.md`
- `sekret-bip-character-canon/registry.json`
- the active `season-XX/episode.md`

## Compiler

```text
FOUNDER INTENTION
→ classify reference authority
→ WORLD LOCK
→ explicit CAST LOCK
→ compile trigger words to exact character elements
→ one still canary
→ canon review
→ episode keyframes
→ per-shot canon review
→ video animation
→ post-production text/audio
→ final continuity review
```

### Reference classes

- Character reference: identity only.
- World reference: world only.
- Episode reference: story meaning, action, timing, continuity.
- Exploration: non-authoritative until explicitly promoted.

A reference may have more than one class only when the founder explicitly says so.

## Trigger compiler

Use `sekret-bip-character-canon/registry.json`.

Example:

```text
CAST:
  @NIGHT_CANON
  @SUHANA_CANON
  @SY_CANON
  @CLOUD_CANON

HIGGSFIELD COMPILE:
  @NIGHT_CANON  -> <<<25b76824-adb9-4cc6-803f-9d272ed8417b>>>
  @SUHANA_CANON -> <<<b504054a-ee65-491e-aa37-0dccc740458c>>>
  @SY_CANON     -> <<<d0705c8f-4941-47f3-9d00-cb6161f1c9d3>>>
  @CLOUD_CANON  -> <<<45cc0133-5ad3-4182-90a5-4dca0d5b58fa>>>
```

Never substitute prompt-only descriptions for a bound character element when that character has an approved element.

## Character-recognition membrane

A design contract alone never satisfies character authority.

`registry.json` may describe a future/counterpart character’s intended symbol, palette, silhouette differentiation, or emotional role before an exact isolated visual reference exists. That descriptive contract is useful for review but is **not** permission to generate the character as canon.

For every named character requested in a generated still or clip:

```text
if character_authority_bound != true:
    GENERATION_ALLOWED = false

if provider_reference_bound != true:
    GENERATION_ALLOWED = false

if generation_allowed != true:
    GENERATION_ALLOWED = false
```

For Night, Suhana, Sy, Cloud, and any other already approved provider-bound character, compile only the exact canonical element registered for that identity.

For Nyra, Suhan, Sya, or any future counterpart whose registry state is `design-contract-approved-reference-pending`:

```text
NO prompt-only substitute
NO ensemble-poster crop promoted to identity
NO world-reference inference
NO provider trigger invented from a name
NO continuity cookie
```

Promotion requires an exact character-authority reference, provider binding, and the recognition review defined by the character canon. The 128 px and 64 px silhouette tests verify recognizability; they do not replace face, hair, clothing, symbol, accessory, or age-lane review.

Run:

```text
npm run verify:character-canon
```

before spending generation credits on a cast that touches the Sorian pair system.

## Cost membrane

Before any paid generation:
1. inspect the current credit/allowance state;
2. estimate the requested generation cost when the provider supports preflight;
3. choose the cheapest valid proof;
4. generate one still canary before a batch;
5. never spend video credits to discover identity or cast errors.

A low balance is not permission to produce only half of a paired/parallel deliverable or silently downgrade canon.

## Still gate

`VIDEO_ALLOWED = false` by default.

For each shot, video becomes eligible only after a still has:
- exact required cast from the active episode authority;
- approved character fingerprints;
- no substitute people;
- correct world palette and architecture;
- visible episode world rule where applicable;
- no accidental text/logo baked into the frame unless requested;
- founder or designated canon-review status `APPROVED`.

For Episode 001, `season-01/01-the-bridge-that-listens.md` is the shot-cast authority. Shots 5 through 10 that call for the full group require Night, Suhana, Sy, **and Cloud** exactly as specified in the episode carrier. A still or animation missing a required character is not approved source evidence for the final episode.

```text
if still_status != APPROVED:
    VIDEO_ALLOWED = false
```

## Visual provider boundary

Visual providers are execution lanes, not canon authorities.

Google Gemini image models, including Nano Banana-family models, may be used for world/keyframe generation when the active shot binds the correct authority references. If a named character appears, the exact approved character reference must be supplied to the provider. A Gemini render may not invent or promote identity, change cast count, reinterpret world-only imagery as character authority, or bypass still review.

Gemini video models may be evaluated as animation canaries under the same provider membrane as other animation systems. They are not required for Episode 001 and do not become production-eligible merely because a render completed.

## Episode keyframe gate

For Episode 001:
- create the world/portal keyframe first;
- create the remaining shot keyframes against the final ten-shot storyboard;
- review all ten final shot keyframes before treating the episode as fully animation-eligible;
- an existing approved motion clip may satisfy a shot only if its cast, action, tone, framing, and continuity still match the current Episode 001 authority.

The current Episode 001 carrier is a **64-second, 16:9 YouTube episode**. Legacy 25-second vertical evidence may remain useful as source footage, but it cannot by itself prove the current master.

## Animation provider routing

Animation providers are interchangeable execution lanes, not canon authorities. The machine-readable provider contract is `production/video-providers/registry.json`.

The existing Higgsfield route remains the default production route when it is available. Hugging Face is an additional canary lane so the production system is not locked to one provider. Gemini may also be evaluated as an external-service canary when the registry marks that candidate eligible.

A provider is eligible only when it preserves the existing gate:

```text
approved keyframe + exact cast/character canon
→ provider preflight
→ animation canary
→ identity/cast/world QA
→ accepted shot clip
→ post-production
→ ffprobe master proof
→ Playwright playback proof
→ final continuity approval
```

Provider rules:
- provider authority is animation-only;
- a provider cannot invent or promote character identity;
- text-only character identity is forbidden when an approved character reference/fingerprint exists;
- provider choice cannot override cast count, character fingerprints, world authority, shot action, or the episode rule;
- canary providers begin `productionEligible: false` and must pass an exact Bip identity canary before promotion;
- models with unresolved license/usage status remain ineligible even if technically capable;
- every generation lane requires cost/allowance preflight before paid or metered execution;
- a successful model render is not a shot approval and cannot issue final continuity approval by itself.

Repository gate:

```text
node scripts/verify-video-provider-registry.mjs
node scripts/verify-video-provider-registry.mjs --select-canary
```

Changing providers later must remain a provider-policy change rather than a character/world-canon rewrite.

## Animation gate

Only animate an approved keyframe or reuse an already approved motion source that still matches the active shot contract.

Animation must preserve:
- cast identity and count;
- facial and clothing continuity;
- world palette;
- portal/bridge rule;
- shot action;
- camera intent;
- emotional cause-and-effect;
- the child-safe tone specified by the episode authority.

If animation mutates identity, introduces a person, drops a required character, breaks the world rule, or turns curiosity into menace, reject the clip rather than repairing the mistake with unrelated replacements.

## Post-production boundary

Add exact title, captions, logo, and closing line in post-production, not by asking the image/video generator to typeset them into the world.

`browser-use/video-use` is an approved **post-production adapter**, not a canon or character-generation authority. It may assemble already-approved source clips, trim, mix audio, add captions/graphics, reframe approved source footage without changing identity, and render the master. It must not regenerate character identity, substitute cast, invent a missing shot, or reinterpret a world-only reference as character authority.

For Episode 001 the machine-readable contract is `production/video-use/episode-001.json`.

The post-production proof chain is:

```text
approved shot clips + shot approval evidence
→ video-use assembly/edit
→ MP4/H.264 master render
→ ffprobe metadata verification
→ Playwright playback proof
→ continuity + tone + audio review
→ final continuity approval
```

Shot approval evidence records that the source shot already passed the existing still/animation canon gates; it does not create a new authority object. An editor export alone is not proof. A metadata pass alone is not browser proof. Playwright playback proof must show that Chromium decoded the actual master and that playback time advanced. Final approval remains ineligible until continuity, tone, and audio review also pass.

Master target for Episode 001:

```text
1920 × 1080 minimum
16:9 widescreen
30 fps
64 seconds ± 0.5 seconds
MP4 / H.264
YouTube-ready
```

Repository verification commands:

```text
npm run verify:video:master -- --manifest production/video-use/episode-001.json --media <master.mp4> --receipt <metadata-proof.json>
npm run verify:video:playback -- --manifest production/video-use/episode-001.json --media <master.mp4> --receipt <playback-proof.json>
```

## Final proof-of-canon gate

A finished Episode 001 passes only if a viewer can understand:
- these characters belong together;
- the world has consistent visual rules;
- the portal responds to discovery;
- the bridge has a meaningful rule;
- cooperation changes the environment;
- the adventure remains curious, magical, playful, exciting, and reassuring;
- the mystery cut creates curiosity rather than fear;
- the bright goodbye leaves the child safe, happy, curious, and included;
- the closing line and Se’kret Bip end mark are understandable.

Beautiful but causally meaningless magic is a failure. A technically valid MP4 that violates the episode goal is also a failure.
