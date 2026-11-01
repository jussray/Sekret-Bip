# Se'kret Bip — OpenAI Keyframes to /makevideo

Status: operator-only media tool, not a live app route. OpenAI makes image stills; the existing /makevideo renderer assembles approved moving footage. Do not treat a generated still as an approved video.

## Safety and authority
- Read sekret-bip-world-bible.md, sekret-bip-character-canon/registry.json, the active episode, and .claude/skills/makevideo/SKILL.md before generating.
- The OpenAI image model is an execution provider, not character, world, episode, cast, safety, approval, or publication authority.
- Keep OPENAI_API_KEY in an operator-only trusted environment. Never commit it, include it in Expo, browser, CI logs, generated receipts, or public assets.
- Character shots require one exact founder-approved visual reference per cast member, an actual SHA-256 of its bytes, and identity review. Fingerprints verify bytes; they cannot alone prove founder approval.
- World/portal/poster art must never be substituted for a character reference.
- No API calls or credits are used in preflight. To execute a paid call, check provider access and budget, obtain explicit per-shot approval, and set approvedForGeneration:true in a private spec.
- Image receipts intentionally say GENERATED_REVIEW_REQUIRED and videoEligible:false. They never grant publishing, video, merge or deployment authority.

## 1. Keyframe dry run

node scripts/generate-openai-keyframe.mjs --spec examples/openai-keyframe-world.spec.json --registry sekret-bip-character-canon/registry.json

No key required. For a character shot, change mode to character-edit and supply the approved isolated image files in a private spec; do not commit private assets or private production prompts.

## 2. Execute one explicitly approved still

node scripts/generate-openai-keyframe.mjs --spec /secure/approved-shot.json --registry sekret-bip-character-canon/registry.json --execute --out /secure/shot-01.png --receipt /secure/shot-01-receipt.json

Review the PNG for exact visual identity, face/hair/clothing markers, cast count, Sorian world response, composition, and episode continuity. Only founder-approved reviewed keyframes can advance to video generation.

## 3. Image-to-video animation (separate provider)

Use an eligible image-to-video execution lane from production/video-providers/registry.json after checking actual provider connection, budget and model eligibility. Its output is an unapproved animated clip until shot-level continuity and identity review passes. Provider choice does not make canon.

## 4. /makevideo — required final assembly handoff

The repository's own .claude/skills/makevideo/SKILL.md invokes scripts/render-video-master.mjs, then metadata and browser playback verifiers.

Prepare a private /secure/approved-sources.json with one entry for each required animated MP4: shots array entries with shot number, absolute local MP4 path, approved:true backed by independent actual review, and the MP4 file's exact SHA-256. The hash of the still PNG does not qualify. Do not claim approval just by flipping a field.

Run ONLY after approved MP4 clips exist:

node scripts/render-video-master.mjs --manifest production/video-use/episode-001.json --sources /secure/approved-sources.json --output /secure/master.mp4 --receipt /secure/render-receipt.json

npm run verify:video:master -- --manifest production/video-use/episode-001.json --media /secure/master.mp4 --receipt /secure/master-proof.json

npm run verify:video:playback -- --manifest production/video-use/episode-001.json --media /secure/master.mp4 --receipt /secure/playback-proof.json

Important: Episode 001's existing manifest is 64 seconds, 16:9, 1920x1080, 30 fps and requires ten shots. A separate 9:16 Short must have a separately approved manifest; do not conflate the discarded 60-second vertical animatic with Episode 001.

Final continuity, tone, audio, founder signoff, and YouTube target identity review remain independent gates. This integration never automatically publishes or deploys.

## 5. Tests and rollback

node --test test/openai-keyframe-adapter.test.mjs

Tests use simulated provider outputs and do not prove live API access, approved imagery, animation, or end-to-end playback. Remove/revert only these additive script, test, docs and example files to roll back. No Expo/Cloudflare production deployment is required for this operator-side CLI.

Official docs: https://developers.openai.com/api/docs/guides/image-generation
## Explicit storyboard timing and source audio

For a new approved timed master, add a top-level `timeline` array to the existing
`sekret-bip-video-master@v1` manifest. Each required shot occurs exactly once;
array order is playback order. Each entry contains `shot`, positive
`durationSeconds`, and optional nonnegative `sourceStartSeconds` (default zero).
Durations and in-points must align to the master frame rate, and total duration
must equal `master.durationSeconds`. Example for a two-second synthetic check:

```json
"timeline": [
  {"shot": 2, "durationSeconds": 0.75, "sourceStartSeconds": 0.25},
  {"shot": 1, "durationSeconds": 1.25}
]
```

For a 60-second 30fps Short with six ten-second shots, use six timeline entries
of ten seconds and `master.durationSeconds: 60`. This is a timing example, not
founder approval of a new episode, source, character, or manifest.

Explicit timelines reject sources shorter than their selected range rather
than freezing the last frame to disguise missing footage. Each clip is
normalized independently before assembly. Its embedded audio is retained;
sources with no audio stream receive silence only for their own segment.
An explicit `--audio` remains an approved external soundtrack replacement, not
an audio mixer. Timed mode rejects external audio shorter than the master and
never loops dialogue. Only legacy mode retains looping-to-master behavior.
Intermediate timed segments use lossless PCM audio so repeated AAC encoder
padding does not accumulate between cuts. The final MP4 encodes AAC once.

Manifests without `timeline` retain legacy aggregate-duration padding/trimming
and silent fallback unless external audio is supplied. Do not use that legacy
mode to claim storyboard cut-time or source-sound fidelity. The renderer
receipt records the actual timeline and audio mode. Descriptor approval plus
matching hashes is not an independent human identity/continuity review, and
final master approval remains separate.

Focused verification: `node --test test/video-render-master.test.mjs` decodes
synthetic picture colors and audio frequencies around unequal reordered cuts,
checks mixed audible/silent sources, rejects incomplete timelines and short
footage, and retains the legacy renderer test. These checks do not prove
production character fidelity, spoken lip sync, provider access, or publication.
