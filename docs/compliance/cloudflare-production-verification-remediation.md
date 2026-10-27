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
