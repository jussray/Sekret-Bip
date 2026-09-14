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
- final MP4/H.264 render.

Forbidden:

- regenerating or replacing Night, Suhana, Sy, Cloud, or another bound character;
- inventing a missing cast member or source shot;
- using world-authority imagery as character authority;
- rewriting the episode's causal rule to rescue a weak edit;
- treating an editor export, ffprobe pass, or static frame as browser playback proof.

## Episode 001 carrier

`production/video-use/episode-001.json` owns the machine-readable master target and proof requirements for **The Bridge That Listens**.

The durable flow is:

```text
approved shot clip
→ shot fingerprint/cookie
→ video-use edit
→ final master
→ metadata proof
→ Playwright playback proof
→ continuity review
→ episode cookie
```

No episode cookie is issued from metadata or playback alone.

## External tool installation

Do not vendor `video-use` into this repository and do not copy its `.env` here. Its upstream install expects a stable external clone, `ffmpeg`/`ffprobe`, and optionally an ElevenLabs key for transcription. Se'kret Bip repository code must not contain that key.

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

## Rollback

This integration is additive. Remove the manifest, verifier scripts, package commands, contract test, and this document. Approved source clips and character/world canon are unchanged.
