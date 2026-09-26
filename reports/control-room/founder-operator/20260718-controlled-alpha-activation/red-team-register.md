# Controlled-Alpha Red-Team Register

## Decision rule

Stop or fail closed when a risk can expose raw teen content, preserve access after revocation/deletion, widen the cohort beyond founder intent, claim success without a state transition, or convert configuration into false deployment evidence.

## Critical and high risks

### R1 — Client flags widen beyond controlled alpha

- **Observation:** Bridge and Crew are currently `enabled`. The availability helper treats `enabled` as available to `public`, while preview uses `beta` and production uses `public`.
- **Failure:** merging the branch can expose Crew publicly and can expose Bridge UI that the production Worker rejects.
- **Control:** use `beta` for controlled-alpha features. Keep production `public` unavailable until a separate founder-approved rollout.
- **Trigger:** any production/public build returns true for Bridge or Crew availability.
- **Rollback:** set the feature state to `disabled` or revert the activation commit.

### R2 — Alpha Worker rollout is wider than the invited cohort

- **Observation:** `wrangler.alpha.toml` sets `BRIDGE_SUMMARIES_ROLLOUT="enabled"`.
- **Failure:** any authenticated user with a usable request can pass the Worker rollout gate, even when the founder intended an invite-only cohort.
- **Control:** fail closed in committed configuration and provision an explicit user-ID allowlist through an approved runtime secret or environment operation.
- **Trigger:** the alpha Worker reports rollout `enabled` instead of a reviewed cohort.
- **Rollback:** remove the allowlist secret or set rollout to disabled.

### R3 — Unsupported Bridge source kinds create false-ready UI

- **Observation:** the client preview accepts Journal, Mood, Goal, and Scrapbook; the Worker supports only Journal and Mood.
- **Failure:** a teen can deliberately select an item the Worker will always reject as `source_not_available`.
- **Control:** restrict controlled-alpha selection to supported source kinds until Goal and Scrapbook have complete data, authorization, deletion, and privacy paths.
- **Trigger:** a Goal or Scrapbook source reaches the generation request.
- **Rollback:** disable Bridge or restrict the selector/service validation.

### R4 — Crew revocation can claim success without mutation proof

- **Observation:** the direct update returns `{ revoked: true }` whenever Supabase returns no error, including a zero-row match.
- **Failure:** the owner sees a success state while the share remains active or the requested relationship never existed.
- **Control:** request the updated row or use a narrowly scoped RPC; return success only when the exact owner/check-in/recipient share transitioned to revoked.
- **Trigger:** revocation returns success with no updated row.
- **Rollback:** disable Crew sharing or route revocation through the verified RPC.

### R5 — Parent and Crew reads depend on unobserved live RLS

- **Observation:** parent Bridge inbox and Crew feed query tables directly from the client.
- **Failure:** repository policy intent may differ from deployed RLS, allowing unrelated or post-revocation reads.
- **Control:** two-account and unrelated-user probes against the live alpha project; retain policy, grant, and query evidence.
- **Trigger:** unrelated, revoked, pending, blocked, removed, or unauthenticated actors receive private rows.
- **Rollback:** disable the feature flag and revoke the relationship until policies are corrected.

### R6 — Deletion sweep depends on a blocked hosted execution path

- **Observation:** expired deletion requests are processed by a scheduled sweep, while repository Actions are currently failing before step one.
- **Failure:** users can receive pending deletion state without the destructive processor ever running.
- **Control:** prove the actual scheduler independently. For controlled tests, use a founder-approved manual/local invocation or another reviewed scheduler without exposing admin credentials.
- **Trigger:** an expired request remains pending past the defined processing window.
- **Rollback:** stop inviting users until the deletion processor is operational.

### R7 — Auth deletion relies on complete cascade/detach coverage

- **Observation:** the processor deletes storage, clears a small known blocker set, removes one Crew identity row, then deletes the Auth user and relies on cascades.
- **Failure:** orphaned private rows, retained names, broken shared records, or restored content after sync.
- **Control:** inventory every user-owned and shared table, verify foreign keys/policies, run teen and parent deletion probes, and assert orphan count zero.
- **Trigger:** any owned/private row, file, relationship access, or sync-restorable content remains.
- **Rollback:** suspend deletion claims and alpha access until cleanup is complete.

## Medium risks

### R8 — Dedicated alpha service identity is not yet proven

- **Observation:** Cloudflare preview evidence currently names the canonical `sekret-backend` service.
- **Failure:** a branch preview is mistaken for the dedicated alpha runtime.
- **Control:** retain the exact `sekret-backend-alpha` deployment identity and health response after approved deployment.

### R9 — Alpha runtime configuration lacks observed origin/rate-limit bindings

- **Observation:** the Worker supports `ALLOWED_ORIGINS` and a rate-limit binding, but the alpha configuration does not prove either is configured.
- **Failure:** avoidable abuse or ambiguous browser-origin behavior.
- **Control:** document native/web origin behavior, verify rate limiting, and retain the deployed binding inventory.

### R10 — Static fallback can mask provider failure

- **Observation:** Bridge persists a safe fallback and reports `usedFallback`.
- **Failure:** testers may treat fallback as normal AI success and miss provider/configuration failure.
- **Control:** surface fallback status in founder evidence and monitor fallback rate.

### R11 — Request status can be saved before generation succeeds

- **Observation:** the share RPC succeeds before the Worker call; client failure returns “still being prepared.”
- **Failure:** stuck requests or repeated paid generation without a robust queue/retry contract.
- **Control:** verify idempotency, retry state, duplicate suppression, and cleanup.

### R12 — Device and failure-state proof is absent

- **Observation:** preview profiles exist, but install/build evidence does not.
- **Failure:** web/configuration success hides native route, storage, accessibility, or offline failures.
- **Control:** teen and parent iOS/Android matrix with retained screenshots or recordings.

### R13 — Zero-step CI can be mistaken for code failure or ignored as passing

- **Observation:** hosted jobs have no executed steps or logs.
- **Failure:** innocent code is rewritten, or the branch is merged without executed checks.
- **Control:** continue repository-side preparation, retain independent focused evidence, and keep exact-head checks explicitly unproven.

## Stop conditions

Stop controlled alpha immediately when:

- raw private teen content reaches a parent, log, analytics event, notification, or report;
- unrelated or post-revocation access succeeds;
- deletion or blocking fails to terminate access;
- the cohort becomes wider than the approved account list;
- the app claims revocation, deletion, build, deployment, or verification without observable proof;
- the production Worker or public audience is activated unintentionally;
- secrets appear in repository content or retained evidence.

## Next ordered controls

1. change Bridge and Crew client states from public `enabled` to controlled `beta`;
2. make the committed alpha Worker rollout fail closed and require a reviewed allowlist at runtime;
3. reject unsupported Bridge source kinds before request creation;
4. require affected-row proof for Crew revocation;
5. add focused contract tests for all four boundaries;
6. update Founder Room artifacts and only then prepare live runtime operations.
