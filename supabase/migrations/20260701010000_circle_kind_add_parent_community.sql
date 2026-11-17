-- Circle V2 Phase 0 (1/2) — add 'parent_community' to circle_kind
--
-- Split into its own migration/transaction on purpose: a new enum value
-- added via ALTER TYPE ... ADD VALUE cannot be referenced (in a CHECK
-- constraint, a comparison, etc.) within the same transaction it was added
-- in. Everything that *uses* 'parent_community' lives in the next migration.
--
-- Decision (plan doc docs/circle-v2-migration-plan.md §1.2, option a):
-- Parent Circle community feed gets its own kind, separate from the
-- existing kind='parent' (which stays a private space scoped to one
-- specific parent_links row via circles_kind_shape — unchanged, untouched).

alter type public.circle_kind add value if not exists 'parent_community';
