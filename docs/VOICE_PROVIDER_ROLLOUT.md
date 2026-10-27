# Voice Provider Rollout

Status: runtime implemented on draft PR #663; deployment proof remains open.

## Runtime target

`/api/sekret/voice` remains the single app-facing endpoint. Provider-specific logic stays behind the Worker boundary.

## Routing

| Request | Primary | One fallback |
|---|---|---|
| Suhana, Sy, Cloud, or Night without precise timing | Cloudflare Aura-2 | Cloudflare Aura-1 |
| Suhana, Sy, Cloud, or Night with precise lip-sync | ElevenLabs Flash | Cloudflare Aura-2 |
| Se'kret or Parent Coach | Cloudflare Aura-1 | none |

Legacy input identifiers `raylene` and `rylane` are accepted only at the compatibility boundary. Responses and public errors use `suhana` and `sy`.

## Required Worker bindings and secrets

- Workers AI binding: `AI`
- `ELEVENLABS_API_KEY` as a Wrangler secret for the premium timing lane
- Character-specific ElevenLabs voice IDs as Wrangler secrets
- `VOICE_PROVIDER_MODE`: `legacy`, `cloudflare-only`, or `hybrid`

Do not put secret values in `wrangler.toml`, committed env examples, logs, issue comments, or client bundles.

## Implemented runtime

- `worker/voice-entry.ts` is the active Wrangler entrypoint.
- Non-voice requests delegate to the existing observed Worker unchanged.
- Voice requests preserve origin checks, JSON content-type enforcement, authentication, and rate limiting.
- `worker/voice-providers.ts` implements Cloudflare Aura-1, Aura-2, and ElevenLabs timestamp adapters.
- `worker/voice-routing.ts` owns canonicalization and bounded routing.
- `VOICE_PROVIDER_MODE=legacy` delegates to the previous Piper/OpenAI path.
- `VOICE_PROVIDER_MODE=cloudflare-only` disables the ElevenLabs lane.
- `VOICE_PROVIDER_MODE=hybrid` uses ElevenLabs only when precise timing is explicitly requested.

## Response contract

The endpoint returns:

- `audioBase64`
- `contentType`
- canonical `characterId`
- `voiceProvider`
- `primaryVoiceProvider`
- `model`
- `usedFallback`
- `timing` when alignment is available
- `aiGenerated: true`
- runtime style metadata

It never returns provider credentials or legacy display names.

## Failure behavior

1. Call the selected primary provider.
2. If it fails and one fallback is configured, call that fallback once.
3. If both fail, return a visible typed 502 response.
4. Never report success with empty audio.

## Verification gates

- [x] Routed Worker entrypoint is active in `wrangler.toml`.
- [x] Cloudflare Workers AI adapter is implemented.
- [x] ElevenLabs timestamp adapter is implemented.
- [x] Canonical IDs are returned on success and error paths.
- [x] Focused source-contract tests cover routing, fallback, bindings, and retired-name non-leakage.
- [x] Runtime-style metadata fields match the existing `RuntimeStyleContract`.
- [ ] Typecheck and test suite pass on the exact PR head. No GitHub Actions run has started for the latest head yet.
- [ ] Wrangler dry-run succeeds on the exact PR head.
- [ ] Cloudflare account-level binding/secret/deploy verification. The Cloudflare connector was unavailable in this chat, so this cannot be claimed complete.
- [ ] Deployed canary proves Cloudflare success, premium timing success, one fallback, and typed failure.
- [ ] Targeted Playwright proves the real mobile voice and Rive lip-sync flow.

## Rollback

Set `VOICE_PROVIDER_MODE=legacy` to restore the previous voice path without reverting the entire Worker. Set `VOICE_PROVIDER_MODE=cloudflare-only` to disable the premium lane while retaining Aura. If the new entrypoint itself is unhealthy, revert PR #663 and redeploy the previous Worker commit.
