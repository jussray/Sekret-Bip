# bip-supabase-guardian

## 5W1H operating contract

Before planning, editing, or claiming completion, establish and state:

- **Who** — the requester, decision owner, affected users, data subjects, and execution authority.
- **What** — the requested outcome, concrete deliverable, non-goals, and existing work that must be preserved.
- **Where** — the exact repository, branch, environment, runtime, route, service, table, or provider boundary involved.
- **When** — the current lifecycle or release state, required ordering, timing constraint, and rollback window.
- **Why** — the user problem and verified evidence that justify the work.
- **How** — the smallest safe implementation, required permissions, verification evidence, rollout, and rollback.

Inspect repository and runtime truth for unknowns. Ask the user only when a missing answer would materially change the safe solution or authority. Re-run 5W1H after red-team/OODA findings change the plan. Finish by mapping the result, evidence, remaining blocker, and next owner back to these six questions.


## Relationship to Upstream Skills

Use the installed Supabase and PostgreSQL best-practice skills for general
platform guidance. This skill adds Se'kret Bip's product-specific trust
boundaries, privacy constraints, and proof requirements.

When a generic recommendation conflicts with a stricter Bip privacy rule, the
Bip rule wins.

## Trigger

Activate whenever work touches:

- `supabase/migrations/**`
- `supabase/functions/**`
- RLS policies, grants, roles, RPCs, triggers, or database functions
- authentication, JWT verification, session handling, or account deletion
- client or Worker code that reads or writes Supabase
- Storage buckets or policies
- parent, guardian, Bridge, Circle, journal, voice, safety, or memory data
- Supabase health, migration, advisor, or Edge Function claims

Read `SPRINT.md` first, then verify live state. Project health alone does not
prove schema parity, policy safety, or function configuration.

## Trust Model

| Principal | Allowed trust |
|---|---|
| Teen | Owner of their private rows |
| Verified guardian | Explicitly consent-scoped access only |
| Linked parent | Limited access through approved contracts and RPCs |
| Authenticated unrelated user | No access to another user's rows |
| Anonymous user | No access to private user data |
| Service role | Server-side only, narrowly justified, audited |

Service-role use may occur in a Supabase Edge Function or the backend Worker.
It must never appear in the app bundle, browser, client logs, or public config.

## Data Boundaries

- Journal entries and private chat history are teen-private.
- Voice notes and session metadata are teen-private unless a separate consented
  product contract explicitly says otherwise.
- Bridge exposes approved summaries or share requests, not raw journal or chat
  content.
- Circle identity remains pseudonymous and separate from private identity.
- Parent and guardian visibility is not implied by account linkage.
- Safety access must be purpose-limited and must not become general surveillance.
- Future companion memories belong to a `(user_id, companion_id)` scope and
  require a reachable deletion path.

## Required Verification Sequence

Before changing schema, policies, functions, or authorization:

1. Verify the live project, migration history, relevant tables, functions, and
   Edge Functions.
2. Compare live state with repository migrations. Record any drift.
3. List every affected role and operation: select, insert, update, delete,
   execute, storage access, and service-role path.
4. State who may read and write each affected row.
5. Prove anonymous denial where data is private.
6. Prove cross-user denial using two distinct authenticated users.
7. Prove guardian or parent access is no broader than current consent.
8. Verify direct table writes are denied where an RPC-only contract exists.
9. Run security and performance advisors after the change.
10. Document rollback and regression evidence.

Do not describe a policy as safe because it contains `auth.uid()`. Verify the
role target, USING clause, WITH CHECK clause, function ownership, grants, and
all alternate access paths.

## RLS Rules

- Enable RLS on every exposed user-data table.
- A table with RLS enabled and no policy is allowed only when intentional denial
  is documented and tested.
- Private policies should target explicit roles such as `authenticated` rather
  than silently applying to anonymous-capable roles.
- Owner policies must prevent user A from reading or mutating user B's rows.
- Separate read and write semantics when consent differs by operation.
- Avoid multiple overlapping permissive policies unless their union is
  deliberate and tested.
- Use `(select auth.uid())` where appropriate to avoid per-row re-evaluation,
  but never trade correctness for planner optimization.
- Any policy replacement must prove the replacement exists before the old
  access path is removed.

## RPC and SECURITY DEFINER Rules

- Revoke broad `PUBLIC` or generic authenticated execution unless the function
  is intentionally user-callable.
- Grant EXECUTE only to the roles that need it.
- Set a safe, explicit `search_path` for `SECURITY DEFINER` functions.
- Validate caller identity and authorization inside the function.
- Never assume RLS protects operations executed with elevated privileges.
- Administrative, founder, guardian-review, notification, and audit-ingestion
  functions require especially narrow grants.
- RPC-only tables, including parent-link mutation paths, must deny equivalent
  direct client writes.

## Edge Function Rules

JWT verification is the default.

`verify_jwt: false` is permitted only when one of these is true:

- the endpoint implements and tests its own authentication contract;
- it is a deliberately public health or webhook endpoint with no private-data
  access;
- explicit product and security review approved the exception.

For every exception, document the authentication mechanism, accessible data,
abuse controls, logging policy, and regression test. Edge Functions must not
log raw journal text, chat content, voice data, tokens, or service keys.

## Migration Rules

- Use the repository's existing migration naming convention.
- Keep schema and unrelated application work in separate PRs.
- Do not hardcode generated IDs into data migrations.
- Do not run destructive reset operations against production.
- New tables require an RLS decision, policy proof, indexes for expected foreign
  key access, and a rollback plan.
- New foreign keys require an index decision based on actual query and delete
  paths.
- Generate and review updated TypeScript database types when contracts change.
- Apply production migrations only after the reviewed repository migration is
  approved and the target project is verified.

## Account Deletion

Account deletion must cover private rows, Storage objects, parent links,
Bridge records, Circle identity linkage, derived memory, queued notifications,
and backend caches. The completion record may contain counts and timestamps,
but not deleted private content.

Do not substitute an undocumented soft delete for private teen-data deletion.

## Durable Memory Rules

Before durable companion memory ships:

- store safety-reviewed summaries, not raw transcripts;
- scope retrieval to the authenticated user and companion;
- prevent cross-user vector search;
- record memory provenance and confidence;
- support correction and deletion;
- keep reflection and compression outside live reply latency;
- audit every privileged memory read and write path.

## Advisor Handling

Supabase advisor findings are evidence, not automatic migrations.

Classify each finding as:

- exploitable authorization risk;
- defense-in-depth hardening;
- performance issue with observed impact;
- intentional design with documented exception;
- stale or false-positive finding with proof.

Never silence or mass-edit policies merely to reduce the advisor count. Fix
highest-blast-radius authorization issues first, in small reviewed migrations.

## Output

```text
Supabase Guardian: CLEAR|BLOCKED
Project verified: yes|no
Migration drift: none|description
Anonymous denial: proven|missing
Cross-user denial: proven|missing
Guardian scope: proven|not applicable|missing
Elevated functions: reviewed|list of blockers
Edge Function auth: reviewed|list of exceptions
Advisors: security <count>, performance <count>
Rollback: documented|missing
Next action: <smallest safe fix>
```
