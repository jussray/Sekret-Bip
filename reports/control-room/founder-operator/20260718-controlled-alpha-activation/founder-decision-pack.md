# Controlled-Alpha Founder Decision Pack

## Recommended posture

**Continue verification preparation. Hold live migration application and alpha distribution.**

## Evidence available

- PR #495 is open, mergeable, and draft.
- Public production remains closed.
- Bridge and Crew are beta-only; Scrapbook remains internal; L4/L5 remain disabled.
- Catalog probe v2 ran against live metadata with temporary rows and rollback.
- Live before-state result: **2 of 12 checks pass**; the other 10 are the unapplied migration boundaries.
- Aggregate drift is zero for malformed active Crew shares, blocked-direction active shares, unsupported Bridge source rows, and nonterminal unsupported-source requests.
- The final Bridge RPC, Crew owner trigger, Crew revoke RPC, and caller-bound Crew helper compile against the live schema in rollback-only temporary form.
- Hosted GitHub jobs still contain no executed steps or logs.
- A truthful complete checkout is unavailable in the current container because GitHub clone/archive hosts do not resolve.

## Decision 1: isolated database validation

The founder approved creating an isolated Supabase development branch at **$0.01344 per hour**.

Supabase rejected the branch creation request with `PaymentRequiredException` because development branching is available only on the Pro plan or above.

Verified result:

- no development branch was created;
- no hourly branch charge started;
- the only listed branch remains the existing `main` branch;
- no production schema or data changed.

### Safe alternatives

1. **Wait for a complete local or hosted checkout** and run a local Supabase reset when repository networking or GitHub runners recover. This adds no Supabase branch cost.
2. **Upgrade the Supabase organization to Pro**, then request a fresh branch-cost confirmation before another branch creation attempt. A plan upgrade is a separate billing decision and is not approved by the earlier branch-cost confirmation.
3. **Create a separate validation project** only after obtaining and approving its separate monthly price. This is not currently approved.

Direct live migration application remains not recommended because neither isolated branch validation nor a complete local migration reset has succeeded.

## Decision 2: authentication protection

Supabase reports compromised-password protection disabled.

Recommended choice: enable it before password-based controlled-alpha invitations. If it remains disabled, Founder Room must record a concrete alternative authentication control and accepted risk before accounts are created.

## Decision 3: public database RPC posture

Retain only narrowly scoped app RPCs that:

- bind authority to the current user;
- deny anonymous sessions where permanent identity is required;
- use a fixed search path;
- validate ownership and relationship state;
- grant execution explicitly;
- remove direct-table mutation alternatives;
- pass negative authorization probes.

## Hard holds

Do not apply live migrations, change authentication settings, upgrade plans, create another paid environment, deploy, use secrets, consume paid build capacity, distribute builds, create controlled accounts, merge, or open the alpha without the corresponding founder approval and retained evidence.

## Current founder record

- Isolated database branch at $0.01344/hour: **approved, attempted, blocked by current plan**
- Supabase plan upgrade: **not approved**
- Separate validation project: **not approved**
- Compromised-password protection: **enable before invitations**
- Live migration application: **hold until isolated or local proof passes**
- Controlled-alpha distribution: **hold**

This pack records decisions and results only. It does not upgrade a plan, create a project, apply a migration, change Auth, deploy, merge, or distribute anything.
