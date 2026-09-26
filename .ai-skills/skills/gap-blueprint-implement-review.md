# Gap → Blueprint → Rent → Implement → Review → Merge Gate → Continue

Use this skill when the founder asks for `/gaps`, `/blueprint`, `/rent`, `/implement`, `/review`, `/merge`, `/cont`, or a stacked command such as:

```text
/gaps find them /blueprint the fixes /rent what already works /implement /review /merge /cont
```

The goal is not to generate a large plan. The goal is to identify the smallest verified blocker, reuse proven mechanics, ship the smallest reversible repair, prove the exact head, and continue without stale authority or false success.

## Always-on truth contract

- Read the authoritative repository, branch, PR, exact head SHA, current `main`, issue/Founder Control Room authority, external provider state, checks, jobs, steps, logs, and review evidence before judging the work.
- Label claims `VERIFIED`, `INFERRED`, `UNKNOWN`, or `BLOCKED`.
- A failed lookup is `UNKNOWN`, never verified absence.
- Missing workflow runs are `UNKNOWN`, not `workflow_no_jobs`.
- Never claim a code regression without an executed failing step and logs.
- Never claim changed rendered behavior without current Playwright or device proof.
- Never treat preview, repository, provider, database, deployment, browser, device, and founder-decision evidence as interchangeable.
- Do not mutate production unless the exact authority layer explicitly permits it.
- Preserve the smallest reversible scope. Do not mix unrelated repairs to make the queue look smaller.
- Leave existing documentation alone unless the implementation makes it false.

## 1. GAPS — inspect before judging

Read current authority first. Build a gap ledger containing:

- expected behavior or proof;
- observed evidence and exact source;
- classification: `VERIFIED`, `INFERRED`, `UNKNOWN`, or `BLOCKED`;
- exact authority layer: code, CI, provider, database, deployment, browser, device, or founder decision;
- human impact and safety risk;
- smallest next proof or repair.

Stop broad discovery when one smallest actionable blocker is verified. Do not keep collecting findings merely to make the report look exhaustive.

## 2. BLUEPRINT — define the minimum safe work order

Write one work order using:

```text
REALITY
GAP
FIX
PROOF
RISK
ROLLBACK
NEXT GATE
```

Requirements:

- `REALITY` names the authoritative repository, base, PR/branch, and immutable SHA.
- `GAP` contains one verified blocker, not a bundle of unrelated concerns.
- `FIX` is the smallest reversible patch that repairs the proven layer.
- `PROOF` names exact tests, Playwright flows, provider read-back, database checks, or controlled account/device evidence.
- `RISK` states what can still fail and what remains intentionally out of scope.
- `ROLLBACK` gives the exact revert or restoration path.
- `NEXT GATE` names the authority required after this patch.

## 3. RENT — reuse proven mechanics, not copied cargo

Before inventing a new mechanism, search in this order:

1. a current repository pattern that already passes;
2. an adjacent owned repository with the same governed contract;
3. official framework or provider guidance;
4. a mature, widely adopted open-source pattern with a compatible license and threat model.

Record:

- the source pattern;
- why it is trustworthy for this exact authority layer;
- what was adapted;
- what was rejected because it weakens privacy, authorization, accessibility, rollback, or evidence truth.

Rent the mechanic, not its branding, assumptions, secrets, private data, proprietary assets, or stale generated code.

## 4. IMPLEMENT — ship the smallest reversible slice

- Start from exact current `main` or prove why a different base is authoritative.
- Use a focused branch with a compliant name.
- Touch only files required by the work order.
- Add a focused regression contract that fails if the gap returns.
- Preserve valid typed/data-layer `null` contracts.
- Convert meaningful human-facing absence into a truthful loading, empty, denied, degraded, error, or recovery state.
- For database changes: pin search paths, restrict grants, preserve existing durable choices, prove rollback, and separate repository proof from production application.
- For rendered behavior: preserve the design language, accessibility names, reduced-motion behavior, touch targets, routing, auth, consent, and privacy boundaries.

## 5. VERIFY — prove the immutable final head

Require applicable exact-head evidence:

- repository truth and branch hygiene;
- focused unit or contract tests;
- type and lint checks;
- Playwright or device proof for changed rendered behavior;
- provider/database read-back for external authority;
- populated jobs, executed steps, and logs;
- retained artifacts or receipts when available.

Classify GitHub Actions failures precisely:

- `runner_startup_failure`: an actual job exists, but meaningful steps or logs never started;
- `workflow_no_jobs`: an actual workflow run exists, but it has no jobs;
- `workflow_step_failure`: a specific executed step failed, with logs when available.

Zero-step, `steps: null`, and no-log evidence never proves a code regression.

## 6. REVIEW — red-team the final head

Inspect:

- exact diff and file scope;
- stale-base and overlapping-PR risk;
- unresolved review threads;
- authorization, privacy, consent, RLS, secret, and role-escalation paths;
- false success, misleading readiness, blank state, inaccessible control, and missing recovery paths;
- production, database, or provider claims that exceed evidence;
- rollback viability.

A green suite does not override an unresolved authority, safety, or product-design blocker.

## 7. MERGE GATE — authorize nothing by implication

Merge only when every applicable condition is `VERIFIED`:

- the final head is current with the intended base;
- required checks genuinely executed and passed;
- blocking review threads are zero;
- Product Design proof exists for changed rendered behavior;
- database/provider/production gates are complete or explicitly separated from repository merge authority;
- rollback is preserved;
- founder or governed merge authority is explicit.

If any required condition is `UNKNOWN` or `BLOCKED`, keep the PR draft/open and state the exact next gate. Never merge merely because GitHub reports `mergeable: true`.

## 8. CONTINUE — OODA without re-deriving

After a merge or hold:

1. **Observe:** reread current `main`, open PRs, issues, external state, and retained evidence.
2. **Orient:** compare the new truth with the gap ledger and authority hierarchy.
3. **Decide:** choose the next smallest reversible move.
4. **Act:** execute only within authorization.
5. Audit the resulting exact head and repeat.

Notify the founder only when:

- a failure is new;
- a failure changes classification;
- current `main` changes;
- or the actionable next step changes.

## Required report shape

```text
REALITY
GAPS
BLUEPRINT
RENTED PATTERN
IMPLEMENTATION
PROOF
RED-TEAM REVIEW
RISK
ROLLBACK
MERGE GATE
NEXT
```

## Stop conditions

Stop and report instead of mutating when:

- the authoritative repository or exact head cannot be read;
- the required provider, database, browser, device, or founder authority is unavailable;
- the patch would mix unrelated risks;
- a production mutation lacks explicit approval;
- executed evidence contradicts the proposed repair;
- the final head changes after verification and before merge.
