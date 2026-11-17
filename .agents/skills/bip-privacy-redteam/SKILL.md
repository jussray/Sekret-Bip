# bip-privacy-redteam

## 5W1H operating contract

Before planning, editing, or claiming completion, establish and state:

- **Who** — the requester, decision owner, affected users, data subjects, and execution authority.
- **What** — the requested outcome, concrete deliverable, non-goals, and existing work that must be preserved.
- **Where** — the exact repository, branch, environment, runtime, route, service, table, or provider boundary involved.
- **When** — the current lifecycle or release state, required ordering, timing constraint, and rollback window.
- **Why** — the user problem and verified evidence that justify the work.
- **How** — the smallest safe implementation, required permissions, verification evidence, rollout, and rollback.

Inspect repository and runtime truth for unknowns. Ask the user only when a missing answer would materially change the safe solution or authority. Re-run 5W1H after red-team/OODA findings change the plan. Finish by mapping the result, evidence, remaining blocker, and next owner back to these six questions.


## Trigger
Any PR touching: Supabase migrations, RLS policies, Edge Functions, API routes
that query user or circle data.

## Core Rule — The Privacy Contract
`author_user_id` and equivalent identity-bearing fields must never reach anonymous,
public, parent-summary, or other untrusted clients unless the contract explicitly
authorizes identity disclosure. Any SELECT, JOIN, RPC, Edge Function, response mapper,
or realtime payload that exposes identity outside that contract is a critical violation.

## Review Protocol (run in order)

### 1. Column and Audience Audit
Grep every changed migration, query, RPC, response type, and mapper for identity-bearing
columns such as:
- `author_user_id`, `user_id`, `created_by`, `owner_id`
- profile IDs, emails, usernames, invite IDs, device IDs, or stable internal identifiers

For every use, state the intended audience and authorization contract.
- Owner-only reads must bind the row to `auth.uid()`.
- Circle/member reads must enforce membership without leaking identity fields.
- Parent reads must flow through an active link plus explicit teen consent/request state.
- Server-only identifiers must be removed or masked before crossing the wire.

Flag any identity-bearing field in a response without an explicit, tested reason.

### 2. RLS Operation Matrix
For every touched table, classify SELECT, INSERT, UPDATE, and DELETE as:
- ALLOWED — requires an explicit policy with the correct ownership, membership, or consent check.
- DENIED — must remain impossible; absence of a policy may be the intended control.
- SERVER-ONLY — must not be reachable through an end-user JWT.

Do not require policies for operations clients must never perform. A table passes only when:
- RLS is enabled for every client-reachable table;
- every allowed operation is explicitly protected;
- every denied operation remains denied;
- every server-only operation is unreachable through user credentials.

For user-authored inserts, prefer `WITH CHECK` binding ownership to `auth.uid()`.
For updates and deletes, verify both row visibility and ownership constraints.

### 3. Teen/Parent Boundary Check
The `(teen)` / `(parent)` route split is a presentation boundary, not sufficient privacy
enforcement by itself. Authorization must also exist at the database, RPC, Worker, consent,
and response-contract layers.

Verify:
- teen content queries are scoped to the teen's own `auth.uid()`;
- parent Bridge queries require an active link and valid consent/request record;
- parent responses contain generated summaries only, never raw source content;
- revocation immediately removes parent access at the data layer;
- unlinking invalidates access independently of cached UI state.

### 4. Circle Anon/Cross-Leak Test
- Can Member A retrieve Member B's identity or an equivalent stable identifier?
- Does a `profiles`, membership, avatar, ordering, nullability, or metadata join create a side channel?
- Are anonymous and identified posts distinguishable at the wire level?
- Do realtime payloads expose columns omitted from normal SELECT responses?

Anonymous content fails if identity can be inferred reliably, even when `author_user_id` itself
is absent.

### 5. Edge Function and Worker Auth Boundary
The service-role key is for narrowly scoped elevated operations only. User-scoped reads must
preserve and validate the user's JWT or perform an equivalent explicit authorization check before
using elevated credentials.

Flag any `supabaseAdmin.from(...)`, elevated RPC, or Worker query that returns user-authored
content without:
- verified audience authorization;
- least-privilege query scope;
- response minimization;
- tests for unauthorized callers.

### 6. Eval Case — Known Identity Leak
Known baseline: a Circle posts query joined `profiles` and returned `author_user_id` without a
safe disclosure contract.

The durable fix is layered:
- membership/visibility enforced by RLS or equivalent server authorization;
- identity-bearing columns excluded or masked for untrusted audiences;
- response and realtime contract tests proving the field cannot cross the wire.

If new code reintroduces this pattern, it fails.

## Pass Criteria
- No identity-bearing field reaches an unauthorized audience.
- Every allowed client operation has an explicit correct policy.
- Every denied or server-only operation remains unreachable to end-user JWTs.
- No unbounded service-role read returns user-authored content.
- Teen/parent access is enforced below the UI layer.
- Parent Bridge responses remain consent-based and summary-only.
- Revocation and unlinking remove access immediately at the data layer.
- Anonymous content has no practical identity bleed path.

## Output Format
Return: PASS | FAIL | NEEDS REVIEW
- FAIL: exact file + line + violation type + affected audience.
- NEEDS REVIEW: ambiguous contract or behavior requiring a migration, integration, realtime, or response test.

## Control Room local-agent red team

For Control Room execution, fail the review if the server binds beyond `127.0.0.1`, accepts non-local origins, lacks timing-safe bearer authentication, reuses a committed token, accepts arbitrary shell input, runs non-allowlisted missions, permits concurrent missions, omits a timeout, or exposes unbounded output. Verify teen and parent-private content cannot enter commands, output, reports, telemetry, or hosted provider prompts.
