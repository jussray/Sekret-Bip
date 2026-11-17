# Account integration audit

This audit tracks the privacy/account goals for the Se'kret Bip account flow.
Status words:

- **Covered** — code/schema has the required guardrail now.
- **Partial** — base ownership exists, but the feature still needs deeper product work.
- **Gap** — not implemented yet.

## Audit results

| Area | Status | Notes |
|---|---:|---|
| Journal ownership | Covered | `journal_entries.user_id` references `auth.users(id)` and has owner-only RLS. App cloud restore waits for age gate + account readiness before pull/sync. |
| Voice Bip ownership | Partial | `voice_notes.user_id` is owner-scoped. Metadata sync exists; raw recordings/transcripts still need user-scoped Storage buckets and transcript tables. |
| Circle identity | Partial | New posts use `public_circle` identity (`anonymous_handle`). Friends-only/private Circle visibility still needs a visibility field and trusted-audience enforcement. |
| Bip Crew discovery | Partial | UI now invites by Bip ID/QR instead of real-name search, and pending invites show Bip ID. Accepted friendship, blocking, and permission tables still need backend workflows. |
| Parent Window | Gap | Parent/teen linking and explicit teen share permissions still need tables, RLS, and UI enforcement. |
| Rewards & streaks | Partial | Streak state persists locally; `bip_points` exists, but full rewards/streak cloud restore still needs a dedicated owned streak/rewards model. |
| Room profile | Covered | Account profile is loaded before entry; Room can greet by private first name, and preferences continue to hydrate before cloud restore. |
| AI Memory | Partial | Journal/voice/oracle memory is local/account-scoped through app state and owned tables where synced, but companion-specific cloud memory tables are not fully modeled yet. |
| Storage uploads | Gap | Image, voice, and upload Storage buckets/folder policies are not defined yet. Required pattern: `${auth.uid()}/...` with Storage RLS. |
| Notifications | Gap | No authenticated notification-token preference model is present yet. |
| Delete account | Gap | No delete/anonymize workflow or retention policy executor is implemented yet. |
| Logout/Login isolation | Partial | Account gate blocks app entry and cloud restore waits for account readiness. A real sign-out action must also clear AsyncStorage slices before another user enters on the same device. |

## Device sync test scenario

Added `scripts/test-device-sync.mjs` as a contract test for the account/sync guardrails that make the Phone A → Phone B → sign-out → second-user scenario safe:

1. App flow remains `AgeGate → AccountGate → app gates`.
2. Cloud restore waits for both age-gate resolution and account/profile readiness.
3. Private account schema keeps real identity owner-only and stores public `anonymous_handle`/`bip_id` separately.
4. Core owned tables are tied to `auth.uid()` via `user_id` and RLS.
5. Circle and Bip Crew identity surfaces use anonymous/public identity until trusted acceptance.

## Remaining implementation checklist

- Add real sign-out that calls Supabase sign out and clears all local AsyncStorage state before returning to Splash/AgeGate.
- Add Storage buckets and RLS policies for user-specific folders (`${auth.uid()}/images`, `${auth.uid()}/voice`, `${auth.uid()}/uploads`).
- Add visibility fields to Circle posts (`public_circle`, `trusted_friend`, `guardian`) and enforce audience-specific identity display.
- Add parent/teen link tables with teen-approved shared-content permissions.
- Add friend request, acceptance, blocking, and permission tables for Bip Crew.
- Add delete-account/anonymize workflow and retention policy docs.
- Add authenticated notification preferences and device-token scoping.

## Connection permission audit update

This pass tightens Se'kret Bip's relationship boundaries:

- Global discovery must never search by real name or email. Bip Crew uses only `bip_id` or QR invite exchange.
- Pending, blocked, or removed crew entries show only `bip_id`/invite state; first names are available only when `connection_status = accepted`.
- Circle posts carry an explicit `visibility` and `identity_context`; public/community posts use `anonymous_handle` + `avatar_key`.
- Friends-only Circle is a trusted-audience context. First names may be resolved only after accepted crew membership; otherwise the fallback identity remains anonymous.
- Parent/guardian visibility is a separate permission context and must not be inferred from Bip Crew acceptance.
- Logout/sign-out clears local private account data caches before another account can use the device.

## True sign-out and same-device account switching

Sign-out now runs through `signOutAndClearLocalState()`, which signs out of Supabase auth and clears account-scoped AsyncStorage data before another user can enter the app on the same device. The in-memory app state is also reset to empty defaults and routed back to splash/account gating, so User B cannot see User A's journals, voice notes, Circle cache, crew, rewards/streaks, room memory, AI companion memory, or linked parent/teen data.

Safe app-level presentation settings such as theme may remain. Account-scoped notification preferences are included in the private clear list.

## Parent ↔ Teen linking permission model

Parent Window is separate from Bip Crew. Guardians cannot search for teens by real name or email. A teen generates a `BIP-FAM-*` invite/QR code, a guardian submits that code, and the link remains `pending` until the teen approves it. Link statuses are `pending`, `approved`, `blocked`, and `removed`.

Approved guardians can only read rows in `teen_guardian_shares` that the teen explicitly created for that approved link and share kind. Supported share kinds are mood summaries, selected journal-entry summaries, selected Voice Bip summaries, safety alerts, and streak/reward summaries. Private journals and raw voice notes are never readable by default. Blocking or removing a guardian clears permissions and RLS removes access immediately.
