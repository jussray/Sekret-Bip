# bip-sekret-identity

## 5W1H operating contract

Before planning, editing, or claiming completion, establish and state:

- **Who** — the requester, decision owner, affected users, data subjects, and execution authority.
- **What** — the requested outcome, concrete deliverable, non-goals, and existing work that must be preserved.
- **Where** — the exact repository, branch, environment, runtime, route, service, table, or provider boundary involved.
- **When** — the current lifecycle or release state, required ordering, timing constraint, and rollback window.
- **Why** — the user problem and verified evidence that justify the work.
- **How** — the smallest safe implementation, required permissions, verification evidence, rollout, and rollback.

Inspect repository and runtime truth for unknowns. Ask the user only when a missing answer would materially change the safe solution or authority. Re-run 5W1H after red-team/OODA findings change the plan. Finish by mapping the result, evidence, remaining blocker, and next owner back to these six questions.


## Trigger

Activate whenever work touches:

- visible AI or companion names;
- reply headers, bubbles, loading states, notifications or archives;
- accessibility labels;
- companion pickers or avatar grids;
- Oracle discovery, reasoning or continuity context;
- TTS input, voice labels or spoken introductions;
- analytics or logs that contain identity labels.

## Identity contract

```text
Oracle = internal reasoning only
Se'kret = visible continuity and relationship presence
Raylene / Rylane / Cloud / Night = named companions
```

Oracle must never appear to a teen or parent. Se'kret is not Raylene and is not
a fifth selectable companion.

The canonical contract is:

```text
src/features/sekret/identityContract.ts
```

## Required type separation

Use:

```text
NamedCompanionId = raylene | rylane | cloud | night
PresenceStyleId  = NamedCompanionId | sekret
Internal reasoner = oracle
```

Legacy normalization may accept `oracle` or `sekret`, but visible Oracle output
must resolve to Se'kret. Unknown internal identity must fail closed to Se'kret,
not silently fall back to Raylene.

## Required checks

- Use `resolveVisibleIdentity()` when an internal identity becomes visible.
- Use `getVisibleIdentity()` for a direct Se'kret label.
- Use `assertNoOracleLeak()` in tests and development validation paths.
- Use `isSekretVisibleSurface()` only for surfaces where Se'kret should appear.
- Use `shouldSuppressSekretIdentity()` for companion-selection surfaces.
- Keep `sekret` out of named companion picker arrays.
- Keep `oracle` out of screen text, accessibility, TTS, notifications and errors.
- Preserve the named companion's own label when that companion is speaking.

## Current migration warning

Existing runtime files may still use broad legacy types that include `sekret` as
a companion-like identifier. Do not claim the repository is fully migrated until
the actual screens, reply path, archives, accessibility labels and TTS use the
canonical contract and the identity audit passes.

Do not delete legacy code inside an unrelated contract PR. Inventory and adapt
it in a scoped runtime-activation PR.

## Automatic failure examples

```text
Oracle is typing…
Talk to Oracle
const fallbackName = 'Raylene' // for oracle or sekret
const picker = ['raylene', 'rylane', 'cloud', 'night', 'sekret']
```

## Required evidence

- focused identity contract tests;
- repository search showing no newly introduced visible `Oracle` strings;
- Companion Lab or equivalent candidate-reply check;
- text and TTS identity consistency proof when voice is touched;
- privacy review for logs and analytics.

## Required with

- `bip-repo-truth`
- `bip-companion-lab`
- `bip-privacy-redteam`
- `bip-release-gate`
