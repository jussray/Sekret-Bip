# Se’kret Bip Guardrails

These guardrails are product requirements with code, policy, service, and test evidence. The public-safe runtime registry is implemented in `src/config/visionGuardrails.ts`, installed from `app/_layout.tsx`, and verified with Playwright.

| ID | Requirement | Enforcement evidence |
|---|---|---|
| `BIP-PRIVACY-001` | Private journal, voice, companion, memory, notes, unshared messages, and general activity data do not appear on parent or public surfaces. | Service boundaries, RLS/RPC/storage policies, privacy contract tests, and public-surface Playwright scans. |
| `BIP-CONSENT-001` | Parent visibility requires a verified relationship and scoped consent. | Parent-link RPCs, guardian/account states, route access, RLS, revocation tests. |
| `BIP-IDENTITY-001` | Private, trusted, guardian, and anonymous public identities remain separate. | Identity-context resolution, Bip ID invitation flow, Circle anonymous defaults, tests. |
| `BIP-AUTH-001` | Protected teen, parent, social, and founder routes require resolved authorization state. | `app/_layout.tsx`, route-access service, auth/verification providers, Playwright and contract tests. |
| `BIP-ISOLATION-001` | Sign-out, device changes, and second-user flows cannot leak private local or cloud state. | Private cache clearing, device-sync tests, owner-scoped RLS and storage policies. |
| `BIP-AI-001` | AI context is minimized, authenticated, non-clinical, and unable to bypass privacy or identity rules. | Cloudflare Worker auth, prompt/context contracts, blocked-language rules, memory privacy rules. |
| `BIP-MEMORY-001` | Durable memory cannot be claimed or enabled without write/read/invalidation/deletion/privacy tests. | L4 architecture and release gate; current runtime stage is explicitly L2. |
| `BIP-SAFETY-001` | Safety support does not diagnose, promise treatment, or replace emergency services. | Companion voice contract, moderation/safety components, content review and tests. |
| `BIP-SECRET-001` | Model keys, service-role keys, private prompts, and user content stay off clients and minimized logs. | Environment validation, Worker boundary, repository scans, Playwright public-surface scan. |
| `BIP-TRUTH-001` | Planned, partial, demo, and production-complete capabilities remain distinguishable. | README readiness gates, canonical vision, runtime snapshot, PR/release evidence. |

## Runtime status

The web runtime exposes a frozen, public-safe snapshot at `window.__SEKRET_BIP_GUARDRAILS__` containing only IDs, status, summaries, product stage, and boundary flags. It contains no account, journal, voice, parent-link, token, Supabase, or model data.

## Playwright verification

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

The guardrail suite verifies:

- runtime guardrails are installed;
- the product stage and privacy boundary are explicit;
- no privileged or private data markers appear on splash, login, or signup surfaces;
- public routes do not expose parent controls, journal content, voice transcripts, tokens, or service credentials;
- the app remains usable at phone width.

Playwright complements, but does not replace, RLS, RPC, migration, device-sync, Worker, moderation, and deletion tests. A browser cannot prove a database policy by staring at a purple button, no matter how emotionally compelling the button is.
