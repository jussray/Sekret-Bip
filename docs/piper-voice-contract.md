# Canonical companion voice contract

Se'kret Bip treats reply, voice synthesis, and transcription as one companion API contract. Clients use the shared typed Worker client and do not call Piper, Cloudflare AI, ElevenLabs, or OpenAI voice endpoints directly.

## Current routing

The checked-in production client calls `https://api.sekretbip.net`. Current `wrangler.toml` routes that public origin to `sekret-backend`, whose `worker/voice-entry.ts` currently owns the provider-aware voice front door.

This is the current deployment contract, not the final purpose boundary.

## Target purpose boundary

The best-fit runtime owner for companion voice is `sekret`, alongside:

- `/api/sekret/reply`;
- `/api/sekret/voice`;
- `/api/sekret/transcribe`.

The preferred migration keeps `api.sekretbip.net` stable and lets `sekret-backend` delegate `/api/sekret/*` to `sekret` through a Cloudflare Service Binding after provider readback and compatibility proof.

Conceptually:

```text
client
  -> api.sekretbip.net
  -> sekret-backend
  -> service binding
  -> sekret /api/sekret/voice
  -> selected voice provider
```

Do not add a second public voice URL to the app solely to perform this split.

## Voice provider routing

Current `worker/voice-entry.ts` supports a provider mode contract:

- `legacy` delegates to the prior Piper/OpenAI path;
- `cloudflare-only` uses the Cloudflare voice route;
- `hybrid` uses Cloudflare by default and a configured precise-timing provider when required.

Piper remains a supported legacy/runtime option where configured. The Worker may use its reviewed fallback provider if the primary path fails.

## Default legacy Piper character models

| Character | Piper model stem |
| --- | --- |
| Suhana | `en_US-amy-medium` |
| Sy | `en_US-ryan-medium` |
| Cloud | `en_US-amy-low` |
| Night | `en_US-lessac-low` |
| Sekret | `en_US-amy-medium` |
| Parent Coach | `en_US-amy-medium` |

These defaults must match any Piper runtime image used by the reviewed legacy path. Environment-specific voice overrides remain server-side.

## Security boundary

- AI/voice provider credentials belong to the companion execution runtime once the `sekret` split is activated.
- Keep provider tokens and private service URLs server-side.
- Never expose voice-provider credentials in Expo public environment variables.
- `SUPABASE_SERVICE_ROLE_KEY` is not a voice dependency and must not move into `sekret` merely because companion telemetry currently uses privileged persistence elsewhere.
- If `sekret` becomes service-binding-only, review and minimize its public route/workers.dev exposure separately.
- Do not deploy or mutate production from repository evidence alone.

## Verification gates

Before a voice-boundary cutover:

1. Prove the exact current public backend and `sekret` provider identities.
2. Run exact-head companion contract, auth, rate-limit, style, and voice tests.
3. Verify the target `sekret` release handles `/api/sekret/voice` and `/api/sekret/transcribe` with existing request/response contracts.
4. Verify provider routing and fallback without exposing provider secrets/details to the client.
5. Add/read back the `sekret-backend -> sekret` service binding.
6. Verify public requests still use `api.sekretbip.net` and execute on the intended companion Worker version.
7. Verify reply, voice, and transcription together, not voice in isolation.
8. Retain a rollback that returns `/api/sekret/*` to the previous backend-local implementation without a client release.

A successful voice provider call does not by itself prove the service binding, exact Worker release, auth boundary, or production client journey.
