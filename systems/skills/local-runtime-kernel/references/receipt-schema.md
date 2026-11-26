# Receipt schema

```json
{
  "claim": "Se'kret Bip signup works for a stranger on prod",
  "depth": "full",
  "slots": {
    "WHAT":  {"status": "PROVEN",    "evidence": ["playwright:trace-2026-10-03.zip"]},
    "WHERE": {"status": "PROVEN",    "evidence": ["https://example.prod/signup"]},
    "WHEN":  {"status": "PROVEN",    "evidence": ["sha:abc123", "deploy:gen-42"]},
    "HOW":   {"status": "CANDIDATE", "evidence": ["log:worker-tail.txt"]},
    "WHY":   {"status": "UNKNOWN",   "evidence": [], "causal": false}
  },
  "who": {
    "REQUESTED":  {"status": "PROVEN",  "actor": "juss", "identity": ["chat:msg"], "action": ["chat:msg"], "authority": ["founder"]},
    "AUTHORIZED": {"status": "PROVEN",  "actor": "juss", "identity": ["..."], "action": ["..."], "authority": ["..."]},
    "EXECUTED":   {"status": "PROVEN",  "actor": "claude-session", "identity": ["..."], "action": ["commit:abc123"], "authority": ["fix-branch only"]},
    "OBSERVED":   {"status": "UNKNOWN"},
    "VERIFIED":   {"status": "PROVEN",  "actor": "playwright-ci", "identity": ["..."], "action": ["..."], "authority": ["..."]},
    "DECIDED":    {"status": "UNKNOWN"}
  },
  "must": ["WHAT", "WHERE", "WHEN"],
  "prospective_authority": {"status": "PROVEN", "evidence": ["founder approved fix branch"]},
  "phase": "PROVE",
  "state": "VERIFIED"
}
```

Status values: `UNKNOWN`, `CANDIDATE`, `PROVEN`. Phases: `DECLARE, PERMIT, ATTEMPT, RECORD, PROVE, DECIDE`.
States: `VERIFIED, FAILED, UNKNOWN, RECONCILING, BLOCKED`.

Missing WHO roles default to UNKNOWN. `causal: true` on WHY means the evidence is a trace, diff, or
reproduction linking cause to effect — not timing alone.

## Receipt integrity and privacy (security review candidate)

Structural VERIFIED claims require a PROVE or DECIDE phase; the mandatory
WHAT, WHERE, and WHEN Must slots must be PROVEN with nonempty arrays
of nonblank evidence-reference strings. Every additional Must slot must also
be PROVEN. All PROVEN actors must have a nonblank actor plus nonempty
arrays for identity, action, and authority bindings. Prospective authority
requires the same evidence-array shape before phase PERMIT or later.
WHY.causal must be the actual JSON boolean true, not a truthy string.

SCHEMA_OK is **not** proof that referenced artifacts exist, were observed
on production, identify an authenticated founder, or authorize a merge.
Runtime and provider identity require independent readback. Proof cookies
here are evidence-only metadata bound to an exact repository/head/source
fingerprint; they are **not browser cookies**, authentication, consent,
cross-tenant identifiers, or deploy authority. The Se'kret Bip browser
cookie count remains zero under docs/COOKIE_AND_SESSION_CONTRACT.md.

This is a scoped repair to the exported review copy. The private canonical
workspace source must be reconciled separately before declaring the export
current; preserve exact SHA and source provenance rather than silently
promoting this proposal as canonical.

