# Se’kret Bip Short Engine

Status: **CANONICAL PRODUCTION CONTRACT**

This engine turns approved canon into short-form episode assets without spending video credits to discover whether the characters are correct.

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
- exact required cast;
- approved character fingerprints;
- no substitute people;
- correct world palette and architecture;
- visible episode world rule where applicable;
- no accidental text/logo baked into the frame unless requested;
- founder or designated canon-review status `APPROVED`.

```text
if still_status != APPROVED:
    VIDEO_ALLOWED = false
```

## Episode keyframe gate

For Episode 001:
- create one portal/world keyframe first;
- that world keyframe fulfills storyboard Shot 3 (`portal opens`);
- then create the six remaining shot keyframes for Shots 1, 2, 4, 5, 6, and 7;
- review all seven final shot keyframes before animating any of them.

This interprets the production brief’s “one portal/world keyframe + six episode keyframes” against its seven-shot final storyboard without dropping a shot.

## Animation gate

Only animate an approved keyframe.

Animation must preserve:
- cast identity and count;
- facial and clothing continuity;
- world palette;
- portal/bridge rule;
- shot action;
- camera intent;
- emotional cause-and-effect.

If animation mutates identity, introduces a person, or breaks the world rule, reject the clip rather than repairing the mistake by generating unrelated replacements.

## Post-production boundary

Add exact title, captions, logo, and closing line in post-production, not by asking the image/video generator to typeset them into the world.

Master target:

```text
1080 × 1920
9:16 vertical
30 fps
MP4 / H.264
```

## Final proof-of-canon gate

A finished short passes only if a viewer can understand:
- these characters belong together;
- the world has consistent visual rules;
- the portal responds to emotion;
- the bridge has a meaningful rule;
- cooperation changes the environment;
- the closing line expresses what just happened.

Beautiful but causally meaningless magic is a failure.
