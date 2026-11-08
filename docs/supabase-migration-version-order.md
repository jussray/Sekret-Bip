# Supabase migration version-ordering protection

Status: AUTHORED on a review branch; NOT a hosted Supabase integration fix and NOT production migration verification.

## Observed problem

On November 8, 2026, Supabase's GitHub integration reported:
"Remote migration versions not found in local migrations directory."

The repository contains the historical 8-digit migration
`20260626_parent_teen_snapshot_view.sql` and later 14-digit migrations
beginning `20260626`. Sorting complete filenames puts the longer names
before the shorter name, even though sorting extracted migration versions
puts the shorter version first. See supabase/cli issue #6036 and PR #6038.

Do **not** delete or rename historical files, change Supabase migration
history to make a check pass, or treat a local audit as a successful hosted
Supabase Preview.

## GitHub checks

`.github/workflows/supabase-migration-version-integrity.yml` runs
the extracted-version regression and validates all local filenames on every
pull request to main and every push to main. This does not use credentials
or read production, and explicitly reports LOCAL_ONLY_REMOTE_UNVERIFIED.

The separately maintained `Supabase PR Preview` workflow still replays
real migrations on an empty local database. Its success is required
independently of the filename contract.

## Live read-only verification

The existing, manually dispatched production migration workflow now reads
only `supabase_migrations.schema_migrations` from the pinned database,
compares exact versions against the checked-out files, and writes a scoped
summary to `artifacts/supabase-migration-version-live-audit.json`.
No remote schema, policies, user rows, or migration history are mutated
by this audit. Missing live versions fail closed; pending repository
migrations are reported rather than assumed applied.

For local review:

```sh
node --test test/supabase-migration-version-order.test.mjs test/supabase-migration-version-workflow.test.mjs
node scripts/audit-supabase-migration-versions.mjs --local-only
```

## Remaining external/provider boundary

Supabase's GitHub App owns the separate "Supabase Preview" check. This
repository cannot patch that App's internal Go migration ordering or
unilaterally mark its failure as success. Until Supabase's hosted check
is corrected, keep its failure visible and investigate it with the
provider. This work is not an authorization to merge, change protected
branch rules, run `migration repair`, apply any of the unapplied
migrations, or change billing.
