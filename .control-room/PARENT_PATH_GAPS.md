# Parent Path — Wire-Up Status

## Screens & Advance Calls

| Screen | Route | Advance call | Status |
|---|---|---|---|
| `parent-splash.tsx` | `/(onboarding)/parent-splash` | None needed — splash gate, no auth | ✅ done |
| `parent-welcome.tsx` | `/(onboarding)/parent-welcome` | None needed — marketing splash, no auth | ✅ done |
| `consent.tsx` (parent side) | `/(onboarding)/consent?side=parent` | `await advance('consent_complete')` | ✅ done |
| `parent-link.tsx` | `/(onboarding)/parent-link` | `advanceStage('parent_linked')` or `advanceStage('parent_link_skipped')` | ✅ done |
| `parent-setup.tsx` | `/(onboarding)/parent-setup` | `advanceStage('parent_setup_complete')` + `markActivated('onboarding_complete')` | ✅ done |

## What's Missing

### 1. `initOnboardingState()` — call on sign-up

The row in `user_onboarding_state` is never created unless `initOnboardingState()` is
called immediately after `supabase.auth.signUp()`. Without it every `advanceStage` call
will fail silently (no row to upsert into).

**Where to add it:** `app/(auth)/signup.tsx` — after the `signUp` call resolves and
`data.user` is confirmed.

```ts
// app/(auth)/signup.tsx
import { initOnboardingState } from '@/services/onboarding';

// ... inside handleSignUp, after supabase.auth.signUp succeeds:
if (data.user) {
  // fire-and-forget — never block the user entering their space
  initOnboardingState(data.user.id, side).catch(() => null);
}
```

### 2. `role_selected` stage — not yet fired

The `role_selected` stage in the enum exists for the moment the user explicitly picks
`teen` vs `parent` (the "I'm a parent →" button in `age.tsx`). Currently `age.tsx` fires
`age_verified` but does not fire `role_selected` for the parent branch because the parent
branch just calls `router.push('/(onboarding)/parent-splash')` without going through
`advance()`.

**Fix:** add a fire-and-forget advance in `age.tsx`'s `handleParent()` function:

```ts
// age.tsx — handleParent()
async function handleParent() {
  await AsyncStorage.setItem(ONBOARDING_SIDE_KEY, 'parent');
  setUserSide('parent');
  // Fire-and-forget — record role selection before splash redirect
  getSupabase()?.auth.getUser().then(({ data }) => {
    if (data.user) advanceStage(data.user.id, 'role_selected', { role: 'parent' }).catch(() => null);
  });
  router.push('/(onboarding)/parent-splash');
}
```

Note: this is fire-and-forget (not `await`) because the user has no account yet at this
point — they hit `handleParent` BEFORE signing up. The `getUser()` call will resolve
null and the catch swallows it cleanly. The `role_selected` signal will be captured
properly once the parent signs up and `initOnboardingState` runs.

### 3. `parent_link_sent` stage — not yet fired

The teen side has no screen that fires `parent_link_sent`. This stage represents the
moment a teen generates and shares their invite code. It should fire in the teen's
account-verification or invite-code screen when they copy/share the code.

**Where:** `app/(teen)/settings/invite.tsx` or wherever `generateInviteCode()` is called.

```ts
getSupabase()?.auth.getUser().then(({ data }) => {
  if (data.user) advanceStage(data.user.id, 'parent_link_sent').catch(() => null);
});
```

### 4. `steady_state` transition — not yet automated

Currently users reach `activated` and stay there. `steady_state` should be set after the
user has completed onboarding AND returned on a second session (D1 retention signal).

**Simplest approach:** add a `pg_cron` job on Se'kret Bip that runs nightly:

```sql
-- Run nightly via pg_cron
update public.user_onboarding_state
set stage = 'steady_state', completed_at = now()
where
  stage = 'activated'
  and activated_at < now() - interval '24 hours';
```

### 5. Control room ETL — mirror sync

The `user_onboarding_state` table in `founder-control-room` is currently a standalone
mirror with no data in it. You need either:

- **Option A (recommended):** A `pg_cron` job on Se'kret Bip that `INSERT ... ON CONFLICT`
  upserts rows into the control room via `postgres_fdw` or a Supabase Edge Function.
- **Option B:** A nightly Edge Function (`sync-onboarding-mirror`) that reads from Se'kret
  Bip and writes to founder-control-room using the service role key of each project.
- **Option C:** Run the funnel queries directly on Se'kret Bip (service role) — skip the
  mirror entirely until you have >1k users.

**For now, Option C is fine.** The mirror schema is ready when you need it.

## Summary Checklist

- [ ] Add `initOnboardingState(user.id, side)` to `app/(auth)/signup.tsx`
- [ ] Add `role_selected` fire-and-forget to `age.tsx`'s `handleParent()`
- [ ] Add `parent_link_sent` to teen invite-code screen
- [ ] Add `steady_state` pg_cron job
- [ ] Decide on control room ETL strategy (A / B / C)
