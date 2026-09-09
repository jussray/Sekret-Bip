# Se'kret Bip — Onboarding System

> **ULTRATHINK OODA Reference**
> Single source of truth for the onboarding state machine, activation milestones, funnel KPIs, and migration runbook.

---

## User-facing entry shape

The onboarding entry should feel like **one page** to the user: welcome copy, age bucket, protection path, and account-side routing live together on `app/(onboarding)/welcome.tsx`.

The one-page entry is a UX shell, not a single unchecked backend event. It still records separate safety checkpoints:

- `age_bucket`
- `age_verification_status`
- `age_verification_method`
- `guardian_required`
- `raw_evidence_stored = false`
- `ONBOARDING_SIDE_KEY`

`app/(onboarding)/age.tsx` remains available as a fallback or deep-link surface, but the default entry CTA should not route users through a separate age-only page.

No raw ID image, selfie, video, face scan, full birth date, or third-party age proof is stored by the in-app one-page entry. Stronger verification can be introduced later only behind a separate legal, privacy, storage, deletion, and vendor review.

---

## Activation Milestones (North Star)

Onboarding is **complete** when a user reaches `activated` stage.
Activation definition differs by role:

| Role | Activation Action | `activation_action` value | How fired |
|---|---|---|---|
| **Teen** | First mood log saved | `first_mood_log` | DB trigger + app-side |
| **Teen** | First journal entry | `first_journal_entry` | app-side only |
| **Teen** | First anonymous post | `first_post` | app-side only |
| **Parent** | First bridge message sent | `first_bridge_message` | app-side only |
| **Parent** | First teen check-in viewed | `first_checkin_viewed` | app-side only |

App-side call (belt-and-suspenders, always idempotent):
```ts
import { markActivated } from '@/services/onboarding';
import { getSupabase } from '@/utils/supabase';

// After confirming the first action was saved to DB:
getSupabase()?.auth.getUser().then(({ data }) => {
  if (data.user) markActivated(data.user.id, 'first_mood_log').catch(() => null);
});
```

---

## State Machine

```
pre_signup
    │  (user creates account — signup.tsx)
    ▼
signed_up          → welcome.tsx
    │  (accepts terms + privacy)
    ▼
consent_complete   → age.tsx
    │  (confirms age bucket)
    ▼
age_verified       → identity.tsx
    │  (selects role: teen | parent)
    ▼
role_selected
    │
    ├─[teen]──────────────────────────────────────────────────────┐
    │                                                              │
    ▼                                                              │
name.tsx                                                           │
    │  (sets display name)                                         │
    ▼                                                              │
name_set → reflection.tsx                                          │
    │  (completes emotional reflection)                            │
    ▼                                                              │
reflection_complete → parent-link.tsx (optional)                  │
    │  (teen dispatches invite code to parent)                     │
    ▼                                                              │
parent_link_sent → (teen) app tabs                                │
    │                   │                                          │
    │          first core action                                   │
    │          (mood log / journal / post)                         │
    │                   │                                          │
    │          markActivated()                                     │
    │          DB trigger (mood_logs)                              │
    │                   │                                          │
    │                   ▼                                          │
    │               activated                                      │
    │                   │                                          │
    │                   ▼                                          │
    │              steady_state                                    │
    │                                                              │
    └─[parent]─────────────────────────────────────────────────────┘
         │
         ▼
    parent-welcome.tsx → parent-link.tsx
         │  (links teen OR skips)
         ├──► parent_linked (linked now)
         └──► parent_link_skipped (link later)
         │
         ▼
    parent-setup.tsx
         │  (completes parent profile)
         ▼
    parent_setup_complete → (parent) app tabs
         │
         first core action
         (bridge message / check-in)
         │
         markActivated()
         │
         ▼
     activated → steady_state
```

---

## Files

| File | Purpose |
|---|---|
| `app/(onboarding)/_layout.tsx` | Expo Router layout wrapper for the flow |
| `app/(onboarding)/welcome.tsx` | One-page entry shell: welcome, age bucket, protection path, and account-side routing |
| `src/features/onboarding/ageAssurance.ts` | Privacy-minimal age assurance decision model |
| `app/(onboarding)/consent.tsx` | Terms & privacy consent |
| `app/(onboarding)/age.tsx` | Age verification / bucket selection fallback and deep-link surface |
| `app/(onboarding)/identity.tsx` | Role selection (teen / parent) |
| `app/(onboarding)/name.tsx` | Display name — teen path |
| `app/(onboarding)/reflection.tsx` | Emotional reflection — teen path |
| `app/(onboarding)/parent-link.tsx` | Parent invite code — shared entry point |
| `app/(onboarding)/parent-splash.tsx` | Parent entry splash |
| `app/(onboarding)/parent-welcome.tsx` | Parent welcome |
| `app/(onboarding)/parent-setup.tsx` | Parent profile setup |
| `app/(onboarding)/teen-splash.tsx` | Teen entry splash |
| `services/onboarding.ts` | State machine — DB reads/writes, `getSupabase()` |
| `context/OnboardingContext.tsx` | React context — optional, wraps service for context-aware screens |
| `supabase/migrations/20260718000000_onboarding_state.sql` | DB schema — table, enum, RLS, indexes |
| `supabase/migrations/20260718000001_onboarding_mood_log_trigger.sql` | DB trigger — auto-activates on first mood log |

