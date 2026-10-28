# AI Labyrinth — external organization licensing boundary

**Status: APPROVED PRODUCT DIRECTION / PROPOSAL ONLY. No customers, subscription payments, API access, deployments, secrets, or production access are enabled by this change.**

## Product principle

AI Labyrinth is the founder's named protection system. It must defend both Se'kret Bip's user application and the agent/operator control plane. A separately licensed **B2B security sandbox** may one day sell bounded synthetic testing capabilities. **User information is never licensed, sold, exposed, analyzed for external customers, or used for their model training, even if a customer pays.** This proposal creates no app-user purchase feature and must never put commercial pressure on teens.

## Identity and authority

1. Founder-linked AI agents follow existing verified founder/operator account, role, scope and approval gates. An email string or account connection alone is not proof of authority. External licensing cannot change founder identity or privileges.
2. External organizations must be identity-verified through a trusted server-controlled process; a client claim of an email, AI model name, organization, purchase or "paid" status is inert data.
3. A payment provider's event is billing evidence **only**. A separate, revocable, tenant-scoped, server-validated entitlement is required before isolated execution. An entitlement cannot override capability, data, environment or human-approval limits.
4. Unknown, expired, ambiguous, revoked, mismatched or unsupported authority fails closed. No unverified AI can issue itself credentials.

## Isolation and data prohibition

- Eligible future products: synthetic prompt-injection evaluation, synthetic authorization-contract tests and synthetic policy validation.
- The commercial environment must have separate deployment, account, storage, secrets, credentials, network egress and audit logs from Se'kret Bip production. **No production Supabase, Workers, Pages, storage, sessions, emails or service-role bindings.**
- No real or derived user identity, messages, journals, voice, memories, teen/parent/Circle/Bridge/guardian information, prompts, analytics, or real-user training data may be transferred, even anonymized, hashed, embedded or aggregated for external customers.
- Inputs must be synthetic or explicitly generated test fixtures, validated server-side. A caller merely labeling a payload "synthetic" is not sufficient proof.
- Billing may retain only lawful, minimized business purchaser information; it must not include user content, app user identities or private app telemetry.
- Rate limits, tenant isolation, abuse monitoring, revocation, retention limits and synthetic-input validation must all be independently tested before launch.

## Execution boundary in this PR

- **security/ai-labyrinth-external-access.policy.json** defines the default-deny contract.
- **scripts/ai-labyrinth-license-boundary.mjs** is a **non-authorizing preflight**, not production middleware or an active license verifier. It rejects protected resources and caller-supplied proof. Even a correctly shaped sandbox request yields REVIEW_REQUIRED with permitsExecution=false. It accepts **no user payload**.
- **test/ai-labyrinth-external-access-contract.test.mjs** falsifies attempted payment, founder-identity, production and user-data bypasses using synthetic values.

## Separate activation gates

A later launch requires fresh, separately scoped founder approval plus verified organizational eligibility and an appropriate adult business operator where required; legal/privacy/IP review; service and network isolation; a server-side identity and signed/revocable entitlement design; a dedicated billing provider and credentials; synthetic-only validation and red-team tests; bounded costs; exact-head CI; Cloudflare/provider readback; denial and tenant-isolation tests; and a rollback/kill switch. No user-data connectivity may be introduced as a workaround. The PR must not silently become a live checkout, subscription, public endpoint or access expansion.

## Proof and rollback

Current proof: repository-only contract and local Node tests, where executed. **No production or payment-provider proof claimed.** The smallest rollback is reverting these new, unreferenced policy, helper, test and documentation files. No database schema or runtime routes change.
