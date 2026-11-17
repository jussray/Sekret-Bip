# Summary

Ray requested fewer GitHub Actions workflows after mobile screenshots showed high-count/noisy workflows still running recently.

This branch moves the noisy automatic Actions surface to manual-only `workflow_dispatch` mode while preserving the workflow files and jobs for Control Room evidence runs.

No runtime app code, Supabase/Auth/RLS, secrets, or deployment command changed.
