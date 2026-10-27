# Se'kret Bip — Historical Dependency Audit

> **Historical snapshot generated 2026-06-08 against the former `jussray/Bip` repository and several pre-consolidation branches.** It is preserved as an audit trail, not current dependency guidance.

## What this audit found at the time

The original review identified:

1. unresolved conflict markers in a historical `package.json`;
2. major-version mismatches across five branches;
3. disagreement about the Expo SDK target;
4. branch subsets that would have dropped required dependencies if merged carelessly.

Those findings describe the repository state on 2026-06-08. They must not be repeated as current defects without checking the present `jussray/Sekret-Bip` `main` branch and exact lockfile.

## Current dependency source of truth

Use the current files:

- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `.github/workflows/type-check.yml`
- `.github/workflows/pre-push-checks.yml`

Validate with:

```bash
npm ci
npm run type-check
npm test
npm run lint
npm run verify:bundle
npm run verify:prepush
```

GitHub Actions on the exact PR head is the authoritative repository check. A historical branch comparison is not release evidence.

## Historical severity summary

| Status at audit time | Count |
|---|---:|
| major mismatch | 5 |
| minor mismatch | 3 |
| patch/range mismatch | 6 |
| only in one branch | 8 |
| consistent | 7 |

The original detailed matrix is intentionally not treated as a current upgrade plan. New dependency changes require a fresh audit against current `main`, Expo compatibility, native build constraints, and the full test matrix.
