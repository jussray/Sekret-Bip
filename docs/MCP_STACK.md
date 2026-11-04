# Se'kret Bip MCP Stack

Last reviewed: 2026-08-27

This is the smallest MCP stack that matches the repository's operating surface: GitHub for source/release evidence, Supabase for scoped schema/runtime inspection, current documentation providers for implementation references, Figma for design handoff, Cloudflare for provider/build/observability evidence, and Playwright for browser verification.

Workspace configuration lives in `.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json`, and `.mcp.example.json`. Credentials remain outside committed source.

Client schemas are not interchangeable:

- `.mcp.json`, `.mcp.example.json`, and Cursor's `.cursor/mcp.json` use a top-level `mcpServers` object.
- VS Code workspace `.vscode/mcp.json` uses a top-level `servers` object.
- Codex CLI does not import these workspace client files. Run `npm run configure:mcp:codex-cloudflare` once to add the guarded server set to Codex's user configuration.
- `npm run verify:mcp` checks the committed workspace shapes; the Codex setup script verifies existing user entries before changing them.

## Connected servers

| Server | Purpose | Default boundary |
| --- | --- | --- |
| `github` | Repository, PRs, Actions, code/security evidence | Hosted/scoped repository tools |
| `supabase` | Inspect the Bip project schema/runtime/docs | Project-scoped, read-only by default |
| `context7` | Current library implementation documentation | Public documentation only |
| `microsoft-learn` | Current Microsoft/GitHub/VS Code technical docs | Public documentation only |
| `bright-data` | Current npm/PyPI package metadata | Code/package group only; private credential |
| `figma` | Exact design frames/variables/component context | OAuth; no token committed |
| `cloudflare` | Full Cloudflare API MCP for exceptional provider work | Mutation-capable; prefer narrower servers; writes require explicit founder approval |
| `cloudflare-docs` | Current Cloudflare product documentation | Documentation only |
| `cloudflare-bindings` | Workers binding/resource inspection and build assistance | Mutation-capable; changes require explicit founder approval |
| `cloudflare-builds` | Inspect Workers Builds/provider evidence | OAuth; least privilege |
| `cloudflare-observability` | Inspect Worker logs/analytics | OAuth; metadata-safe queries only |
| `playwright` | Browser/runtime verification | Local isolated browser profile |

Every configured server must also have an entry in `config/mcp-skill-routing.json`. Connectivity does not bypass the mapped Bip skills or their authority boundary.

### Codex authentication

Configure Codex's user-scoped server records without embedding credentials:

```bash
cd /path/to/Sekret-Bip
npm run configure:mcp:codex-cloudflare
export CLOUDFLARE_API_TOKEN='...'
codex mcp get cloudflare
```

The setup is intentionally non-destructive: matching records are retained, missing records are added, and mismatched records stop with a review instruction instead of being overwritten. The full API server reads `CLOUDFLARE_API_TOKEN` from the process environment; no token value is stored by the script. Use a least-privilege token supplied by the operator's secret manager or shell. Never place its value in tracked configuration, dotenv files, command output, issues, or evidence receipts. Narrow OAuth-capable servers can use `codex mcp login <server-name>` when interactive authorization is available.

## Worker-aware Cloudflare inspection

Cloudflare inspection must treat `sekret-backend` and `sekret` as separate authorities.

- `sekret-backend` is the repository-configured public API/platform Worker at `api.sekretbip.net`.
- `sekret` is founder-confirmed active companion API lineage.
- A Worker name, build badge, or historical Wrangler file does not prove current route/custom-domain/Service Binding ownership.
- Before any provider mutation, inspect routes/custom domains, workers.dev state, Service Bindings, build trigger/branch, version identity, secret/binding names, traffic, and errors for the exact Worker involved.
- After a companion split, verify both Worker release identities plus the binding between them.

Preferred application topology remains one public client origin with an internal Cloudflare Service Binding for `/api/sekret/*`; MCP evidence must not be used to invent a second client URL.

