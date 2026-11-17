<!-- truth-mode: historical -->
# Se’kret Bip — Backend Wiring Status

> **Historical snapshot.** This former current-status document is retained so old links keep working. Its detailed prior contents remain preserved in Git history. Do not use it to determine current repository, provider, database, browser, issue, or device state.

For current structural contracts, use `README.md`, `docs/CURRENT_STATUS.md`, `DEPLOYMENT.md`, `docs/CLOUDFLARE_OWNERSHIP.md`, and the source code. For volatile state, resolve the owning system live and apply `docs/TRUTH_AUTHORITY.md`.

The durable wiring invariants are:

- Expo Router owns auth, onboarding, Teen, Parent, and founder/internal route groups.
- Supabase owns Auth, Postgres, RLS, Storage, Edge Functions, and ordered migrations.
- `supabase/migrations/` is the schema source of truth.
- `api.sekretbip.net` is the stable public API origin and is currently configured by the repository to `sekret-backend`.
- `sekret` is a founder-confirmed active companion API Worker lineage; its exact live provider routes/bindings must be read from Cloudflare rather than inferred from historical Wrangler names.
- The durable purpose split is companion reply/voice/transcription execution on `sekret` and privileged Bridge/data/email/platform authority on `sekret-backend`.
- The preferred migration keeps the client single-homed and uses a Cloudflare Service Binding from `sekret-backend` to `sekret` for `/api/sekret/*`; this is not live until provider and release evidence prove it.
- `sekret-bip` is the canonical Cloudflare Pages project.
- Shared typed frontend-to-companion contracts should remain the transport spine.
- `SUPABASE_SERVICE_ROLE_KEY` belongs to the privileged platform boundary and must not be duplicated into the companion Worker for convenience.
- Repository presence, deployment, live database state, production browser behavior, controlled-account behavior, and physical-device behavior are separate evidence classes.

Use Git history when a past wiring diagnosis or exact historical observation is needed.
