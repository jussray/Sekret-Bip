# Se'kret Bip — Supabase Setup and Trust Boundaries

Last reviewed: 2026-07-13

Supabase provides authentication, Postgres, Row Level Security, Storage, Realtime-capable data paths, database functions, and Edge Functions for Se'kret Bip.

The active production project is tracked in the repository security baseline. Never place service-role credentials or server-only secrets in the Expo bundle.

## 1. Client configuration

Copy `.env.example` to `.env.local` and add only client-safe public values:

```bash
cp .env.example .env.local
```

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_BACKEND_URL=
```

The public Supabase key is not an authorization bypass. RLS, RPC authorization, Storage policies, and server checks remain mandatory.

Never add service-role credentials, database passwords, Edge Function shared secrets, or AI provider keys to public variables.

## 2. Authentication model

The canonical product flow is:

```text
Splash -> Age Gate -> Sign Up / Sign In -> Private Profile Setup -> Teen or Parent App
```

Current account identity is based on Supabase Auth users and private profile/account records. Do not restore anonymous sign-in as a default boot behavior without a reviewed product, migration, privacy, merge, and deletion plan.

Account and cloud synchronization must remain blocked until age and account/profile gates are resolved.

Real names and private account fields must not be reused as public Circle identity. Public identity, trusted relationships, guardian access, and private-self contexts are distinct authorization surfaces.

## 3. Schema source of truth

`supabase/migrations/` is the only schema source of truth.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Rules:

- do not paste a second full bootstrap schema into the SQL editor;
- do not edit live tables without a repository migration and reconciliation plan;
- migration filenames and live migration versions must agree;
- migrations must replay in order against a fresh project;
- data migrations require explicit rollback or correction strategy.

## 4. Authorization evidence

Current verified live slices are recorded in:

- `security/supabase-authorization-baseline.json`
- `docs/security/SUPABASE_AUTHORIZATION_PHASE0.md`
- `supabase/probes/authorization_phase0.sql`

Verified slices currently include:

- owner access for sampled private tables;
- cross-user read and update denial;
- anonymous denial;
- zero synthetic probe residue;
- server-only configuration tables with zero client grants and preserved rows;
- `notification_deliveries` as an intentional service-role-only table;
- JWT-protected retirement of obsolete release/probe Edge Functions.

These proofs are scoped. They do not certify every table, function, Storage path, or relationship state.

## 5. RLS and database functions

UI hiding never counts as authorization.

For user-owned tables:

- derive ownership from `auth.uid()` or an equivalent reviewed relationship boundary;
- test positive owner access;
- test anonymous denial;
- test cross-user read and write denial;
- test parent, guardian, founder, or moderator roles separately when applicable.

For `SECURITY DEFINER` functions:

- set an explicit `search_path`;
- minimize `EXECUTE` grants;
- perform authorization inside the function;
- test unauthorized roles and cross-user inputs;
- do not accept a user identifier as authority merely because it appears in an argument.

High-blast-radius authenticated functions still require focused behavior suites before L4 activation.

## 6. Server-only tables

A table can intentionally have RLS enabled, zero policies, and no client grants when it is owned exclusively by server operations.

Current examples include:

- `app_config`;
- `app_private_config`;
- `guardian_verification_reviews`;
- `notification_deliveries`.

Do not add a client policy merely to silence an advisor. A new client use case must add a reviewed API or policy, tests, minimization, rollout, and rollback together.

## 7. Storage

Private buckets and object paths must use owner-scoped policies. Folder naming is not authorization unless policies enforce it.

Before release, test:

- owner upload/read/delete;
- cross-user denial;
- parent denial unless explicitly shared;
- sign-out and second-user isolation;
- account deletion cleanup;
- failed cleanup retry and idempotency.

## 8. Edge Functions

Deploy Edge Functions from `supabase/functions/` with explicit authentication settings.

Current boundary classes:

- platform-JWT user functions;
- dedicated server-to-server custom-auth functions;
- retired functions that return HTTP 410 behind platform JWT verification.

`release-health`, `bridge-e2e-probe`, and `github-workflow-status` are retired. They are not active product or release systems.

`account-delete` and `safety-scan` remain dedicated custom-auth functions and require focused negative-auth evidence.

## 9. Cloud synchronization

Local-first behavior must not silently create identity or merge data before account gates resolve.

For every synchronized data type, document:

- local owner;
- cloud table;
- stable identifier;
- conflict behavior;
- deletion behavior;
- second-device restore behavior;
- sign-out cleanup;
- retry/error visibility.

Do not claim lossless multi-device editing until conflict behavior is user-visible and tested.

## 10. Validation

Repository checks:

```bash
npm run type-check
npm test
npm run lint
npm run audit:control-room
npm run verify:prepush
```

Authorization changes also require focused live or rollback-contained probes. A regex scanner can detect missing declarations, but it cannot prove policy behavior.

## 11. Codespaces

See `docs/CODESPACES.md` for environment setup. Hydrate Git LFS before visual validation:

```bash
git lfs pull
```

Codespaces and local Supabase configuration are development tools. Production schema and function claims must be reconciled against the active project and committed evidence.
