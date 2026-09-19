# L3 Memory Activation Gate

This document is a release gate, not a claim that durable memory is live.

## Candidate scope

- `src/contracts/agentMemory.ts`
- `src/services/ai/agentMemory.ts`
- `supabase/candidates/20260918234500_agent_memories_l3_contract.sql`
- `supabase/migrations/20260918234500_agent_memories_l3_contract.sql` — receipt-only, no schema changes
- `.agents/skills/bip-l4-memory/SKILL.md`

The Supabase GitHub integration evaluates canonical migration files after merge. Until this gate is satisfied, schema-changing L3 SQL must remain outside `supabase/migrations`. The canonical `20260918234500` file is permanently receipt-only; future production activation must use a new migration version after approval.

## Required before production activation

1. Exact candidate SQL replays after the canonical migration set on a fresh ephemeral Supabase database.
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
16. A new activation migration is reviewed at an exact candidate head; do not mutate the already-integrated receipt into schema SQL.

## Launch flag rule

Do not flip evidence or safety booleans from false to true by configuration alone.
A launch-enabling flag may turn true only when its named prerequisites above have current exact-head and real-path evidence. `productionClaim`, `merge_authority`, `deploy_authority`, safety denials and memory instruction authority are evidence/trust state, not launch toggles.

## Rollback

Before activation, rollback is candidate-code disable/revert only because production has no L3 schema. After a future reviewed activation, disable memory retrieval first, then revert using a new migration/release receipt. Never rewrite an applied migration or preserve a false green status after rollback.
