# Video Post-Production Contract

Status: **repository contract**

Se'kret Bip may use `browser-use/video-use` as an external editing skill after shot-level canon has already been approved. It is an editor, not a character, world, or story authority.

## Authority boundary

Allowed:

- inventory approved motion clips;
- trim and sequence approved clips;
- reframe approved material into the active master geometry without changing identity or story meaning;
- audio mix and voiceover;
- captions, logo, closing text, and deterministic motion graphics;
- color adjustment that does not change identity or world meaning;
- final MP4/H.264 render.

Forbidden:

- regenerating or replacing Night, Suhana, Sy, Cloud, or another bound character;
- inventing a missing cast member or source shot;
- using world-authority imagery as character authority;
- rewriting the episode's causal rule to rescue a weak edit;
- turning a curious child-safe beat into menace, danger, or frightening imagery;
- treating an editor export, ffprobe pass, or static frame as browser playback proof.

## Episode 001 carrier

`production/video-use/episode-001.json` owns the machine-readable master target and proof requirements for **The Bridge That Listens**.

The active master is YouTube-ready **16:9 widescreen**, **1920 × 1080 minimum**, **30 fps**, with a **64-second target**. The active episode carrier, not an older proof clip, owns the current story duration and shot count.

Legacy 25-second vertical footage may be reused only as approved source material when it still satisfies the current shot's cast, action, tone, and continuity. A vertical proof receipt cannot approve the current widescreen master.

The durable flow is:

```text
approved shot clip
→ shot approval evidence
→ video-use edit
→ final master
→ metadata proof
→ Playwright playback proof
→ continuity + tone + audio review
→ YouTube target identity review
→ final master approval
```

Shot approval evidence means the source shot has already passed the Short Engine's still/animation canon gates. It is evidence, not a new authority object.

The metadata and playback verifiers do **not** independently validate shot-level approvals. Their receipts therefore emit `sourceApprovalVerified: false`. They prove only their own layer and cannot approve the final episode.

Both receipts carry the SHA-256 of the exact MP4 they inspected. Continuity review must reject the proof set if the metadata and playback hashes do not match the same final master.

## Gemini and other visual providers

Google Gemini visual models may participate as execution providers only. When named Se’kret Bip characters are present, the exact approved character references must be supplied and the result must pass the same still/animation identity and continuity review as any other provider.

A Gemini render does not create character, world, episode, or approval authority. A Gemini video model remains canary-only until the provider registry says `productionEligible: true` after an exact Bip identity canary, cost preflight, and playback proof.

## External tool installation

Do not vendor `video-use` or provider credentials into this repository and do not copy external `.env` files here. Se'kret Bip repository code must not contain provider keys, tokens, or account secrets.

Transcription is optional for the Episode 001 assembly path because narration/captions can be supplied from the approved episode script. Do not spend transcription credits merely to prove installation.

## Verification

Metadata:

```bash
npm run verify:video:master -- --manifest production/video-use/episode-001.json --media ./master.mp4 --receipt ./artifacts/video-master-proof.json
```

Browser playback:

```bash
npm run verify:video:playback -- --manifest production/video-use/episode-001.json --media ./master.mp4 --receipt ./artifacts/video-playback-proof.json
```

The playback verifier serves the actual MP4 locally with byte-range support, opens it in Chromium, checks decoded dimensions/duration, starts playback, and requires `currentTime` to advance.

Before publish, verify that the connected YouTube target is the intended **@Sekret_Bip** channel. A valid connection with an ambiguous account label is not sufficient evidence.

## Rollback

This integration is additive. Revert the focused Episode 001 production-lock commits to restore the previous contract. Approved source clips and character/world canon remain unchanged.
