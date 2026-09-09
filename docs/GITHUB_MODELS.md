# Se'kret Bip — GitHub Models boundary

GitHub Models is a model experimentation and evaluation lane. It is not an MCP server and it is not Se'kret Bip's production AI backend.

## Authentication

- GitHub Actions uses the repository's automatic `GITHUB_TOKEN` with only `contents: read` and `models: read`.
- Local development or Codespaces may use a fine-grained personal access token with only `models:read`, stored as the `GITHUB_MODELS_TOKEN` environment variable or a Codespaces secret.
- Never commit a token to this repository, `.mcp.json`, Expo configuration, source code, an issue, or a pull request.

## Allowed use

Use GitHub Models for:

- synthetic companion-response comparisons;
- prompt and style regression testing;
- safety-boundary evaluation using invented fixtures;
- structured comparisons of relevance, groundedness, tone, and instruction adherence;
- non-production provider experiments.

## Prohibited data

Do not send real:

- teen or parent messages;
- journal, voice, Bridge, Circle, Crew, room-memory, or account content;
- names, emails, Bip IDs, device identifiers, tokens, or database rows;
- safety alerts, moderation evidence, or production telemetry containing user-level data.

The committed prompt fixture under `.github/models/` is synthetic by design. The manual smoke workflow sends only a fixed synthetic string.

## Runtime authority

The Cloudflare Worker remains the production model gateway and continues to own authentication, safety handling, companion identity/style enforcement, telemetry, rollout, and rollback. A successful GitHub Models experiment is evidence for a model or prompt decision; it is not production-release evidence.
