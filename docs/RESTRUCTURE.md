# Project Restructure — Current State

## Status

Expo Router file-based navigation is active. The repository now separates teen and parent routes under `app/(teen)/` and `app/(parent)/`.

| Area | Status |
|---|---|
| Expo Router | Done |
| Teen route group | Done |
| Parent route group | Done |
| Shared route helpers | Active |
| Legacy screen wrappers | Still in use |
| Remaining cleanup | In progress |

## What is complete

- The former global string-router model is no longer the primary navigation system.
- Teen and parent route groups are implemented.
- Route entry points live under `app/`.
- Shared navigation helpers exist under `src/`.
- Parent and teen surfaces have separate route boundaries.

## What remains

1. Retire stale compatibility wrappers only after usage checks.
2. Move reusable screen logic from `screens/` into `src/features/` and `src/services/`.
3. Remove docs that still describe `app/index.tsx` as the active monolithic router.
4. Keep authorization in services, Supabase RLS, and storage policies; route separation alone is not security.
5. Verify deep links, native back behavior, browser history, and route guards for new routes.

## Rules for new work

- Add route entry points under the correct route group.
- Keep reusable business logic outside route files.
- Do not reintroduce a global `screen: string` switch.
- Use shared route constants and helpers where available.
- Treat `screens/` as compatibility territory, not the preferred home for new domain logic.

## Parent-side note

The parent route group exists, but the parent experience is not complete. Parent Bridge presentation, onboarding, relationship lifecycle states, Parent Circle privacy, Parent Coach boundaries, and notifications remain tracked in issue #212.
