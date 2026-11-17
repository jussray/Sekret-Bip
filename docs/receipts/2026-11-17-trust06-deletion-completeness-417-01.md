RECEIPT-ID:        2026-11-17-trust06-deletion-completeness-417-01
PREDECESSOR:       none (this session's prior branch, claude/open-issues-closure-n44bxf, was
                    confirmed dead: PR #408 closed unmerged 2026-07-17, issue #271 closed
                    2026-08-25 with founder note calling that branch's work "a stale
                    mixed-branch prototype... not a direct merge candidate")
SUCCESSOR:         (filled by the next receipt)
CREATED-AT:        2026-11-17 (session clock)
RECHECK-BY:        on next session touching #417, #416, #270, or supabase/functions/account-delete/
OPERATOR / MODE:   Claude (this session) · /goalfix
AUTHORITY-DIGEST:  jussray/Sekret-Bip@d089694f61590112ba30e481ac64db81714058f3 (origin/main at time of branch)
EVIDENCE:          supabase/functions/account-delete/index.ts, docs/trust/DELETION_MANIFEST.md,
                   test/account-deletion-parent-link-revocation.test.mjs,
                   supabase/migrations/0003_oracle_parentlinks_period_safety.sql,
                   supabase/migrations/20260618_bridge_oracle_tables.sql,
                   supabase/migrations/20261108014000_require_teen_parent_link_confirmation.sql
EVIDENCE-DIGEST:   not computed (scripts/receipts_check.py not present in this repo; no receipts
                   chain existed before this one)
FINGERPRINT:       jussray/Sekret-Bip · branch claude/trust06-deletion-completeness-417 ·
                   SHA d089694 (base) · env: local/dev only · deploy-id: n/a (not deployed)

GOAL:              Audit account-deletion completeness per issue #417 (Trust-06) and harden
                   any gap found, without live Supabase/production access.
BASELINE:          `npm run lint`, `npm run type-check`, `npm test` all clean on main@d089694
                   before this change (2259 pass / 1 documented env-missing skip / 2 pre-existing
                   unrelated cancellations in a timeout test, neither touching deletion code).
CAUSE:             supabase/functions/account-delete/index.ts already explicitly compensates for
                   one non-cascading FK (crew_members.member_user_id, ON DELETE SET NULL) but not
                   for a second one with the identical pattern: parent_links.parent_user_id, also
                   ON DELETE SET NULL (confirmed in 0003_oracle_parentlinks_period_safety.sql and
                   20260618_bridge_oracle_tables.sql, unchanged by any later ALTER TABLE across
                   the full migration history). Effect: deleting a parent's account left their
                   parent_links row with status='active', is_active=true, parent_user_id=null —
                   a stale/inaccurate link state visible to the teen, not a raw-PII leak.

ACTIONS:
  - git fetch + compare origin/main vs the old branch (1500+ commit drift confirmed)
  - checked GitHub issue/PR history for #271/#408/#416/#417/#426/#270 to re-establish real state
  - grepped all 268 supabase/migrations/*.sql for every table named in #417's checklist, read
    each table's CREATE TABLE and any later ALTER TABLE touching the relevant FK
  - read supabase/functions/account-delete/index.ts in full
  - read the current (2026-11-08) revoke_parent_link(uuid) RPC to mirror its exact terminal state
  - wrote revokeParentLinksForDeletedParent() in account-delete/index.ts; wired it before
    admin.auth.admin.deleteUser(userId), alongside the existing crew_members cleanup
  - wrote docs/trust/DELETION_MANIFEST.md (full table-by-table cascade audit + this gap)
  - wrote test/account-deletion-parent-link-revocation.test.mjs (4 tests, source-contract style,
    matching this repo's existing convention for this Deno function)

CHANGE:
  - supabase/functions/account-delete/index.ts: +1 function, 1 call site, 2 new error codes
  - docs/trust/DELETION_MANIFEST.md: new file, the full audit
  - test/account-deletion-parent-link-revocation.test.mjs: new file, 4 tests

PROOF:             PARTIAL.
  - VERIFIED (static/source): npm run lint, npm run type-check, npm test all clean, including
    the 4 new tests and all 25 pre-existing account-deletion-related tests.
  - UNKNOWN / BLOCKED: no Deno runtime available in this environment to type-check the Edge
    Function file directly (excluded from the main tsc project by tsconfig.json; this repo's
    own convention for this file is source-regex contract tests only, which I followed).
  - BLOCKED: no live Supabase access. Nothing here is proven against the real database, a real
    deployed account-delete function, or a real parent+teen account pair. The runbook's own
    2026-10-24/2026-10-27 entries record a SEPARATE, still-open, founder-gated production
    incident (PGRST205/406 schema-exposure mismatch blocking the scheduled sweep entirely) that
    this change does not touch and does not fix — flagging it because it directly affects
    whether ANY deletion (including this fix) is currently executing in production at all.

RISK:
  - The fix assumes at most a small number of active parent_links rows per deleted parent
    (realistic given the product's one-active-link-at-a-time invariant elsewhere), batches via
    .in('id', linkIds) without chunking — would need chunking if that invariant ever changes.
  - account_verification update is unconditional on teen_user_id, matching the existing
    revoke_parent_link RPC's own behavior exactly (same pre-existing edge case: a teen who
    re-linked to a different parent between the old parent's deletion request and its processing
    would have the new link's account_verification state also touched). Not introduced by this
    change — logged as KNOWN-RED, same as the live RPC — not fixed here since it's a pre-existing
    issue outside this goal's scope.
  - Not deployed. supabase/functions/account-delete must be redeployed
    (`supabase functions deploy account-delete --no-verify-jwt`) by the founder before this fix
    takes effect anywhere.

ROLLBACK:          code: revert this commit (single function + call site, isolated, no schema
                   change, no migration). Nothing to roll back in the database — this only
                   changes what the existing Edge Function does on its next deploy.

NEXT GATE:         Founder decision — (1) review and deploy this fix; (2) separately, resolve the
                   open production PGRST205/406 sweep-read incident in the runbook before trusting
                   that any deletion, fixed or not, is actually running on schedule; (3) decide
                   whether to pursue the remaining #417 acceptance criteria that need live
                   access (post-deletion JWT denial, signed-URL denial, Studio-read denial) —
                   those need a controlled test account and production/staging access this
                   session doesn't have.

CONTEXT:           ~UNKNOWN — this session covers a wide span (original OODA triage in July,
                   this Trust-06 audit in November); heavy items were the 268-file migration
                   grep and the full npm test run (~16s, 2263 tests).