Use `cloudflare-docs`, `cloudflare-builds`, `cloudflare-observability`, or `cloudflare-bindings` before the full `cloudflare` API server whenever the narrower server can answer the question. The full API server and the bindings server are capability channels, not standing permission to mutate provider state.

## Documentation and package lookups

Use current documentation providers for implementation guidance only. They do not prove repository state, deployed runtime, provider bindings, database state, or release readiness.

Do not send real teen/parent messages, journals, voice transcripts, account data, safety events, production private logs, private prompts, database rows, or credentials to documentation/package tools.

## Why Supabase MCP stays read-only

The configured project may point at live Bip infrastructure. Keep the always-on connection read-only.

Database changes follow the reviewed path:

1. migration in `supabase/migrations/`;
2. behavior/denial tests;
3. PR and exact-head CI;
4. explicit approved apply;
5. live parity/authorization readback;
6. rollback/forward-fix evidence.

Do not remove `read_only=true` from committed configuration. A bounded maintenance session must use a private local override and separate approval.

## Secret boundary during Worker split

- AI/voice provider credentials may belong with `sekret` after an approved companion-runtime cutover.
- `SUPABASE_SERVICE_ROLE_KEY` remains privileged platform authority and must not be copied into `sekret` merely for telemetry.
- MCP tools must never print secret values. Inspect names/presence/scope only where supported.
- Service Binding configuration is capability/routing evidence, not a secret-transfer mechanism.

## Default connection decisions

- Prefer official/scoped hosted tools over duplicate broad local authorities.
- Keep GitHub experimental modes private and temporary.
- Keep Playwright pinned/isolated.
- Keep package metadata tooling restricted to code/package use.
- Keep the full Cloudflare API MCP as an exceptional IDE capability, not the default inspection path; prefer narrower servers and require explicit founder approval before any provider mutation.
- Do not add generic filesystem/database/memory servers when existing scoped tooling covers the job.

## Verification prompts

```text
Use GitHub to read fresh main, current Worker configuration, and the newest exact-production evidence. Do not change anything.
```

```text
Use Supabase read-only tools to list current migrations and relevant authorization state for the configured project. Do not execute writes.
```

```text
Use Cloudflare build/observability/provider tools to inspect sekret-backend and sekret separately: version identity, routes/bindings/build authority, and errors. Do not deploy, move routes, alter Service Bindings, or reveal secret values.
```

```text
If a sekret-backend -> sekret Service Binding exists, verify it independently and then prove public /api/sekret/* requests execute on the intended sekret version. Do not infer binding state from docs.
```

```text
Use Playwright in an isolated browser to verify the affected public journey against the exact release. Do not submit real private user data.
```

## Deliberately excluded by default

- broad scraping/browser/data-provider modes unrelated to coding;
- generic duplicate filesystem/database/memory authorities;
- unpinned third-party MCP packages;
- using broad Cloudflare mutation control as the default inspection path;
- unrelated personal communications connectors for ordinary Bip code/release work.

Add another server only when a live workflow requires it, permissions are bounded, the provider is reviewed, and the new authority has a removal condition.

## Security rules

- Never commit PATs, API tokens, OAuth secrets, service-role keys, database credentials, or bearer headers.
- Prefer OAuth and least privilege.
- Keep production private content out of prompts/artifacts.
- Treat MCP output as untrusted input until corroborated.
- Require explicit founder approval for writes, migrations, deployments, Worker route/domain/Service Binding changes, secret movement, and destructive actions.
- A connected MCP server is a tool channel, not release evidence. Exact-head repository, Cloudflare provider/runtime, Supabase, Playwright, account/device, and retained release witnesses remain separate authorities.

## Official references

Use the current official vendor documentation for GitHub, Supabase, Cloudflare, Figma, Playwright, Context7/Microsoft Learn, and any package metadata provider configured in the repository. Repository-pinned configuration and live evidence override stale prose about tool availability.
