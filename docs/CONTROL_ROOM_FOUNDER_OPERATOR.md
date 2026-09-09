# Founder Control Room Operator

## Purpose

Founder Operator turns one founder mission into an evidence-backed program of work. It combines three operating modes:

- **ULTRATHINK:** inspect the real system, dependencies, lifecycle, privacy boundary, and hidden failure modes before activity begins;
- **Bill Gates Artifacts:** create durable contracts, ownership, acceptance criteria, evidence paths, rollback notes, and phase summaries that compound instead of disappearing into chat;
- **Elon Musk Execution:** identify the highest-leverage bottleneck, remove it with the smallest reversible slice, and verify the real path before claiming completion.

It is a founder-only coordination surface. It is not a teen or parent feature, a second application, a general shell, or an autonomous authority layer.

## Flow

1. The founder writes the mission and preserved constraints.
2. Control Room creates an append-only local mission history.
3. The planning engine generates:
   - a 5W1H mission brief;
   - a system and dependency map;
   - a red-team risk register;
   - a durable artifact ledger;
   - a first-principles bottleneck map;
   - applicable code, design, data, release, or communication artifacts;
   - a verification report;
   - a founder decision pack.
4. Each artifact receives one owner lane, support lanes, evidence requirements, a path hint, a status, and an approval gate when needed.
5. The founder may run only the existing allowlisted local missions from applicable phases.
6. When the authenticated loopback agent is online, the plan can be persisted to fixed local evidence paths.
7. Human-only actions remain blocked until the founder explicitly approves them outside the planning engine.

## Evidence paths

The UI keeps append-only history under:

```text
control-room:founder-operator:plans:v1
```

The authenticated loopback server may write plans only under:

```text
reports/control-room/founder-operator/<plan-id>.json
reports/control-room/founder-operator/latest.json
```

The browser cannot choose another filesystem path. A repeated plan ID creates a new `-vN` history file instead of overwriting the earlier record. `latest.json` is a pointer-style snapshot and never replaces the versioned history files.

## Lane contract

- **Founder:** mission, tradeoffs, approvals, and final truth.
- **Codex:** repository integration, narrow implementation, tests, and pull-request evidence.
- **ChatGPT:** mission synthesis, operating plan, debugging, and founder-readable decisions.
- **Claude:** long-context architecture and implementation review.
- **DeepSeek:** bounded adversarial second opinion, never a second active writer.
- **Figma and Canva:** editable design and visual artifacts when a real connector is authorized.
- **Supabase and Cloudflare:** approved server-side and deployment actions through their own permission boundaries.
- **GitHub and Playwright:** exact-head and browser evidence.
- **Gmail:** founder-approved external communication.
- **Local Agent:** only the existing allowlisted local missions.

A lane appearing in a plan does not prove that its adapter is installed, authenticated, available, or authorized.

## Human-only gates

Founder Operator cannot silently:

- merge or close a pull request;
- deploy or change production routing;
- apply, roll back, or mutate a database migration;
- spend money or change a paid plan;
- send, publish, or schedule external communication;
- create or connect an external account;
- use, rotate, or expose credentials or secrets;
- delete, overwrite, or irreversibly transform user or repository data.

Marking an artifact reviewed updates the local operating ledger only. It does not execute the external action represented by that artifact.

## Privacy and input boundary

Founder Operator accepts project instructions and operating constraints only. Do not paste raw teen or parent transcripts, journal entries, private messages, passwords, tokens, service-role keys, or other private user content.

The loopback persistence endpoint rejects:

- blocked private-content and secret field names after case and separator normalization;
- credential-shaped content;
- oversized or malformed payloads;
- invalid, unknown, or internally inconsistent plan schemas;
- approval-gated artifacts or phases falsely marked verified;
- `exact-head` or `deployed-observation` claims that this local endpoint cannot verify;
- arbitrary, traversing, or backslash-based artifact paths;
- symlinked report directories or `latest.json` targets.

Version files use exclusive creation so concurrent or repeated writes cannot replace earlier history. The mutable `latest.json` convenience snapshot is replaced atomically only after its existing target is proven to be a regular file.

## Safe execution

The Operator surface may call only these existing mission IDs:

```text
continue-yesterday
verify-local
verify-frontend
recover-system
```

Free-form founder text never becomes a shell command. The planning engine does not add a dynamic command endpoint.

## Truth levels

- `plan-only`: the artifact plan exists.
- `local-evidence`: an allowlisted local verification mission actually passed.
- `exact-head`: exact GitHub head checks executed and passed.
- `deployed-observation`: the intended deployed path was observed with retained evidence.

The current first slice can generate and persist plans and collect local evidence. It must not claim exact-head or deployed observation without those separate proofs.

## Verification

Run at minimum:

```bash
node --check scripts/control-room-server.mjs
node --test test/control-room-founder-operator.test.mjs test/control-room-founder-operator-server.test.mjs
npm run type-check
npm test
```

Use Playwright to verify the founder-only route, mission generation, history selection, status changes, agent-offline state, plan persistence, and narrow-screen switcher when browser execution is available.