#!/usr/bin/env bash
# =============================================================================
# demo-check.sh — Se'kret Bip Demo Readiness Validator
# Run before ANY demo, investor meeting, or launch event.
# Usage: bash scripts/demo-check.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() { echo -e "${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}✗${NC} $1"; ((FAIL++)); }
warn() { echo -e "${YELLOW}⚠${NC} $1"; ((WARN++)); }
header() { echo -e "\n${BLUE}▶ $1${NC}"; }

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║   Se'kret Bip — Demo Readiness Check         ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 2: Secrets audit ────────────────────────────────────────────
header "Step 2 — Production Secrets Audit"
if command -v wrangler &>/dev/null; then
  SECRETS=$(wrangler secret list --name sekret-backend 2>/dev/null || echo "ERROR")
  if echo "$SECRETS" | grep -q "OPENAI_API_KEY"; then
    pass "OPENAI_API_KEY is set in production"
  else
    fail "OPENAI_API_KEY is MISSING from production Worker — AI features will fail"
  fi
  if echo "$SECRETS" | grep -q "SEKRET_CLIENT_TOKEN"; then
    pass "SEKRET_CLIENT_TOKEN is set in production"
  else
    warn "SEKRET_CLIENT_TOKEN not found — /api/* routes may be fail-open"
  fi
else
  warn "wrangler not found — skipping secrets audit (run: npm i -g wrangler)"
fi

# ── Step 3: Live deployment health checks ────────────────────────────
header "Step 3 — Live Deployment Health"

WORKER_URL="https://sekret-backend.mcgill-raylene.workers.dev/health"
CUSTOM_URL="https://api.sekretbip.net/health"
RELEASE_URL="https://sekretbip.net/release.json"

check_url() {
  local url="$1" label="$2"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    pass "$label → HTTP $status"
  elif [ "$status" = "000" ]; then
    fail "$label → UNREACHABLE (timeout or DNS failure)"
  else
    fail "$label → HTTP $status"
  fi
}

check_url "$WORKER_URL" "Worker health (.workers.dev)"
check_url "$CUSTOM_URL" "Worker health (api.sekretbip.net)"
check_url "$RELEASE_URL" "Pages release marker"

# Verify commit SHA matches
if command -v jq &>/dev/null; then
  REMOTE_SHA=$(curl -s --max-time 10 "$RELEASE_URL" 2>/dev/null | jq -r '.commitSha // .commit // empty' 2>/dev/null || echo "")
  LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
  if [ -n "$REMOTE_SHA" ] && [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
    pass "Deployed commit matches local HEAD ($REMOTE_SHA)"
  elif [ -n "$REMOTE_SHA" ]; then
    warn "Deployed commit ($REMOTE_SHA) differs from local HEAD ($LOCAL_SHA) — may be expected if CI is still running"
  else
    warn "Could not read commit SHA from release.json — verify manually"
  fi
fi

# ── Step 4: Code quality gates ───────────────────────────────────────
header "Step 4 — Code Quality Gates"

run_check() {
  local cmd="$1" label="$2"
  if npm run "$cmd" --silent 2>/dev/null; then
    pass "$label"
  else
    fail "$label — fix before demo"
  fi
}

run_check "type-check" "TypeScript type-check"
run_check "lint" "ESLint"

if npm run test --silent 2>/dev/null; then
  pass "Unit tests"
else
  warn "Unit tests failed or not configured"
fi

# ── Step 5: Custom domain status ─────────────────────────────────────
header "Step 5 — Custom Domain (api.sekretbip.net)"

CUSTOM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://api.sekretbip.net/health" 2>/dev/null || echo "000")
if [ "$CUSTOM_STATUS" = "200" ]; then
  pass "api.sekretbip.net is live and routing correctly"
else
  warn "api.sekretbip.net not yet live (HTTP $CUSTOM_STATUS) — add custom domain in CF Dashboard:"
  warn "  Workers & Pages → sekret-backend → Settings → Triggers → Custom Domains → api.sekretbip.net"
fi

# ── Final Summary ─────────────────────────────────────────────────────
echo -e "\n${BLUE}══════════════════════════════════════════════${NC}"
echo -e "Results: ${GREEN}$PASS passed${NC} · ${YELLOW}$WARN warnings${NC} · ${RED}$FAIL failed${NC}"
if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}✗ NOT demo-ready. Fix $FAIL failing check(s) above.${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}⚠ Demo-ready with $WARN warning(s). Review before investor meeting.${NC}"
  exit 0
else
  echo -e "${GREEN}✓ DEMO READY. All checks passed.${NC}"
  exit 0
fi
