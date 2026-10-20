# Se'kret Bip — Architecture

> Living document. Update when boundaries change.

## Active application structure

Se'kret Bip uses Expo Router with separate teen and parent route groups.

```text
app/
├── _layout.tsx
├── (auth)/
├── (teen)/
│   ├── _layout.tsx
│   ├── room.tsx
│   ├── pages/
│   ├── circle/
│   ├── bridge.tsx
│   ├── sekret.tsx
│   ├── voicebip.tsx
│   └── ...
└── (parent)/
    ├── _layout.tsx
    ├── room.tsx
    ├── pages.tsx
    ├── circle/
    ├── bridge.tsx
    ├── sekret.tsx
    ├── voicebip.tsx
    └── ...
```

Route files should stay thin. Reusable logic belongs under `src/`.

## Source boundaries

```text
src/
├── components/        shared UI and safety components
├── context/           application context
├── features/          domain feature logic
├── hooks/             reusable hooks
├── parent/            parent-side exports and modules
├── services/          AI, auth, verification, safety, sync, audit
├── types/             canonical domain types
└── utils/             shared utilities

screens/               compatibility screen implementations still used by routes
worker/                Cloudflare Worker source
supabase/              migrations and Edge Functions
```

New business logic should not be added directly to route files or legacy compatibility wrappers.

## State model

- AsyncStorage provides local-first persistence.
- Supabase sync is best-effort and account-scoped.
- Local writes must remain usable when the network is unavailable.
- Private data must be cleared on sign-out where required by account policy.

## Backend boundaries

| Layer | Responsibility |
|---|---|
| Expo client | UI, local persistence, authenticated requests |
| Cloudflare Worker | AI/voice relay, auth-aware APIs, metadata-only telemetry |
| Supabase Auth | account identity and sessions |
| Supabase Postgres | durable data, RLS, RPCs, audit and relationship state |
| Supabase Storage | private user-owned media |
| Supabase Edge Functions | selected safety and server-side workflows |

The client must never contain service-role credentials or provider secret keys.

## Privacy model

- Teen and parent route separation is a UX boundary, not authorization.
- Authorization is enforced by verified identity, services, RLS, RPC permissions, and storage policies.
- Bridge contains only intentionally shared teen-parent content.
- Circle is separate from Bridge.
- Parent surfaces must not read teen journals, private companion chats, private voice notes, or private character memory.

## Companion intelligence

Current enforced maturity is L2: short-term history and approved context are passed into stateless turns.

L3/L4 features such as durable semantic memory, persistent goals, scheduled reflection, and inter-companion coordination are proposals only and must not be represented as demo-ready implementation until the required migrations, services, privacy controls, and tests exist. See `AGENT_L4_ARCHITECTURE.md`.

## Deployment boundaries

| Layer | Platform |
|---|---|
| Web | Cloudflare-first direction |
| Mobile | Expo / EAS |
| API and AI relay | Cloudflare Workers |
| Database and auth | Supabase |

Remaining Vercel compatibility code should be treated as transitional until intentionally removed.

## Current cleanup priorities

1. Finish the parent experience and Parent Bridge UI.
2. Retire stale route and screen compatibility layers carefully.
3. Keep Supabase migrations replayable from an empty database.
4. Validate RLS, storage, founder/admin, and parent-link boundaries.
5. Add durable character memory only after privacy boundaries are complete and tested.
