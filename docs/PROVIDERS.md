# Se’kret Bip Provider Guide

Providers are replaceable capabilities. Teen privacy, consent, identity, product truth, durable state, and safety remain owned by Se’kret Bip.

All providers must follow [`../GLOBAL_AI.md`](../GLOBAL_AI.md) and preserve:

```text
/elonmusk /garyvee lindymode redteam l99 redteam ooda /truthmode
```

## Shared release-truth rule

Look to Founder Control Room first for release-truth interpretation. Capture repository, PR, branch, exact head SHA, workflow, run, job evidence, classification, Cloudflare build/deploy status, runtime evidence, impact, and next gate.

GitHub Actions failures must be classified as `runner_startup_failure`, `workflow_no_jobs`, or `workflow_step_failure` before any provider blames code. Zero-step/no-log jobs are infrastructure evidence, not code-regression proof. Infrastructure outages can still gate merge and release truth under this repo’s rules.

Cloudflare build/deploy evidence is separate from GitHub Actions evidence. Cloudflare success does not prove Playwright, auth, data, privacy, Supabase, Worker, or app runtime gates. GitHub runner outage does not prove application failure.

## Claude / Claude Code

Best for long-context repository analysis, Expo/Supabase/Worker implementation, design-system-aware changes, structured refactors, and documentation. Claude must read `GLOBAL_AI.md`, `AGENTS.md`, and the existing root `CLAUDE.md`. It may not infer unseen dashboard, database, GitHub Actions, Cloudflare, or deployment state.

Claude may continue work until a focused task is done or a real blocker is reached. It may merge only when the merge is the correct evidence-backed integration step and the local merge conditions are satisfied.

## Codex / ChatGPT

Best for debugging, code review, tests, repository operations, data analysis, threat modeling, Playwright, CI triage, and founder-readable decisions. It must read `AGENTS.md` and `GLOBAL_AI.md`. Tool evidence is required for claimed writes, tests, Playwright proof, merges, Cloudflare evidence, or deployments.

Codex/ChatGPT must not claim a code regression from GitHub jobs with no executed steps or logs. It must keep working actual code/review issues when independently proven, while treating runner outage as infrastructure and release-truth evidence.

### Codex provider baseline

When a repo-running Codex agent needs model-provider configuration, keep it machine-local and use OpenAI/Codex as the default coding engine:

```toml
model = "gpt-5.3-codex"
model_provider = "openai"
model_reasoning_effort = "high"
model_reasoning_summary = "auto"
model_supports_reasoning_summaries = true
model_auto_compact_token_limit = 900000
```

Store the API key outside the repository, for example in `~/.codex/.env`:

```dotenv
OPENAI_API_KEY=replace_with_local_secret
```

Never commit `.codex/.env`, `OPENAI_API_KEY`, `MODEL_API_KEY`, service-role keys, provider tokens, Supabase service-role keys, Cloudflare tokens, GitHub tokens, or any other secret. Model choice does not override `AGENTS.md`, `GLOBAL_AI.md`, repository skills, teen privacy, Founder Control Room release truth, Playwright requirements, or explicit founder approval gates.

## OpenAI Platform

Use only behind trusted Worker or server-side boundaries for model responses, voice, moderation, embeddings, or structured output. Keep keys off clients. Version models, prompts, tool schemas, safety behavior, and provenance. Model output is never authorization, consent, identity truth, clinical judgment, or a reason to bypass RLS.

For companion behavior, read [`COMPANION_IDENTITY_BIBLE.md`](./COMPANION_IDENTITY_BIBLE.md) before changing companion prompts, fallback packs, character voices, synthetic evals, memory behavior, or AI transparency.

For companion naming behavior, read [`COMPANION_NAME_CANON.md`](./COMPANION_NAME_CANON.md) before changing display names, aliases, voice labels, UI copy, fallback packs, fixtures, or legacy internal ids for Suhana, Sy, Raylene, or Rylane.

For Soria world/culture behavior, read [`SORIA_CANON.md`](./SORIA_CANON.md) before changing companion lore, homeworld references, Sorian customs, holidays, family lineages, spiritual route handling, or non-spiritual route handling.

For Cloud origin behavior, read [`CLOUD_ORIGIN_CANON.md`](./CLOUD_ORIGIN_CANON.md) before changing Cloud’s sky-family, cloud parents, birth-cloud pairing, shared birthday customs, Cloud voice, Cloud fallback packs, or Cloud relation routing.

