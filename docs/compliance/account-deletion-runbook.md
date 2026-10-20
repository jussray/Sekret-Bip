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
