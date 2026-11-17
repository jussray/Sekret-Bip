---
name: makevideo
description: Render an approved Se'kret Bip video master through Bip's own post-production-only FFmpeg renderer. Use for /MAKEVIDEO, /makevideo, /video, or ordinary requests such as "make this video" when the requested output belongs to Se'kret Bip.
---

# Se'kret Bip MAKEVIDEO adapter

Use Se'kret Bip's own approved-media renderer. Do not regenerate Bip character identity, invent characters, or substitute world authority for character authority.

## Authority

A render request authorizes bounded post-production only. Rendering does not grant final master approval or publication authority.

## Execute

1. Require a current `sekret-bip-video-master@v1` manifest and approved source descriptors with exact SHA-256 hashes.
2. Run:

```bash
node scripts/render-video-master.mjs --manifest <manifest.json> --sources <sources.json> --output <master.mp4> --receipt <render-receipt.json>
```

Optional approved audio may be passed with `--audio <audio-file>`.

3. Require `kind: "RENDERED"` and preserve the render receipt.
4. Verify the encoded master:

```bash
npm run verify:video:master -- --manifest <manifest.json> --media <master.mp4> --receipt <master-proof.json>
```

5. Run the mandatory Playwright playback proof:

```bash
npm run verify:video:playback -- --manifest <manifest.json> --media <master.mp4> --receipt <playback-proof.json>
```

6. Keep continuity, tone, audio-clarity, final approval, and publication as separate gates.

## Stop conditions

Stop on missing approval evidence, stale source hashes, identity-regeneration requests, invented-character requests, ffmpeg/ffprobe unavailability, failed master verification, failed Playwright playback, or missing final human approval.