For on-the-fly Sorian relation behavior, read [`SORIA_RELATION_PALETTE.md`](./SORIA_RELATION_PALETTE.md) before changing cloud references, Sorian living-world objects, birth-cloud behavior, tiny relation bridges, or fallback palettes.

For Soria humor behavior, read [`SORIA_JOKE_PALETTE.md`](./SORIA_JOKE_PALETTE.md) before changing companion jokes, playful replies, safe roasts, Cloud whimsy, Sorian meme logic, joke fallback packs, or humor voice style.

For OpenAI-backed companion runtime behavior, read [`OPENAI_COMPANION_RUNTIME.md`](./OPENAI_COMPANION_RUNTIME.md) before changing text replies, TTS, STT, future realtime voice, provider adapters, schemas, safety repair, fallback selection, Soria relation routing, or voice style instructions.

## Anthropic Platform

Use only behind trusted server-side boundaries for model capability or repository assistance. Keep keys off clients. Conversation context is not durable teen memory, consent, or product state. Validate outputs before writes, user-visible safety decisions, or repository mutation.

## Perplexity

Use for current public research, official documentation discovery, policy and market research, and source gathering. It does not know private repository, Supabase, Worker, account, Cloudflare, GitHub Actions, or production state unless those systems are explicitly connected and inspected.

Perplexity findings can support context. They do not override repository evidence, Founder Control Room, Cloudflare build logs, Playwright, Supabase, or runtime proof.

## GitHub

Use for source, branches, review, CI evidence, provenance, and rollback. A commit, PR, merge, Cloudflare build, Supabase migration, EAS build, store submission, and healthy runtime are separate states.

GitHub Actions badges are not enough. Inspect runs, jobs, steps, and logs. If steps/logs are absent, classify as infrastructure evidence and check Founder Control Room before making release claims.

## Supabase

Owns Auth, Postgres, RLS, Storage, RPCs, functions, and durable user data. Service-role credentials remain server-side. Identity, parent-link, consent, deletion, and visibility rules require policy/service enforcement and regression tests.

Supabase is the canonical durable application base for Se’kret Bip. Auth identity, account and relationship state, consent and parent-link state, durable application records, storage references, and database policy truth must originate from or reconcile to Supabase. Do not create a second durable auth or data authority in Firebase, Cloudflare, Expo, or another provider.

Firebase App Check, FCM, Firebase Hosting, Cloudflare, and Expo may protect, transport, execute, host, notify, cache, or observe within their approved boundaries, but they may not independently redefine user identity, RLS, consent, relationship truth, or durable user state. Any future provider must integrate around this Supabase authority unless a founder-approved migration explicitly replaces it with rollback and verified data/auth continuity.

Do not introduce the deprecated Management API `logs.all` analytics endpoint into observability or proof tooling. New Management API log queries must use the supported `logs` endpoint and its ClickHouse SQL contract. A provider-log query is observability evidence only; it cannot grant data access, weaken RLS, or prove an application outcome.

## Firebase

Firebase is a bounded supporting provider for Se’kret Bip, not a second application authority.

### Project identity

- Firebase project: `sekretbip-7e2b1`
- canonical teen Apple/iOS bundle identifier: `com.sekretbip.app`
- parent Apple/iOS bundle identifier: `com.sekretbip.parent`
- the teen and parent app identities are distinct; do not collapse or silently reuse one Firebase App ID for both

The Firebase Apple App ID, web App ID, numeric project number, and `GoogleService-Info.plist` are provider-returned identities. Never guess, fabricate, or derive them from the bundle identifier. Record them only after authenticated Firebase tooling returns them.

### Approved capability boundary

Firebase may provide:

- App Check attestation for requests reaching the canonical Cloudflare Worker;
- Firebase Hosting as an alternate static host for the existing Expo web export;
- FCM only when the existing Expo notification architecture explicitly requires or adopts it.

Firebase must not become Se’kret Bip Auth, Firestore, Realtime Database, durable Storage authority, Functions authority, relationship truth, consent truth, parent/teen authority, or another durable application backend while Supabase remains canonical.

The current notification path uses Expo notification tokens. Do not add a direct FCM client path merely because Firebase is present. A notification-provider change requires a separate need, migration boundary, rollback, and device proof.

### App Check contract

