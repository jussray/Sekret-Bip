# L3 Memory Activation Gate

This document is a release gate, not a claim that durable memory is live.

## Candidate scope

- `src/contracts/agentMemory.ts`
- `src/services/ai/agentMemory.ts`
- `supabase/migrations/20260918234500_agent_memories_l3_contract.sql` — immutable reviewed migration source
- `supabase/candidates/20260918234500_agent_memories_l3_contract.sql` — non-authoritative pointer only
- `.agents/skills/bip-l4-memory/SKILL.md`

The canonical migration entered repository history in PR #1100 and is therefore immutable. It must not be rewritten, retimestamped, copied under a new timestamp, or replaced with a receipt. Production application remains separately gated by the repository's manual exact-current-main Supabase workflow and canonical project authority. A GitHub Supabase app surface that identifies a different/unstable project cannot authorize canonical production mutation.

## Required before production activation

1. Exact canonical migration replays on a fresh Supabase preview database.
2. Anonymous-authenticated users see zero `agent_memories` rows and cannot call the owner-delete RPC successfully.
3. User A cannot select or delete User B memory.
4. Direct authenticated insert/update/delete remain denied.
5. Service-side admission writes only minimal summaries with provenance, consent, sensitivity, retention and integrity fields.
6. Retrieval filters owner before ranking and rejects quarantined, expired, deleted, blocked, contradicted and superseded memory.
7. Instruction-shaped remembered content is quarantined/rejected and cannot become system, developer, tool or policy authority.
8. Cross-companion retrieval is denied by default; continuity scope is explicit and consent-version bound.
9. Restricted memory is excluded from companion context by default; sensitive memory requires explicit user confirmation before retrieval.
10. The trusted server retrieval path recomputes and verifies the integrity fingerprint before model context. Phase-1 format validation alone is not integrity proof.
11. “Forget this” removes the primary row and any future derived/vector/index copies before retrieval can observe them again.
12. Logs, traces, analytics, screenshots and Control Room surfaces contain metadata/counts only, never raw memory text.
13. The two custom-auth Edge Functions retain live negative-auth proof.
14. Supabase leaked-password protection is enabled and re-observed green.
15. Exact-production `app.sekretbip.net` authority is restored before any UI/runtime L3 claim.
16. Production apply targets canonical project `tbsevonvegdnlyjgplmm` from exact current `main` through the guarded manual workflow; foreign/unstable Supabase app checks cannot substitute.

## Launch flag rule

Do not flip evidence or safety booleans from false to true by configuration alone.
A launch-enabling flag may turn true only when its named prerequisites above have current exact-head and real-path evidence. `productionClaim`, `merge_authority`, `deploy_authority`, safety denials and memory instruction authority are evidence/trust state, not launch toggles.

## Rollback

Before production activation, rollback is code/runtime disable or PR revert because canonical production still has no L3 schema. After a future reviewed production apply, disable memory retrieval first, then use a new reviewed migration/release receipt for any schema reversal. Never rewrite an applied migration or preserve a false green status after rollback.
