# L3 Memory Activation Gate

This document is a release gate, not a claim that durable memory is live.

## Candidate scope

- `src/contracts/agentMemory.ts`
- `src/services/ai/agentMemory.ts`
- `supabase/migrations/20260918234500_agent_memories_l3_contract.sql`
- `.agents/skills/bip-l4-memory/SKILL.md`

## Required before production activation

1. Exact candidate migration replays on a fresh Supabase preview database.
2. Anonymous-authenticated users see zero `agent_memories` rows and cannot call the owner-delete RPC successfully.
3. User A cannot select or delete User B memory.
4. Direct authenticated insert/update/delete remain denied.
5. Service-side admission writes only minimal summaries with provenance, consent, sensitivity, retention and integrity fields.
6. Retrieval filters owner before ranking and rejects quarantined, expired, deleted, blocked, contradicted and superseded memory.
7. Instruction-shaped remembered content is quarantined/rejected and cannot become system, developer, tool or policy authority.
8. Cross-companion retrieval is denied by default; continuity scope is explicit and consent-version bound.
9. “Forget this” removes the primary row and any future derived/vector/index copies before retrieval can observe them again.
10. Logs, traces, analytics, screenshots and Control Room surfaces contain metadata/counts only, never raw memory text.
11. The two custom-auth Edge Functions retain live negative-auth proof.
12. Supabase leaked-password protection is enabled and re-observed green.
13. Exact-production `app.sekretbip.net` authority is restored before any UI/runtime L3 claim.

## Launch flag rule

Do not flip evidence or safety booleans from false to true by configuration alone.
A launch-enabling flag may turn true only when its named prerequisites above have current exact-head and real-path evidence. `productionClaim`, `merge_authority`, `deploy_authority`, safety denials and memory instruction authority are evidence/trust state, not launch toggles.

## Rollback

Before activation, rollback is branch/PR closure only. After a future reviewed deployment, disable memory retrieval first, then revert the deployment/migration according to the release receipt. Never preserve a false green status after rollback.
