# Contract: Web Gateway Family & Parent Linking Interface
**Branch:** feat/web-gateway-family-onboarding
**Canonical Tables:** public.parent_links, public.profiles / public.app_profiles, public.analytics_events

---

## 1. Parent Link Model Alignment
- Reuses canonical `public.parent_links` table established in migration `20261108014000_require_teen_parent_link_confirmation.sql`.
- Invite code format: 8-character ambiguity-reduced alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- Mutual consent model:
  1. Parent or teen initiates link request.
  2. Recipient confirms via invite code.
  3. Status transitions from `pending` -> `active`.
- Minor privacy boundary: Parents view verification and link status (`pending`, `active`), never teen emotional posts, comfort tool history, or raw journal entries.

---

## 2. Onboarding Funnel Telemetry
- Table: `public.analytics_events`
- Events:
  - `signup_attempted`: Emitted when visitor submits /login signup form (side: 'teen' | 'parent', age_band).
  - `teen_age_selected`: Emitted when visitor selects age band on /welcome ('under-13' | '13-15' | '16-17' | '18+').
- Attributes: `user_id` (nullable), `event_name`, `payload` (jsonb), `created_at`.

---

## 3. Web Entry Route Contracts
- `/index`: Segmented control (Teen vs Bip Jr. + Family) + Embedded AI helper box.
- `/find-family`: Dedicated conversational family discovery page powered by Lovable AI Gateway (`openai/gpt-6-astra`).
- `/welcome`: Teen age assurance & onboarding setup.
- `/parent-welcome`: Parent value pillars and circle creation setup.
- `/home`: Authenticated parent dashboard displaying active parent-teen links and invite code generator.
