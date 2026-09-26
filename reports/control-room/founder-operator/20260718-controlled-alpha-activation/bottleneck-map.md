# Controlled-Alpha First-Principles Bottleneck Map

## Founder outcome

Open a real invite-only teen/parent alpha without widening production, exposing unsupported choices, or claiming privacy actions that did not occur.

## Highest-leverage bottleneck

The current branch activates surfaces faster than it proves the boundaries around them.

Three configuration/service details can create a false-green alpha before any live deployment:

1. `enabled` client flags include the `public` audience, not only controlled beta;
2. the committed alpha Worker rollout is globally enabled rather than cohort-allowlisted;
3. Bridge and Crew can present success paths that the runtime cannot truthfully complete or confirm.

Fixing these boundaries has more leverage than creating builds first because every later journey depends on the app showing only executable, cohort-scoped actions.

## Smallest reversible execution sequence

### Slice A — Cohort boundary

- change Bridge and Crew feature states from `enabled` to `beta`;
- prove beta/founder/internal audiences are allowed and public is denied;
- keep Emotional Scrapbook internal and L4 disabled.

**Rollback:** set both states to disabled or revert the focused commit.

### Slice B — Worker fail-closed boundary

- remove globally enabled rollout from committed alpha configuration;
- require an approved comma-separated user-ID allowlist at runtime;
- keep an unset or disabled value fail closed;
- retain production rollout as disabled.

**Rollback:** remove the runtime allowlist or set it to disabled.

### Slice C — Bridge executable-choice boundary

- allow Journal and Mood sources in controlled alpha;
- reject Goal and Scrapbook before creating a request;
- provide a truthful unavailable message instead of saving a request that generation cannot fulfill.

**Rollback:** disable Bridge or restore the previous service while keeping the Worker fail closed.

### Slice D — Crew revocation truth boundary

- return the exact updated share row or a false result;
- fail when no owner/check-in/recipient row transitions;
- preserve RLS as the authorization boundary and add focused tests.

**Rollback:** disable Crew or restore the previous service while preventing a success claim.

## Why this order

1. Cohort scope determines who can see the features.
2. Worker scope determines who can execute Bridge generation.
3. Source validation determines which visible Bridge actions are real.
4. Mutation confirmation determines whether privacy controls tell the truth.
5. Only after all four are green should credential provisioning, deployment, builds, or two-account journeys begin.

## Proof required for this execution slice

- feature-availability tests across founder, internal, beta, and public;
- alpha configuration test proving no committed global rollout;
- Bridge service tests proving Goal/Scrapbook fail before RPC/Worker activity;
- Crew revocation tests proving zero-row updates do not return success;
- existing production Worker remains disabled;
- Founder Room plan and ledger update to reflect executed repository evidence without claiming deployment.

## Next action

Implement Slices A through D as narrow, separately understandable commits on PR #495. Do not touch credentials, live Supabase state, paid build capacity, production routing, or user data.
