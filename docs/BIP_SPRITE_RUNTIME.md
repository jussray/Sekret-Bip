# Se’kret Bip · Governed Sprite Proof Runtime

**Purpose:** isolated, founder-initiated repository verification. Not an app feature, companion character, or public API.

- Runtime: `sekret-bip-governed-proof`, a private administrator-only Sprite separate from Founder Control Room.
- Source: exact-sha, public `jussray/Sekret-Bip` repository checkout.
- Network: **deny-all** at rest and during proof runs. A temporary GitHub-only read exception can be approved for a repository fetch and must be removed and reread immediately afterward.
- No production Supabase, Cloudflare, GitHub write token, teen/guardian records, prompts, personal data, or active user sessions enter the Sprite.
- Caller must supply an exact 40-character commit SHA. The runner verifies the checked-out commit first.
- Fixed missions only: `repo-truth`, `agent-contract`, `companion-contract`. Arbitrary shell and user-supplied paths are prohibited.
- Kill switch: `FOUNDER_OPERATION_KILL_SWITCH=all` denies operation before spawning any command.
- Receipts: local `/home/sprite/.sprite-proof/receipts/<sha>-<mission>.json`. Record result, output hash, timestamps, and no mutation authority. Do not copy private logs or tokens into GitHub.
- Proof receipts are informational. They never approve merges, deployments, provider calls, or family-data access.
- Scope: this is repository-proof compute only. It is not enabled for production teen interaction or guardian workflows.

## Founder-only invocation

Inside the private Sprite after an authorized source sync:

```bash
node scripts/bip-sprite-proof.mjs --mission repo-truth --sha "$(git rev-parse HEAD)"
node scripts/bip-sprite-proof.mjs --mission agent-contract --sha "$(git rev-parse HEAD)"
node scripts/bip-sprite-proof.mjs --mission companion-contract --sha "$(git rev-parse HEAD)"
```

## Deployment and incident gates

Do not make the Sprite an internet-accessible webhook, run continuously, or give it production credentials. The GitHub workflow validates the **repository contract**, not the external Sprite's live state. Production use, remote triggering, and GitHub secret configuration require a separate approval and verified secure channel.

For PR #615, this integration does not resolve historic merge conflicts, Cloudflare token/permission failures, or Supabase Preview's migration-lineage mismatch. Never mark that PR green from these receipts.

## Rollback

Revert only the Sprite runner/policy/workflow/docs commit in the repository and restore or retire the private Sprite through its administrator controls. A known-good Sprite checkpoint is retained. No Supabase or Cloudflare production state must be changed.
