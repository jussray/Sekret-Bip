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
- internal honor/reasoning identities or continuity context;
- TTS input, voice labels or spoken introductions;
- analytics or logs that contain identity labels.

## Identity contract

```text
Suhana / Sy / Cloud / Night = the only user-facing companion identities
Joseema / Se'kret = internal honor identities only
oracle = legacy compatibility key for the Joseema internal lens
```

Internal honor identities may influence runtime reasoning and style, but they are
not companions and must never become selectable, displayable, spoken, or client-
serialized identities.

The canonical contract is:

```text
src/features/sekret/identityContract.ts
```

The Se'kret product/brand name may still appear where the product itself is being
named. That does not create a user-facing Se'kret companion persona.

## Required type separation

Use:

```text
NamedCompanionId      = suhana | sy | cloud | night
InternalHonorIdentity = joseema | sekret
Legacy internal key   = oracle
```

Legacy normalization may accept `oracle`, but it must resolve only inside the
runtime to the Joseema internal lens. `sekret` resolves to the separate Se'kret
internal lens. Neither may resolve to a public companion display label.

Unknown internal identity values fail closed to no display identity, never to a
named companion and never to an internal name.

## Internal identity privacy boundary

Internal honor identities must not cross into:

- companion pickers or avatar grids;
- companion chat headers or reply labels;
- typing/loading labels;
- TTS identity metadata or spoken introductions;
- notifications or accessibility labels;
- archives rendered as companion identity;
- public/client `actorId` or `characterId` response metadata;
- routine client-derived telemetry identity fields.

The runtime may use a generic marker such as `internal-presence` or a generic
style version for evidence. That marker must not reveal which internal honor
identity was applied.

Internal honor identities must never be used to impersonate a real person,
claim messages from a real person, invent memories, or state what a real person
would think, want, approve, or say.

## Required checks

- `resolveVisibleIdentity()` returns labels only for named companions.
- `resolveInternalHonorIdentity('oracle')` resolves to the Joseema internal lens.
- Joseema and Se'kret remain distinct internal lenses.
- `assertNoOracleLeak()` protects legacy compatibility leakage.
- `shouldSuppressInternalIdentity()` covers every user-facing identity surface.
- Keep `joseema`, `sekret`, and `oracle` out of named companion picker arrays.
- Keep internal identities out of reply/voice client metadata.
- Preserve the named companion's own label when that companion is speaking.
- Preserve old stored IDs where compatibility is required; do not mutate user data merely to rename a runtime concept.

## Current migration warning

Existing runtime files may still use broad legacy types that include `sekret` as
a companion-like identifier. Do not claim the repository is fully migrated until
the actual screens, reply path, archives, accessibility labels, TTS, tests, and
identity audit use the canonical contract.

Do not delete legacy persisted data inside an identity-contract change. Adapt
read/runtime boundaries and leave historical records intact unless a separately
approved migration proves deletion or rewrite is necessary.

## Automatic failure examples

```text
Oracle is typing…
Talk to Oracle
Joseema replied
Se'kret replied // when used as a companion identity rather than the product name
const picker = ['suhana', 'sy', 'cloud', 'night', 'sekret']
return { actorId: 'sekret' } // for an internal-honor reply
```

## Required evidence

- focused identity contract tests;
- runtime tests proving internal identity is applied but not serialized;
- repository search showing no newly introduced visible internal-identity strings;
- Companion Lab or equivalent candidate-reply check;
- text and TTS identity consistency proof when voice is touched;
- user-visible Playwright for picker/header changes;
- controlled API Playwright for internal runtime compatibility when credentials are available;
- privacy review for logs and analytics.

## Required with

- `bip-repo-truth`
- `bip-companion-lab`
- `bip-privacy-redteam`
- `bip-release-gate`
