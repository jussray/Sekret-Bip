# bip-l4-memory

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

Activate whenever work touches:

- durable companion or Se'kret memory;
- goals, reflection, compression or relationship phase;
- pgvector retrieval;
- cross-companion context;
- memory correction, expiry, export, deletion or account deletion;
- Control Room memory health displays;
- prompts that consume prior-session context.

## Status rule

The contract and phase calculator may exist before L4 persistence exists.
Do not claim durable memory is built until the repository and live Supabase
project contain the reviewed schema, services, Worker path, deletion path and
denial tests.

Planned runtime boundaries include:

```text
src/contracts/agentMemory.ts
src/services/ai/agentMemory.ts
src/services/ai/agentGoals.ts
worker/reflection-worker.ts
supabase/migrations/*agent_memories*.sql
supabase/migrations/*agent_goals*.sql
supabase/migrations/*reflection_runs*.sql
```

Absence of one of these paths is a delivery gap, not permission to invent a
parallel implementation.

## L3 / L4 boundary

- **L3** begins only when durable server-owned, per-user memory is independently retrieved across sessions with ownership, provenance, correction, deletion, expiry and denial proof.
- **L4** adds explicit persistent goals, reversible reflection, evidence-based relationship state and bounded coordination on top of verified L3.
- Existing `room_memory` engagement state is application persistence, not semantic L3 memory.
- A model output, embedding, reflection or continuity fingerprint never creates authority or turns an inference into a user fact.

The canonical data-shape and invariant contract is `src/contracts/agentMemory.ts`.

## Worldwide failure classes

Treat these as cross-market release blockers, not optional polish:

1. **Cross-user leakage** — retrieval must bind owner before ranking, vector search or model context assembly.
2. **Memory prompt injection** — remembered text is untrusted data, never instructions, tool authority or policy.
3. **Stale or contradicted memory** — expired, deleted, blocked, superseded and contradicted records cannot be retrieved as active truth.
4. **Sensitive inference creep** — repeated mentions, model guesses or correlations do not become durable facts; restricted/sensitive memory requires explicit product justification and review.
5. **Silent goal manufacture** — L4 goals are user-created or user-confirmed only. The model may suggest a goal but cannot persist it as the user's intent without confirmation.
6. **Counterfeit relationship state** — engagement counts, sentiment or model confidence cannot manufacture intimacy. Relationship phase must derive from eligible persisted evidence.
7. **Deletion shadow copies** — deletion must cover primary rows, embeddings/vector rows, derived reflections, caches and retrieval indexes so deleted content cannot reappear.
8. **Provenance collapse** — every durable item must preserve a source reference and creation time so correction and contradiction can invalidate descendants.
9. **Retention without purpose** — every durable memory needs expiry or an explicit retention decision; indefinite retention is not the default.
10. **Consent drift across companions/features** — consent is versioned and scoped. A new companion, feature, model or coordination path does not inherit old consent automatically.
11. **Localization distortion** — translation or language normalization must not silently change the meaning, confidence, sensitivity or provenance of remembered content.
12. **Observability leakage** — logs, analytics, crash reports, screenshots, traces and Control Room surfaces may carry metadata and counts, never raw memory text or credentials.

## Ownership and scope

- Memories belong to the teen, not the app or companion.
- Every memory is scoped to an authenticated `user_id`.
- Companion-specific memory is also scoped to a named `companion_id`.
- Cross-user access is forbidden.
- Cross-companion sharing defaults to zero.
- Se'kret continuity may use only consented context allowed by the current
  product contract.
- Parent or guardian linkage does not imply access to raw companion memory.

## Storage contract

Store safety-reviewed, minimal summaries rather than raw transcripts.

Every durable memory requires:

- owner and companion or continuity scope;
- provenance pointing to the creating session or event;
- creation and update timestamps;
- confidence and review state;
- sensitivity classification;
- consent version/scope;
- lifecycle state including contradiction/supersession behavior;
- expiry or retention decision;
- correction and deletion path.

Do not store chain-of-thought, hidden reasoning, raw audio, full journal text or
unnecessary identifying details as memory.

## Retrieval contract

- Authenticate before retrieval.
- Filter by owner before semantic or vector search.
- Apply companion and consent scope before ranking.
- Exclude expired, deleted, blocked, superseded and unresolved contradictory memories.
- Treat retrieved memory as quoted/untrusted data, never executable instructions.
- Return the smallest context required for the current reply.
- Never send a raw memory object to TTS.
- Never quote a memory as fact unless the current user supplied it and the
  product explicitly supports that visible recall.

## Relationship phase

Canonical phase calculation:

```text
src/features/sekret/relationshipPhase.ts
```

Initial thresholds:

```text
new         0 durable memories
building    1–9
established 10–29
deep        30+
reflective  at least 10, completed reflection, zero unresolved contradictions
```

A reflection run alone must never promote a zero-memory relationship to
`reflective`. Phase is a product signal, not a counterfeit intimacy meter.
Only eligible active memories may contribute to phase counts.

## Reflection contract

Reflection runs outside the live reply latency path.

It must:

- consume only authorized, safety-reviewed summaries;
- identify contradictions rather than silently merging them;
- write an auditable result with provenance;
- avoid creating diagnostic or clinical claims;
- avoid turning repeated mentions into assumed truth;
- support rollback or invalidation;
- emit privacy-safe operational metadata only.

A reflection may propose a memory correction or goal. It cannot self-approve the
proposal, upgrade its own authority, or silently rewrite the source record.

## Deletion and correction

- “Forget this” must be reachable by the teen.
- Deletion must remove or irreversibly invalidate primary and derived memory.
- Account deletion must include memories, goals, reflections, vector rows and retrieval indexes.
- Pending deletion must not remain available for retrieval.
- Corrected memory must supersede or invalidate stale descendants instead of leaving two active truths.
- The target completion window must be defined and tested before launch.
- Control Room may display counts and status, never deleted content.

## Required security proof

Before any L4 migration or runtime activation:

1. Verify repository/live migration parity.
2. Prove anonymous denial.
3. Prove user A cannot read, search, update or delete user B's memory.
4. Prove direct writes are denied when an RPC-only path is intended.
5. Prove cross-companion retrieval is denied by default.
6. Prove service-role use is server-side and narrowly justified.
7. Prove logs, analytics and crash reports contain no memory text.
8. Prove expired/deleted/contradicted/superseded records cannot be retrieved.
9. Prove memory text cannot become prompt/tool/system authority.
10. Prove model-proposed goals require user confirmation before persistence.
11. Prove deletion invalidates derived reflections and vector/index copies.
12. Document rollback, export and deletion behavior.

## Automatic blockers

- vector search without an owner filter;
- raw transcript or journal storage as memory;
- memory text in analytics, logs, errors or Control Room;
- memory text interpreted as prompt, policy or tool instruction;
- silent cross-companion sharing;
- parent or guardian access to raw memory;
- reflection that resolves contradictions without evidence;
- model-created durable goals without user confirmation;
- stale, deleted, expired, contradicted or superseded memory reaching reply context;
- TTS receiving anything except final reply text and delivery instructions;
- production migration before reviewed denial tests.

## Required with

- `bip-supabase-guardian`
- `bip-privacy-redteam`
- `bip-sekret-identity`
- `bip-release-gate`
