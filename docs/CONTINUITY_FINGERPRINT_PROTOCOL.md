# Continuity Fingerprint Protocol

Purpose: make future founder shorthand resolvable without guessing, while preserving repository truth as authority.

## Resolution rule

Use shorthand as a retrieval signal, never as proof.

```text
founder shorthand
→ conversation/history fingerprints
→ candidate project
→ authoritative repository verification
→ action
```

For Se'kret Bip, high-signal fingerprints include: Bridge, parent links, teen/parent routes, private journal, safety-scan, Bip Jr., Suhana, Sy, Night, Cloud, Supabase teen/privacy boundaries, `sekret`/`sekret-backend`, `sekretbip.net`, and Playwright proof for user-facing flows.

If a fingerprint could belong to another project, verify the exact repo, branch, files, issue/PR, and current `main` before acting.

## Genesis fingerprint

When asked when this project started, do not infer genesis from the oldest visible chat. Resolve in this order:

1. GitHub repository `created_at`.
2. Root/first commit reachable from the authoritative history.
3. Earliest substantive product/build commit.
4. Historical docs that reference earlier work.
5. Earliest available conversation about the project.
6. Earlier uploaded designs, files, or artifacts.
7. Founder testimony, clearly labeled as founder-reported rather than GitHub proof.

Keep these clocks separate: idea genesis, repo genesis, first recorded build, first substantive build, launch/production milestones, and current state.

## Truth states

Always distinguish:

- VERIFIED: current evidence inspected directly.
- INFERRED: strong conclusion from fingerprints, not direct proof.
- REMEMBERED: prior context or decision that may need revalidation.
- UNKNOWN: evidence not recovered or not available.
- STALE: once true, but no longer authoritative without revalidation.
- BLOCKED: action cannot proceed safely because a required fact or authority is missing.

## Supersession and decay

A historical fix, approval, deployment, branch, screenshot, PR description, or conversation does not stay authoritative forever. If `main`, provider state, schema, runtime, or governing contract changed, revalidate before reusing the old conclusion.

Record what changed, what evidence supported the earlier state, what superseded it, and the new next gate.

## Reuse rule

Every correction should leave a reusable fingerprint so the same discovery cost is not paid twice. Prefer narrow retrieval by exact route, function, issue, error, commit, provider, or prior decision before broad repo scans.

This protocol supplements `AGENTS.md`, Founder Intelligence, repository truth docs, privacy/safety contracts, and approval gates. It never overrides a stricter rule or grants mutation authority by itself.
