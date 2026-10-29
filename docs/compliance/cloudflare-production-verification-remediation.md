# Cloudflare production verification — scoped credential recovery

## Observed on 2026-10-24 (current main at 55b5171c)
- Worker branch-authority audit: `CLOUDFLARE_WORKERS_BUILDS_API_TOKEN`
  was rejected by Cloudflare `/user/tokens/verify` (HTTP 400, code 6003).
- Pages branch-authority audit: `CLOUDFLARE_PAGES_READ_API_TOKEN`
  was missing from the Production environment.
- Public front-door audit: app-binding token transport was invalid.
- Production Smoke workflow reported green because its upstream verification
  job was skipped; browser tests did not execute.

## Repair boundary
These are provider credential/authority conditions, **not a reason to make
public-facing pages private or expose private application routes**.
Do not substitute a broad `CLOUDFLARE_API_TOKEN`, copy secrets to the repo,
bypass Cloudflare Access, or loosen a CI gate to obtain green checks.

The Cloudflare account owner must separately provision valid *read-only,
least-privilege* tokens for Worker Build and Pages authority audits, scoped to
the correct account and available to the GitHub **Production** environment,
and recheck the dedicated app-binding and Access read scopes. Do not print
token values. An account-prefixed token cannot be substituted where the
current Workers Build verifier requires an active user API token. Adjusting
token names without verifying their Cloudflare identity does not solve it.

Once credentials are available, reacquire exact-main Worker topology,
Pages project/production branch, Access policies, app hostname binding,
release marker, backend health, database proof and live browser proof.
No old success receipt transfers to a newer SHA.

A GitHub Pages `pages build and deployment` success concerns GitHub Pages;
it is **not** the canonical Cloudflare Pages release. The trusted production
path is `Verify Cloudflare Native Deployment` followed by a real
`Production Smoke` Playwright run. A skipped production verification must
now yield a *skipped* browser job, not a successful browser witness.

## Observed again on 2026-10-28 (merged main at 5879e21c)

The OpenAI-to-/makevideo PR #1217 merged successfully; its focused image-keyframe gate and Supabase PR migration replay passed. Post-merge GitHub failure runs are independent:

- Cloudflare Worker/Pages authority run `40800001834`: the dedicated Workers Builds token failed `/user/tokens/verify` (HTTP 400 / 6003); dedicated Pages read token was not configured.
- Cloudflare Zone Access run `40800001829`: dedicated Access token was missing and the dedicated app-binding token did not pass transport verification.
- Control Room ledger run `40800001827`: correctly failed because the above exact-main checks were red. Do not patch `assertLedgerMergeReady` to suppress these failures.

A read-only `Cloudflare User Token Preflight` workflow can now be dispatched on **main** under the **Production** environment. Its PR contract check never receives Production secrets. The operator preflight requires independent, valid read authority for these exact GitHub Production environment slots:

1. `CLOUDFLARE_WORKERS_BUILDS_API_TOKEN`: an *active user-scoped* Cloudflare API token with Workers scripts/builds read access (an account token is not a substitute).
2. `CLOUDFLARE_PAGES_READ_API_TOKEN`: dedicated Cloudflare Pages project read scope for `sekret-bip`.
3. `CLOUDFLARE_ACCESS_API_TOKEN`: dedicated zone-scoped Access applications/policies read access for the `sekretbip.net` zone.
4. `CLOUDFLARE_APP_BINDING_READ_API_TOKEN`: dedicated read scope for the zone and account Pages domains, Workers domains, and Workers routes.

The preflight is a **diagnostic**. Passing it proves scoped read probes only; it does not imply branch topology, DNS/Access policy compliance, production readiness, or a deploy. The production audits must still independently pass on current main.

The owner must provision the secrets through GitHub Settings > Environments > Production > Environment secrets, and verify token validity and least-privilege permissions in Cloudflare. Never put values in GitHub issues, PRs, logs, docs, snippets, or ChatGPT.

After credential restoration:
- Dispatch **Cloudflare User Token Preflight** from `main`.
- Dispatch **Audit Cloudflare Worker and Pages Branch Authority** and **Audit Cloudflare Zone Access Coverage** from current `main`.
- Confirm exact-main provider-backed receipts, then dispatch **Control Room Test Ledger**. Existing failed runs are historical and must not be relabeled green. A new passing run is not proof of external-state movement unless the specified separate runtime-state evidence exists.
- Independently confirm Cloudflare deployment, real production smoke/browser proof, Supabase target and release marker. Supabase `ACTIVE_HEALTHY` only proves project health; it is not a claim that all security advisor findings are resolved.

Do not substitute a broad token, weaken the gate, or rotate tokens as part of a source-code PR. The provider-account secret restoration cannot be performed by this repository diff.