---

## OODA Loop Mapping

| OODA Phase | What Happens | Where |
|---|---|---|
| **Observe** | Funnel timing columns (`signup_to_consent_secs`, etc.) capture drop-off per stage | `user_onboarding_state` table |
| **Orient** | `role`, `age_bucket`, `referral_source`, `device_platform` segment users for adaptive flows | `user_onboarding_state` table |
| **Decide** | `nextScreenForStage()` computes correct route given role + stage | `services/onboarding.ts` |
| **Act** | `advanceStage()` writes state forward-only; `OnboardingGuard` redirects mid-flow users | `services/onboarding.ts` + `context/OnboardingContext.tsx` |

---

## Funnel KPIs (Control Room)

```sql
-- Activation rate
SELECT
  COUNT(*) FILTER (WHERE stage = 'activated') * 100.0 / COUNT(*) AS activation_rate_pct
FROM user_onboarding_state;

-- Stage drop-off funnel
SELECT stage, COUNT(*) AS users_at_stage
FROM user_onboarding_state
GROUP BY stage
ORDER BY MIN(created_at);

-- Avg time-to-activation by role
SELECT role, AVG(identity_to_activated_secs) AS avg_secs_to_activate
FROM user_onboarding_state
WHERE activated_at IS NOT NULL
GROUP BY role;

-- Activation action breakdown
SELECT activation_action, COUNT(*) AS count
FROM user_onboarding_state
WHERE activated_at IS NOT NULL
GROUP BY activation_action
ORDER BY count DESC;

-- Parent link skip-to-link conversion
SELECT
  COUNT(*) FILTER (WHERE stage = 'parent_link_skipped') AS skipped,
  COUNT(*) FILTER (WHERE stage = 'parent_linked') AS linked,
  COUNT(*) FILTER (WHERE stage = 'parent_linked') * 100.0
    / NULLIF(COUNT(*) FILTER (WHERE stage IN ('parent_linked','parent_link_skipped')), 0)
    AS link_conversion_pct
FROM user_onboarding_state
WHERE role = 'parent';

-- Platform split
SELECT device_platform, COUNT(*) AS users
FROM user_onboarding_state
GROUP BY device_platform;

-- Drop at each funnel stage (as % of signed_up cohort)
WITH cohort AS (
  SELECT COUNT(*) AS total FROM user_onboarding_state
)
SELECT
  s.stage,
  COUNT(*) AS users,
  ROUND(COUNT(*) * 100.0 / c.total, 1) AS pct_of_signups
FROM user_onboarding_state s, cohort c
GROUP BY s.stage, c.total
ORDER BY MIN(s.created_at);
```

---

## Migration Runbook

### Local development
```bash
# 1. Start local Supabase stack
supabase start

# 2. Verify migration files exist
ls supabase/migrations/
# 20260718000000_onboarding_state.sql
# 20260718000001_onboarding_mood_log_trigger.sql

# 3. Apply locally (resets DB and reruns all migrations)
supabase db reset

# 4. Verify the table exists
supabase db diff   # should show no diff after reset
```

### Staging / Production
```bash
# Link to your remote project (one-time)
supabase link --project-ref <your-project-ref>

# Push migrations to remote
supabase db push

# Verify
supabase db diff --linked
# Should output: No schema changes found
```

### Rollback
There is no down migration for enum types in Postgres.
If you need to roll back:
1. Drop dependent objects manually in the Supabase SQL editor.
2. `DROP TYPE onboarding_stage CASCADE;`
3. `DROP TYPE user_role CASCADE;`
4. `DROP TABLE IF EXISTS user_onboarding_state;`
5. Remove the migration files and rerun `supabase db push`.

### If `supabase db push` fails with "type already exists"
The enums were created manually in the dashboard.
Run this in the Supabase SQL editor first:
```sql
DROP TYPE IF EXISTS onboarding_stage CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TABLE IF EXISTS user_onboarding_state;
```
Then re-run `supabase db push`.

### Mood log trigger table name
The trigger in `20260718000001` targets `public.mood_logs`.
If your mood log table has a different name, update the trigger:
```sql
-- In Supabase SQL editor or a new migration:
DROP TRIGGER IF EXISTS trg_first_mood_log_activation ON public.mood_logs;
CREATE TRIGGER trg_first_mood_log_activation
  AFTER INSERT ON public.<your_actual_table_name>
  FOR EACH ROW EXECUTE FUNCTION handle_first_mood_log();
```

---

## Adding a New Onboarding Step

1. Add the stage value to `onboarding_stage` enum in `20260718000000_onboarding_state.sql`.
2. Add it to `STAGE_ORDER` in `services/onboarding.ts` at the correct position.
