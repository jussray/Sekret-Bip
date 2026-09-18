# Video Post-Production Contract

Status: **repository contract**

Se'kret Bip may use `browser-use/video-use` as an external editing skill after shot-level canon has already been approved. It is an editor, not a character, world, or story authority.

## Authority boundary

Allowed:

- inventory approved motion clips;
- trim and sequence approved clips;
- audio mix and voiceover;
- captions, logo, closing text, and deterministic motion graphics;
- color adjustment that does not change identity or world meaning;
- widescreen reframing of approved source that does not alter character identity or hide a missing required cast member;
- final MP4/H.264 render.

Forbidden:

- regenerating or replacing Night, Suhana, Sy, Cloud, or another bound character;
- inventing a missing cast member or source shot;
- using world-authority imagery as character authority;
- rewriting the episode's causal rule to rescue a weak edit;
- turning child-safe curiosity into fear, threat, danger, or menace;
- treating an editor export, ffprobe pass, or static frame as browser playback proof.

## Episode 001 carrier

`production/video-use/episode-001.json` owns the machine-readable master target and proof requirements for **The Bridge That Listens**.

Current master target:

```text
platform: YouTube
runtime: 64 seconds ± 0.5 seconds
aspect: 16:9 widescreen
resolution: 1920 × 1080 minimum; higher 16:9 masters are valid
frame rate: 30 fps
container/codec: MP4 / H.264
audience: young children
tone: curious → magical → playful → exciting → reassuring
```

The durable flow is:

```text
approved shot clip
→ shot approval evidence
→ video-use edit
→ final master
→ metadata proof
→ Playwright playback proof
→ continuity review
→ tone review
→ audio-clarity review
→ YouTube target-identity review
→ final master approval / publish eligibility
```

Shot approval evidence means the source shot has already passed the Short Engine's still/animation canon gates. It is evidence, not a new authority object.

The metadata and playback verifiers do **not** independently validate shot-level approvals, child-safe tone, audio mix quality, or YouTube channel ownership. Their receipts therefore emit `sourceApprovalVerified: false` and `publishEligible: false`. They prove only their own layer and cannot approve or publish the final episode.

Both receipts carry the SHA-256 of the exact MP4 they inspected. Downstream review must reject the proof set if metadata, playback, continuity, tone, audio, or publish receipts do not refer to the same final master bytes.

The GitHub Actions synthetic master is a **transport-contract test only**. A black synthetic 16:9 file can prove ffprobe/Chromium behavior, exact-head checkout, and verifier policy. It can never prove source approval, character continuity, story quality, child-safe tone, audio clarity, or a live YouTube integration.

## Visual providers

Visual-generation providers are execution lanes, not canon authorities. Gemini/Nano Banana output is allowed only under the Short Engine's exact-reference and still-review gates. Provider completion is never equivalent to shot approval.

## External tool installation

Do not vendor `video-use` into this repository and do not copy its `.env` here. Its upstream install expects a stable external clone, `ffmpeg`/`ffprobe`, and optionally an ElevenLabs key for transcription. Se'kret Bip repository code must not contain that key.

Transcription is optional for the Episode 001 assembly path because narration/captions can be supplied from the approved episode script. Do not spend transcription credits merely to prove installation.

No provider key, token, upload credential, temporary signed URL, or secret-bearing environment file belongs in committed source, CI artifact names, proof receipts, logs, or packaged media metadata.

## Verification

Metadata:

```bash
npm run verify:video:master -- --manifest production/video-use/episode-001.json --media ./master.mp4 --receipt ./artifacts/video-master-proof.json
```

Browser playback:

```bash
npm run verify:video:playback -- --manifest production/video-use/episode-001.json --media ./master.mp4 --receipt ./artifacts/video-playback-proof.json
```

The metadata verifier requires H.264, at least 1920×1080, 16:9 geometry, 30 fps, and the target runtime.

The playback verifier serves the actual MP4 locally with byte-range support, opens it in Chromium, checks decoded minimum dimensions/aspect/duration, starts playback, and requires `currentTime` to advance.

## YouTube publication boundary

A valid MP4 is not authority to publish to an arbitrary connected YouTube account. Before publication, the exact connected channel identity must be proven to be the intended Se'kret Bip target. Episode 001 must not be published merely because an integration token is valid.

The content owner has specified a young-children audience for this episode. The publication step must preserve the correct YouTube audience designation and cannot infer a different audience from old metadata.

## Rollback

This integration is additive. Revert the widescreen Episode 001 production-lock commits to return to the prior proof carrier. Approved character/world canon and historical source clips remain unchanged.
