# bip-beta-checklist

## 5W1H operating contract

Before planning, editing, or claiming completion, establish and state:

- **Who** — the requester, decision owner, affected users, data subjects, and execution authority.
- **What** — the requested outcome, concrete deliverable, non-goals, and existing work that must be preserved.
- **Where** — the exact repository, branch, environment, runtime, route, service, table, or provider boundary involved.
- **When** — the current lifecycle or release state, required ordering, timing constraint, and rollback window.
- **Why** — the user problem and verified evidence that justify the work.
- **How** — the smallest safe implementation, required permissions, verification evidence, rollout, and rollback.

Inspect repository and runtime truth for unknowns. Ask the user only when a missing answer would materially change the safe solution or authority. Re-run 5W1H after red-team/OODA findings change the plan. Finish by mapping the result, evidence, remaining blocker, and next owner back to these six questions.


## Trigger
Before each beta build submitted via `eas-build.yml`. This is the user-journey
verification pass — it confirms real flows work end-to-end, not just that code compiles.

## Critical User Journeys (must all pass)

### 1. Teen Signup & Onboarding
- [ ] New teen account can be created from scratch
- [ ] Onboarding flow completes without error (`app/(onboarding)/`)
- [ ] Character selection persists after onboarding
- [ ] User lands in the correct `(teen)` route group after onboarding
- [ ] Age-gating logic cannot be bypassed via deep link

### 2. Parent Account & Linking
- [ ] Parent account creation works
- [ ] Parent invite/link flow completes successfully
- [ ] Parent lands in `(parent)` route group — never sees teen-only routes
- [ ] Linked parent can see only consent-scoped content
- [ ] Unlinking removes parent access immediately — verify in the same session

### 3. AI Companion (Sekret)
- [ ] Sekret chat opens and receives a reply within acceptable latency
- [ ] Character voice matches expected persona (spot-check one response)
- [ ] No clinical language or banned phrases appear in the response
- [ ] Crisis keyword triggers the correct escalation response
- [ ] AI reply streams — does not show blank screen while waiting

### 4. Journal & Sharing
- [ ] Teen can create a journal entry
- [ ] Entry saves correctly (verify in Supabase if possible)
- [ ] Sharing a journal entry with parent requires explicit consent step
- [ ] Unshared entries are not visible to parent — verify across both accounts

### 5. Bridge Summary
- [ ] Bridge Summary generates for a linked parent
- [ ] Summary contains only consent-scoped content
- [ ] Summary does not expose `author_user_id` or raw PII
- [ ] Parent receives push notification for new summary (if enabled)

### 6. Revoke & Privacy Reset
- [ ] Teen can revoke parent access
- [ ] After revoke: parent account cannot access teen content
- [ ] Revoke takes effect without requiring app restart
- [ ] Revoke confirmation UI is clear and requires intentional action

### 7. Push Notifications
- [ ] Notification permissions prompt appears at correct time
- [ ] A test notification can be triggered and received
- [ ] Tapping notification deep-links to the correct screen
- [ ] Notification does not reveal sensitive content in the preview

### 8. Auth Edge Cases
- [ ] Expired session redirects to `(auth)` cleanly — no crash
- [ ] Re-authentication flow works without data loss
- [ ] Deep link to authenticated screen while logged out redirects to login, then back

## Build Readiness
- [ ] `app.config.ts` version is bumped for this build
- [ ] `eas.json` profile is correct for this target (preview vs production)
- [ ] No `(dev)` routes accessible in the preview/production build
- [ ] All required env vars are set in EAS secrets for this environment

## Output
Return: BETA READY | NOT READY
- NOT READY: list each failing journey with the specific step that broke
- A single broken critical journey = NOT READY, no exceptions
- Document any known issues as tracked GitHub issues before submitting the build
