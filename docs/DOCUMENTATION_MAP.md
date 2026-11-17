<!-- truth-mode: durable -->
# Se’kret Bip — Documentation Map

This map defines which repository documents are durable authorities, which are historical snapshots, and where volatile live truth must be resolved.

## Live truth boundary

Repository prose is not the authority for live `main`, PR/issue state, Cloudflare state, Supabase runtime state, production-browser behavior, or device/account behavior.

For live state, inspect the owning system at decision time. Use the newest marked exact-production receipt on issue #696 for release-status handoff, then verify its target against fresh `main` and the independent provider/database/browser witnesses it names.

See `docs/TRUTH_AUTHORITY.md` for claim expiry and supersession.

## Authority levels

### Level 0 — inspected external truth

Highest authority for volatile state:

- GitHub branch, PR, issue, check, review, job, and log state;
- Cloudflare Pages / Workers / Access / routes / custom domains / Service Bindings / build-trigger evidence;
- live Supabase migration, catalog, grants, policies, Auth, Storage, and runtime evidence;
- exact deployed release markers and Worker health/version evidence;
- production Playwright;
- controlled-account and physical-device evidence.

Every Level 0 claim must identify its target, observation time, authority, and evidence reference. One system does not silently prove another.

### Level 1 — machine-checked repository truth

- `implementation-ledger.json`
- `implementation-ledger.extensions/*.json`
- exact-head CI artifacts and receipts
- repository truth, migration-lineage, documentation-truth, and release-contract gates

These prove only the scope they actually executed against.

### Level 2 — durable operating contracts

- `docs/TRUTH_AUTHORITY.md`
- `docs/CURRENT_STATUS.md`
- `docs/ISSUE_AUTHORITY.md`
- `docs/LAUNCH_ROADMAP.md`
- `DEPLOYMENT.md`
- `README.md`
- `docs/CLOUDFLARE_OWNERSHIP.md`
- `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md`
- `.control-room/README_SYNC_POLICY.md`
- architecture, privacy, security, legal, and agent instruction documents that describe invariants rather than current provider state

Durable documents may point to live evidence, but must not copy volatile current-state claims into evergreen prose.

## Worker-document authority

When Worker names or responsibilities disagree across older docs, use this order:

1. fresh Cloudflare provider readback for actual live routes/bindings/versions;
2. current source and machine contracts;
3. `docs/CLOUDFLARE_OWNERSHIP.md` for durable identity/purpose rules;
4. `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md` for migration/rollback sequence;
5. `DEPLOYMENT.md` for deployment and exact-release proof;
6. historical snapshots only for chronology.

The current durable distinction is:

- public client origin remains `api.sekretbip.net` on the repository-configured `sekret-backend` path until a cutover is proven;
- `sekret` is the founder-confirmed companion API lineage and target companion execution plane;
- the preferred split uses a Cloudflare Service Binding instead of a second client-facing Worker URL;
- Bridge/privileged Supabase/email/platform responsibilities remain with `sekret-backend`;
- `SUPABASE_SERVICE_ROLE_KEY` must not move into the companion Worker merely for convenience.

This purpose contract does not override Level 0 provider truth about what is currently attached to a hostname or binding.

### Level 3 — historical snapshots

Dated status files, old sprint handoffs, old wiring/status inventories, prior PR bodies, old issue comments, and archived audits remain evidence for the observation window they describe. They must be visibly labeled historical and must not override Level 0 or newer machine evidence.

## Read these first

| Question | Authority |
|---|---|
| What is live right now? | Level 0 owning system + newest marked receipt for that exact target |
| How do claims expire or get superseded? | `docs/TRUTH_AUTHORITY.md` |
| What does “current status” mean here? | `docs/CURRENT_STATUS.md` |
| Which Worker owns what by durable purpose? | `docs/CLOUDFLARE_OWNERSHIP.md` |
| How does the Worker split/cutover roll forward and back? | `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md` |
| Which issue owns a durable outcome? | `docs/ISSUE_AUTHORITY.md`, then GitHub live state |
| What is the durable launch sequence? | `docs/LAUNCH_ROADMAP.md` |
| What is the deployment contract? | `DEPLOYMENT.md` |
| What feature state is machine tracked? | `implementation-ledger.json` + validated extensions |

## Historical documents

`SPRINT.md` and `docs/WIRING_STATUS.md` are retained as historical entrypoints so old links do not break. Their top banners explicitly direct operators to fresh authority. Their detailed prior contents remain preserved in Git history.

Dated launch/status snapshots are historical by filename and observation window. They are not “current overlays” merely because another document still links to them.

Do not rewrite a historical snapshot merely because Worker ownership changed later. Add or update its historical banner/current-authority pointer instead.

## Claim freshness rules

- A PR body is proposed scope and self-reported evidence, not independent proof.
- A merged PR is repository history, not automatic production proof.
- Exact-head evidence must be re-pinned after the relevant head moves.
- Live issue state comes from GitHub issue state, not copied prose in an issue body or Markdown file.
- A newer authoritative contradiction supersedes an older current-state claim while preserving the old observation as history.
- Cloudflare uploads/previews prove only the named provider event.
- A Worker name in Wrangler proves intended deployment target, not all current provider bindings for other Worker identities.
- A founder-confirmed purpose may establish intended/known role while exact route/custom-domain/build state still requires provider readback.
- Live Supabase claims require the intended project and current evidence.
- A screenshot proves appearance, not auth, privacy, database state, deployment, or device behavior.
- Zero-step/no-log jobs remain infrastructure evidence, never a pass.

## Stale-document policy

A document that no longer represents its intended authority must be handled explicitly:

1. **Update** — retain the role and reconcile it with durable truth.
2. **Archive** — add a visible historical banner and point to current authority.
3. **Replace** — preserve detail in Git history while replacing a misleading current-looking surface with a small durable or historical entrypoint.

Do not leave an old sprint, status, or provider incident looking current. A date alone is not enough.

## Update protocol

When a change affects product scope, architecture, release state, wiring, validation, or authority:

1. inspect fresh repository and relevant external witnesses;
2. update machine-tracked state when feature state changed;
3. update durable docs only for changed invariants/procedures/ownership;
4. put volatile outcomes into retained receipts or live systems, not durable prose;
5. run `node scripts/audit-documentation-truth.mjs`;
6. keep repository, provider, database, browser, account, and device evidence separate;
7. merge only after the documentation describes the tested contract rather than a hoped-for future.

## Privacy boundary

Documentation, receipts, CI artifacts, and operational analytics must not contain raw teen journal text, private messages, voice transcripts, safety content, names/emails, credentials, or broad database exports.
