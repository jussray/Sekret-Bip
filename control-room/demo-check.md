# Demo Readiness Runbook

This document describes the `scripts/demo-check.sh` script and what each check means.
Run this before every investor demo, App Store submission, or press event.

---

## How to run

```bash
bash scripts/demo-check.sh
```

Expected output when all systems are green:

```
▶ Step 2 — Production Secrets Audit
✓ OPENAI_API_KEY is set in production
✓ SEKRET_CLIENT_TOKEN is set in production

▶ Step 3 — Live Deployment Health
✓ Worker health (.workers.dev) → HTTP 200
✓ Worker health (api.sekretbip.net) → HTTP 200
✓ Pages release marker → HTTP 200
✓ Deployed commit matches local HEAD

▶ Step 4 — Code Quality Gates
✓ TypeScript type-check
✓ ESLint
✓ Unit tests

▶ Step 5 — Custom Domain
✓ api.sekretbip.net is live and routing correctly

══════════════════════════════════════════════════
Results: 9 passed · 0 warnings · 0 failed
✓ DEMO READY. All checks passed.
```

---

## What each check verifies

| Step | Check | Why it matters for demo |
|------|-------|------------------------|
| 2 | `OPENAI_API_KEY` in production secrets | Without this the AI companion returns a 401 silently |
| 2 | `SEKRET_CLIENT_TOKEN` in production | Auth gate for all Worker endpoints |
| 3 | Worker health `.workers.dev` | Baseline Cloudflare deploy is live |
| 3 | Worker health `api.sekretbip.net` | Custom domain TLS is provisioned |
| 3 | Pages release marker | Web demo shell is deployed |
| 3 | Commit SHA match | No stale deploy — what you demoed in dev is what's live |
| 4 | TypeScript type-check | No type regressions snuck in |
| 4 | ESLint | No lint errors that would embarrass a code review |
| 4 | Unit tests | Core logic is not broken |
| 5 | `api.sekretbip.net` curl | End-to-end DNS + TLS + Worker routing confirmed |

---

## Failure playbook

### `api.sekretbip.net` returns 000 or 404
```bash
# Check Cloudflare custom domain provisioning status
wrangler pages deployment list
# If domain shows "pending", wait 2 min and retry
```

### `SEKRET_CLIENT_TOKEN` missing
```bash
wrangler secret put SEKRET_CLIENT_TOKEN
# Paste token value, press Enter
```

### Commit SHA mismatch
```bash
# Force redeploy
wrangler deploy --env production
```

### Type-check fails
```bash
npm run type-check 2>&1 | head -40
# Fix errors, commit, re-run demo-check
```

---

## Pre-demo checklist (humans, not scripts)

- [ ] Run `bash scripts/demo-check.sh` — all green
- [ ] Open app on a physical device (not simulator)
- [ ] Send one message to Raylene — response arrives in < 3s
- [ ] Parent bridge notification fires correctly in test mode
- [ ] App does not crash on back-navigation from companion screen
- [ ] Battery on demo device > 80%
- [ ] Demo device on WiFi, not cellular
- [ ] Screen recording disabled (no red dot in status bar)
- [ ] Do Not Disturb enabled on demo device

---

*Last updated: July 2026 — bip-os.md v1.0*
