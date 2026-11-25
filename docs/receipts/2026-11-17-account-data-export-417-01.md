# Receipt — Account data export ("Download my data") — Issue #417

## 5W1H

- **Who** — Teen and parent account holders (data subjects); founder as decision owner; implemented by Claude Code under the standing "You tell me?" delegation.
- **What** — A self-service "Download my data" control in Settings that lets a signed-in user export their own account data as JSON. Added because issue #417's scope was explicitly extended to this feature by a 2026-09-20 comment on that issue. Non-goal: this does not touch the already-committed `parent_links` revocation fix also tracked under #417 (separate commit, separate branch).
- **Where** — `jussray/Sekret-Bip`, branch `feat/account-data-export-417`, built from current `origin/main` (`0765c804`). New Supabase Edge Function (`supabase/functions/account-data-export`), new client service and UI component, two existing Settings screens edited.
- **When** — Pre-release, teen Room-production vertical slice in progress. No migration, no production deploy. Committed, not merged.
- **Why** — Users have no way to see or take a copy of the data this app holds about them, beyond request-based deletion. The linked comment on #417 named this as a required complement to deletion.
- **How** — Smallest reversible slice: a read-only Edge Function scoped to the caller's own JWT (RLS-enforced, no secret key), 6 tables, fail-closed on partial failure; a client service that validates the response shape before trusting it; a UI control placed under a new "Your data" section, before "Danger zone", in both teen and parent Settings.

## REALITY

- `supabase/functions/account-delete/index.ts` (deletion) already existed and uses the service/secret key, correctly, since it's an admin-triggered process.
- No export path existed anywhere in the codebase before this change.
- `Alert.alert` from `react-native` is used throughout this app's Settings screens for user feedback. On web, `react-native-web`'s `Alert` is a literal no-op (confirmed by reading `node_modules/react-native-web/dist/cjs/exports/Alert/index.js`: `static alert() {}`). This means every pre-existing `Alert.alert` call in this app currently gives web users **zero** feedback — no DOM text, no native browser dialog. This is a pre-existing, app-wide gap, not introduced by this change, and is called out here rather than silently worked around.

## GAP

A failed export, with no inline fallback, would have told web users nothing at all — not success, not failure, just silence. That is incompatible with this repo's "never signal success on failure" rule in spirit: a result must be truthfully represented, and showing nothing when something real happened (an export attempt failed) is not truthful representation either.

## FIX

- New Edge Function `supabase/functions/account-data-export/index.ts`: authenticates with the caller's own session JWT (`getSupabasePublishableKey()` + `Authorization` header), queries `app_profiles`, `account_verification`, `mood_history`, `journal_entries`, `room_memory`, `agent_memories`, all filtered by the JWT-derived `userId` — never a client-supplied id. A partial query failure fails the whole export closed (`export_partial_failure`), never returns a silently incomplete payload. Scope is explicit and deliberately excludes Bridge/crew/task tables (`circle_posts`, `bridge_share`, `bridge_summar*`, `crew_members`, `bip_tasks`) pending founder review of cross-account data.
- New `src/services/accountDataExport.ts`: client service, validates the function's response shape (`isAccountDataExport`) before trusting it.
- New `src/components/settings/DataExportControls.tsx`: UI control. Web downloads a JSON file directly (Blob + anchor, zero new dependencies); native currently falls back to clipboard-copy only, honestly labeled as not a real file save (no `expo-sharing` dependency added without founder review). **On failure, the message is rendered inline in the DOM** (not just passed to the no-op `Alert.alert`), so web users get real, visible feedback — this is the fix for the gap above, scoped to this one new component.
- `app/(teen)/settings.tsx` and `app/(parent)/settings.tsx`: added a "Your data" section rendering `DataExportControls`, placed before "Danger zone" in both, not inside it.

## PROOF

- `node --test test/account-data-export-contract.test.mjs` — 6/6 passing. Source-contract tests confirm: publishable key (not secret key) is used; every query filters by JWT-derived `userId`; the excluded-table scope list is enforced; partial failure fails closed; the client validates response shape; both Settings screens render the control outside the danger zone.
- `npx playwright test --config=playwright.founder-preview.config.ts account-data-export` — 3/3 passing, against the real running app (no mocks):
  1. "Download my data" is discoverable in teen Settings, before "Danger zone".
  2. A failed export (genuinely exercised — no Supabase configured in this test environment) shows the inline failure message `"Data export is unavailable right now."` and the success modal ("Your data export") never appears.
  3. Same discoverability check in parent Settings.
- `npm test` (full suite) — 2266 passed, 0 failed, 2 cancelled (pre-existing, environment-dependent, unrelated to this change), 1 pre-existing skip (live Supabase fixture test, requires credentials this environment doesn't have — unrelated to this change).
- `npx tsc --noEmit -p .` — clean.
- `npx eslint` on every new/changed file — clean.

## RISK

- Not verified against live Supabase — no deploy, no real auth session, no real data in any of the 6 tables. The contract tests prove the function's *source* does the right thing; they cannot prove the deployed function behaves identically.
- Native mobile currently has no real file-save path (clipboard-copy only). Adding `expo-sharing` or similar would need a dependency decision, left to the founder.
- Export scope deliberately excludes cross-account tables (Bridge/crew/tasks); if "my data" is expected to include those, that's a scope decision for the founder, not made here.
- `Alert.alert`'s no-op behavior on web is a pre-existing, app-wide issue (every other screen that calls it is equally silent on web). Only this new component was given an inline fallback; the rest of the app's `Alert.alert` call sites are unchanged and remain silently broken on web. That is flagged here as a candidate for a separate, dedicated issue — not fixed here, to keep this slice minimal and reversible.

## ROLLBACK

Revert the single commit on `feat/account-data-export-417`. No migration, no RLS change, no production state created. The new Edge Function is not deployed; removing the commit removes the feature entirely with no residue.

## NEXT GATE

Founder review needed before: (1) deploying the Edge Function, (2) any decision to widen export scope to Bridge/crew/task tables, (3) adding a native file-save dependency (`expo-sharing`), (4) deciding whether the app-wide `Alert.alert`-is-a-no-op-on-web gap gets its own tracked issue.

## CONTEXT

Branch: `feat/account-data-export-417`, built from `origin/main` at `0765c804` (not from the older `fix/room-hotspot-discoverability` branch, to keep one logical change per branch). Files touched: see FIX section above. No PR opened. Preserved work: the already-committed `parent_links` revocation fix (separate commit `0ff4eb5` on `claude/trust06-deletion-completeness-417`) and the Room hotspot discoverability fix (commit `b3146e7` on `fix/room-hotspot-discoverability`) are both untouched by this branch.