Supabase authentication is evaluated independently from Firebase App Check. A valid Firebase App Check token proves app attestation only; it cannot create a principal, replace an Authorization bearer token, weaken RLS, or grant user/parent/teen authority.

The Worker accepts App Check only through `X-Firebase-AppCheck`. Supported Firebase App IDs must be explicitly allowlisted. Web and Apple clients may have different Firebase App IDs, so a single web-only expected app ID is not sufficient for multi-client rollout.

Rollout order is mandatory:

```text
off
→ bind authenticated provider identities
→ acquire real client token
→ observe
→ verify telemetry + exemptions + failure behavior
→ exact-runtime proof
→ separately approve enforce
```

`FIREBASE_APPCHECK_MODE = "off"` is the checked-in safe default and one-variable rollback. `observe` must preserve legitimate traffic while producing non-token evidence. `enforce` is forbidden until the intended client cohort can consistently acquire and attach valid real tokens and the failure path is proven.

Client App Check tokens must not be persisted in AsyncStorage, SecureStore, cookies, durable database state, or source-controlled fixtures. The canonical backend-header carrier may request a fresh token from a registered provider and attach it per request.

### Firebase Hosting contract

Firebase Hosting serves the existing Expo static web output from `dist` with SPA fallback. It is an additional provider surface only.

Do not bind, transfer, replace, or infer ownership of `app.sekretbip.net`, `api.sekretbip.net`, or the canonical Cloudflare frontend/API path from the presence of `firebase.json`, `.firebaserc`, a successful Firebase deploy, or a `*.web.app`/`*.firebaseapp.com` URL.

A Firebase Hosting deployment proves only that the Firebase-hosted artifact was deployed. It does not prove canonical-domain traffic, Cloudflare Worker health, Supabase health, auth, RLS, app runtime, Playwright user journeys, or production equivalence.

### Firebase proof ladder

For any Firebase continuation, classify each layer separately:

1. **Repository**: exact branch/head contains intended config and contracts.
2. **Provider identity**: authenticated Firebase tooling confirms project/app identities.
3. **Client configuration**: Apple/web SDK configuration is bound to the provider-returned identities.
4. **Build**: applicable web/native builds and focused tests pass on exact head.
5. **Runtime attestation**: a real intended client sends a valid App Check token and observe-mode telemetry proves acceptance without granting identity.
6. **Hosting**: Firebase deploy returns the actual Hosting URL and deployment receipt.
7. **Canonical production**: separately prove whether any canonical Se’kret domain intentionally points to that artifact. Never infer this from step 6.

Missing evidence at one layer stays `UNKNOWN` or `BLOCKED`; success at another layer cannot donate proof upward.

## Cloudflare Workers / Pages

Own privileged AI, voice, authenticated API, Pages/Worker build and deploy evidence, and server-side integration calls. Verify CORS, authentication, input validation, secrets, logging minimization, rate limits, costs, and fallback behavior. Worker or Pages deployment success is not proof that app clients use the intended endpoint safely.

## Expo / React Native

Own app runtime, navigation, device behavior, permissions, and platform differences. Preserve Expo Go unless a native build requirement is explicit and approved. Verify web and device behavior where the changed path supports both. Use Playwright for applicable web/runtime path proof.

When an Expo Go version enforces account matching, the CLI and Expo Go app must be signed into the same Expo account before a QR-code or project-loading failure is treated as application evidence. Account/session mismatch, EAS service disruption, build-queue failure, update failure, or push-delivery incident is provider-state evidence first, not proof of an application defect.

Before changing app code in response to an Expo/EAS failure, inspect the provider status and the exact build/update/notification execution evidence. Provider failure may block release or device proof, but it does not justify a code change unless independent app evidence shows a defect. Preserve the previous code state and rerun the same proof path after provider recovery when that is the smallest valid check.

## Required provider handoff

Every handoff should state:

- verified source and current environment;
- teen/parent/public/private identity context;
- data minimized or intentionally excluded;
- requested decision or action;
- approval state;
- expected output or schema;
- safety, privacy, and proof requirements;
- GitHub Actions classification when relevant;
- Cloudflare build/deploy evidence when relevant;
- Playwright proof or inapplicability when relevant;
- rollback or fallback.

A provider may produce a fluent response. It does not inherit permission to see, share, remember, or rewrite teen data because the prose sounded caring.
