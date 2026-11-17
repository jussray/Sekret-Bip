# Critical Fix Audit — 2026-07-03

Shipping-readiness pass across teen, parent, and dev/founder surfaces. Verified
via a live Expo web session (browser walkthrough with Playwright), not just
static review — every fix below was reproduced before the change and
confirmed resolved after it.

## Fixes applied on current branch

1. **`validateEnv()` blocked the whole app in dev mode.** `src/utils/env.ts`
   logged `console.error` for a missing `EXPO_PUBLIC_BACKEND_URL`. In Expo
   web dev, `console.error` trips LogBox into a full-screen overlay that
   blocks all interaction underneath it — the primary documented setup path
   (Codespaces / local dev, no Worker deployed yet) left the app completely
   unusable. It also contradicted the real fallback already implemented in
   `fetchSekretReply()` (pre-written companion replies). Downgraded to
   `console.warn` with corrected messaging.

2. **Voice Bip threw a console error on every load.**
   `screens/VoiceBipScreen.tsx`'s `{sekretReply && !isThinking && (...)}`
   short-circuited to the empty string `''` (not `false`) in `sekretReply`'s
   initial state, and React Native Web renders `''` as a stray text-node
   child of a `View`. Wrapped in `Boolean(...)`.

3. **Parent Circle was unreachable.** `app/_layout.tsx`'s global
   `RouteBoundary` reclassifies any `circle`/`crew`/`discover` segment as
   `(social)` and gates it behind `canUnlockSocial(verificationState)` —
   which only returns true for `'VERIFIED_TEEN'`. Since teen and parent
   routes share the same leaf segment name (`(teen)/circle` and
   `(parent)/circle` are both just `circle`), Parent Circle was gated behind
   the teen's own verification state: it would mount, then immediately get
   redirected back to Room. Scoped the `(social)` reclassification to
   `first === '(teen)'` only. Confirmed this doesn't regress teen Circle's
   own gating (an unverified teen still correctly lands on Limited Mode).

4. **Parent Voice Bip pointed at the wrong screen.** Parent More's
   "Parent Voice Bip" item resolved to `(parent)/voicebip.tsx`, a thin
   wrapper reusing the teen `VoiceBipScreen` verbatim (same companion-avatar
   picker, same teen-framed copy). A separate, fully-implemented,
   genuinely parent-appropriate screen already existed and was unlinked:
   `(parent)/voicereflect.tsx` renders `ParentVoiceReflectionScreen`, a
   private text reflection tool with 5 rotating prompt lenses (Observe,
   Self, My Teen, Next Time, Patterns) and 40 real prompts. Per product
   decision, repointed the menu item at `voicereflect`. The old
   `(parent)/voicebip.tsx` route was left in place, just unlinked from More.

5. **"Help & Safety" (teen) / "Resources" (parent) were dead ends.** Both
   More-menu items pointed at route key `'resources'`, but neither side had
   a real destination: the teen key wasn't in `routeForSide`'s teen map at
   all (fell through to Room), and the parent key explicitly mapped back to
   `PARENT_ROUTES.more` (a self-loop). `screens/ResourcesScreen.tsx` already
   existed as a complete, side-aware component with real content — including
   teen crisis-adjacent guidance ("When it's more than a bad day" → talk to
   Se'kret) that `docs/UX_AUDIT.md`'s historical findings had flagged as a
   missing safety surface — but no route file imported it. Added
   `app/(teen)/resources.tsx` and `app/(parent)/resources.tsx` as route
   wrappers, registered both as hidden tabs, and wired `routeForSide` to
   point at them.

## Verified live (browser walkthrough)

All five core teen home surfaces (Room, Voice Bip, Pages/Journal, Circle,
Companion chat) and the parent-side equivalents (Room, Pages, Calm/Bridge,
Circle, Voice Reflection, Settings, Profile, Parent Link) render live
content with no console errors, using the founder test-family bypass
(`EXPO_PUBLIC_ENABLE_FOUNDER_TOOLS=true`, dev-only) in place of a real
Supabase-backed teen-parent link.

The Founder/Dev Control Room (`app/(dev)`) was reviewed for structural
completeness and confirmed to fail safe: `isFounderProfile()` denies access
by default (no Supabase session → `null` → locked screen), so it is not
reachable without a real founder-role Supabase profile despite the global
route guard explicitly allowing `(dev)` through. `canAccessFounderDev()` in
`src/services/routeAccess.ts` is dead code (never called) — the real gate is
`getCurrentFounderProfile()`/`isFounderProfile()` in
`src/services/founderAudit.ts`. Not a security issue, just a duplicate/stale
implementation worth cleaning up in a future pass.

## Known issue, not fixed this pass

**Cold deep-links into non-default tabs occasionally bounce to Room.**
Reproduced on both `(teen)` and `(parent)` layouts: a hard page load or
first client-side navigation targeting a non-default tab (e.g. `/voicebip`,
`/more`, `/circle`) sometimes lands on Room instead, self-heals on
subsequent navigation within the same session. In-app navigation (how
virtually all real usage happens — tapping tabs, buttons, menu items after
the app is already open) was not observed to be affected in this session's
testing. Root cause is likely structural: `(teen)/_layout.tsx` and
`(parent)/_layout.tsx` gate mounting the `<Tabs>` navigator behind async
`profileChecked`/`isLoading` checks, so a fresh deep link's target route may
already be "consumed" by Expo Router's linking resolution before the
navigator exists to receive it. This is exactly the class of issue
`docs/UX_AUDIT.md`'s current findings flag ("Parent and teen routes need
complete back, deep-link, and guard behavior") and issue #212 tracks. Fixing
it safely means restructuring the loading-gate pattern across both layouts
and testing on a native build (not just web), which is more than a
minimal, targeted wiring change — flagging for a dedicated pass rather than
guessing at a fix under time pressure.

## Verification run

`npm run type-check`, `npm run lint`, `npm test` (282/282), `npm run
test:device-sync`, `npm run audit:runtime-assets`, `npm run
audit:control-room`, `npm run validate:companions`, `npm run
verify:room-archives`, and `npm run verify:bundle` all pass on this branch
after merging the latest `main`.
