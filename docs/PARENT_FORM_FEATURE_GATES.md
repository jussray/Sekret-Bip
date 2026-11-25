# Parent form rollout — release contract

**Source of truth:** `jussray/Sekret-Bip` owns the Supabase schema. The independent Parents repository must not create its own migrations.

## What this controls

The migration `supabase/migrations/20261125204809_parent_form_feature_gates.sql` introduces two **default-disabled** rollout booleans:

- `parent_registration`: whether the independent Parents native preview attempts new signups.
- `parent_private_forms`: reserved for separately reviewed guardian-only forms. No private-form access is implemented by this flag alone.

Rollout flags are **not authorization**. They do not replace permanent-account checks, confirmed guardian status, active parent–teen links, teen-selected item-level consent, or RLS. Disabling a preview signup button cannot prevent an untrusted caller from using the Supabase Auth API directly.

## Phase 1: migration preflight

Before applying anything, reconcile this repository's migration history with the **intended** Supabase project. Do not assume current repository migrations are all present in production. Run the checked-in tests and validate project identity, applicable RLS policies, account journeys, and rollback evidence. Apply the reviewed migration through the canonical Supabase production change workflow only after explicit authorization.

The exact project currently configured in the Se'kret Bip deployment verifier is `tbsevonvegdnlyjgplmm`; re-check provider identity before any apply.

## Phase 2: read / enable / rollback

From the Supabase SQL Editor, with privileged administrator authority **for the intended project only**:

Read current rollout state:

```sql
select name, enabled, updated_at
from public.parent_form_feature_gates
order by name;
```

Only **after** the migration is applied and the controlled parent signup flow is verified:

```sql
update public.parent_form_feature_gates
set enabled = true, updated_at = now()
where name = 'parent_registration'
returning name, enabled, updated_at;
```

Rollback (does not delete any data):

```sql
update public.parent_form_feature_gates
set enabled = false, updated_at = now()
where name = 'parent_registration'
returning name, enabled, updated_at;
```

Keep `parent_private_forms` **disabled** until those workflows have real backend authorizations, negative cross-user tests, and approved release evidence. Neither gate authorizes access to teen information.

## Phase 3: production release and proof

The normal web production owner is Cloudflare Pages project `sekret-bip` via Git integration on reviewed `main`. A separately authorized Pages deploy-hook fallback is:

```bash
gh workflow run cloudflare-pages-deploy-hook.yml --repo jussray/Sekret-Bip --ref main
```

This is only a **trigger**, not a deployed proof. Verify the exact current-main SHA against the production `/.well-known/sekret-release.json` marker, backend health, Supabase schema and auth, and controlled Playwright/device journeys as described in `DEPLOYMENT.md`.

Do not deploy, merge, publish, or enable production rollouts simply because tests or a deploy hook succeeded.
