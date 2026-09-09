# Piper TTS for Voice Bip

Piper is the self-hosted voice option used by the legacy companion voice route. It is selected only when `VOICE_PROVIDER_MODE=legacy` and `PIPER_TTS_URL` is configured. The current production routing contract can use other providers in `cloudflare-only` or `hybrid` mode, so clients should continue calling the shared Se'kret Bip Worker API rather than Piper directly.

## Voice files

The checked-in Piper image already bakes the canonical companion models that `worker/piper-tts.ts` uses by default:

```text
voices/en_US-amy-medium.onnx
voices/en_US-amy-medium.onnx.json
voices/en_US-ryan-medium.onnx
voices/en_US-ryan-medium.onnx.json
voices/en_US-amy-low.onnx
voices/en_US-amy-low.onnx.json
voices/en_US-lessac-low.onnx
voices/en_US-lessac-low.onnx.json
```

Canonical character mapping:

| Character | Piper model stem |
| --- | --- |
| Suhana | `en_US-amy-medium` |
| Sy | `en_US-ryan-medium` |
| Cloud | `en_US-amy-low` |
| Night | `en_US-lessac-low` |
| Sekret | `en_US-amy-medium` |
| Parent Coach | `en_US-amy-medium` |

If a deployment mounts a custom `/voices` directory, each `.onnx` model still needs its matching `.onnx.json` file and the configured voice value must equal that model stem.

Use only models whose licenses permit the intended deployment. Voice-model licenses are separate from the Piper software license. Do not clone or imitate a real person's voice without permission.

Piper's current upstream implementation is GPL-3.0 licensed. Review the software and model license obligations before distributing or offering the service publicly.

## Run locally

```bash
docker build -t sekret-piper services/piper-tts
docker run --rm -p 8080:8080 \
  -e PIPER_API_TOKEN='replace-with-a-random-secret' \
  sekret-piper
```

Check the service with `curl http://localhost:8080/health`.

To test custom models instead of the models baked into the image, mount a replacement voice directory deliberately:

```bash
docker run --rm -p 8080:8080 \
  -e PIPER_API_TOKEN='replace-with-a-random-secret' \
  -v "$PWD/voices:/voices:ro" \
  sekret-piper
```

## Configure Cloudflare

Deploy Piper on a host that can run the container. For the legacy Worker path, set `PIPER_TTS_URL` to that HTTPS service URL and store the matching token securely:

```bash
wrangler secret put PIPER_TTS_TOKEN --name bip
```

Optional server-side voice overrides use the canonical character names:

```text
PIPER_SUHANA_VOICE=en_US-amy-medium
PIPER_SY_VOICE=en_US-ryan-medium
PIPER_CLOUD_VOICE=en_US-amy-low
PIPER_NIGHT_VOICE=en_US-lessac-low
PIPER_SEKRET_VOICE=en_US-amy-medium
PIPER_PARENT_COACH_VOICE=en_US-amy-medium
```

The defaults above already match `services/piper-tts/Dockerfile`, so overrides are needed only when the deployed models differ intentionally.

Piper does not charge per generated character or request. The server, storage, and bandwidth used to host it can still cost money.
