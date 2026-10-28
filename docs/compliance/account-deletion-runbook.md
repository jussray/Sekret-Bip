# Account deletion compliance runbook

## Source of truth

This repository already implements the account deletion path. Do not create a second `process-deletions` function or a duplicate `20260724_compliance_foundation.sql` migration unless a reviewed schema change requires it.

Canonical components:

- `supabase/migrations/20260628190000_account_deletion_requests.sql`
- `supabase/functions/account-deletion-request/index.ts`
- `supabase/functions/account-request-cancel/index.ts`
- `supabase/functions/account-delete/index.ts`
- `scripts/sweep-account-deletions.mjs`
- `.github/workflows/account-deletion-sweep.yml`

## Required deployment configuration

The processor uses these names exactly:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCOUNT_DELETION_PROCESS_SECRET`

The Edge Function must be deployed as `account-delete` with JWT verification disabled because it authenticates with `x-account-deletion-secret`.

```bash
supabase db push
supabase functions deploy account-deletion-request
supabase functions deploy account-request-cancel
supabase functions deploy account-delete --no-verify-jwt
supabase secrets set ACCOUNT_DELETION_PROCESS_SECRET='<generated-secret>'
```

The scheduled GitHub workflow also requires repository or production-environment secrets with the same three names.

## 2026-10-24 production incident — schema profile mismatch

The scheduled job received `PGRST205` for `api.account_deletion_requests`, although
the canonical migration creates `public.account_deletion_requests`. The sweeper
now explicitly sends `Accept-Profile: public` when listing expired requests.
This fixes selection when the API exposes public but defaults to api; it does
**not** install a missing migration, change schema grants, or trigger a sweep.

Before re-enabling/dispatching the deletion workflow, have the production
database owner verify **read-only** that the exact intended project has the
canonical table, that `public` is included in Data API exposed schemas, and
that an administrative GET using `Accept-Profile: public` works. `PGRST205`
means the relation is absent from the selected schema cache; `PGRST106`
means the requested schema is not exposed. Both remain fail-closed.
Do not create an `api` duplicate or grant teen data access to anon to quiet the job.
If migration parity or API schema exposure is missing, treat it as a separate
reviewed production operation. Never execute a deletion sweep as a diagnostic.

## 2026-10-27 confirmation and non-destructive recovery proof

The scheduled sweep on 2026-10-27 received HTTP 406 from
`/rest/v1/account_deletion_requests` in the intended Supabase project,
even with `Accept-Profile: public`. The production database does contain
`public.account_deletion_requests`; the `api` schema has no relations
or functions. These observations support an exposed-schema mismatch, but
do not establish the current Data API dashboard configuration or authorize
a configuration change.

**Do not add `public` to the exposed Data API schema list without a
separately approved privacy/security review.** Recheck client grants,
row-level security, invoker views, privileged RPC execution permissions,
and `anon`/authenticated cross-user denial before and after any proposal.
Never create an `api` copy of the deletion queue as a shortcut. Restoring
the Data API is a founder-gated production configuration action, not an
implicit consequence of this script change.

A **manual** Account Deletion Sweep dispatch now defaults to
`check_only=true`. It performs an authenticated, read-only GET of the
expired pending queue, logs fixed event codes only, and does not call
`account-delete`. A scheduled run retains its existing processing path.
For a manual check, keep the checkbox enabled and require the successful
`SAUCE_GUARD_DELETE_QUEUE_READ_OK` event before considering any
controlled end-to-end deletion proof. A green read-only check is **not**
proof that account deletion works end-to-end. Manual processing with the
checkbox disabled must remain a separately approved destructive action.

## Verification gates

Do not mark the technical lane complete until all gates are evidenced:

1. The migration is recorded in the intended Supabase project.
2. `account-delete` is deployed from the reviewed commit.
3. A request before `scheduled_for` returns `grace_period_active`.
4. A missing or incorrect processor secret returns `unauthorized`.
5. An expired controlled request is claimed once and produces a deletion receipt.
6. The daily `Account Deletion Sweep` workflow is enabled and has a successful run.
7. Logs and receipts contain no raw service-role key, processor secret, or retained user identifier.

## Contractual lane

OpenAI, Cloudflare, and Supabase DPAs, plus any required BAA, are legal and account-level evidence. They cannot be proven by repository code. Store executed agreements in the controlled compliance evidence system, not in this public repository.

Vanta and SOC 2 work is a separate B2B readiness program, not a prerequisite for this deletion processor.

## Rollback

If the processor is unsafe or failing:

1. Disable `.github/workflows/account-deletion-sweep.yml` in GitHub Actions.
2. Rotate `ACCOUNT_DELETION_PROCESS_SECRET` in Supabase and GitHub.
3. Do not delete pending request rows.
4. Revert the faulty function deployment to the last verified commit.
5. Resume only after the contract test and controlled invocation pass.
