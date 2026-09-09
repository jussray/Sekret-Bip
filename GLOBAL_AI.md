# Se’kret Bip Global AI Contract

## Parent and launch skills

This repository inherits the private canonical `juss-founder-os` contract from `jussray/founder-control-room`.

For splash PNG, invisible CTA, recognized login, onboarding resume, 72-hour founding preview, waiting-list, sponsor, launch analytics, or social-content work, load [`.agents/skills/bip-founding-preview/SKILL.md`](.agents/skills/bip-founding-preview/SKILL.md) in addition to every skill required by that file.

The project skill may become stricter, but it may not weaken founder authority, brand/IP protection, privacy, evidence, rollback, non-deletion, or truthfulness.

## Canonical repository

`jussray/Sekret-Bip` is the active Se’kret Bip working repository. Other Bip-named repositories are historical or investigate-only unless Founder Control Room explicitly names one for provenance capture. Do not direct active Bip implementation, merge, release, workflow, migration, or deployment work into those repos.

## Founder operating stack

This repository follows the shared founder operating stack:

```text
/elonmusk /garyvee lindymode redteam l99 redteam ooda /truthmode
```

Repeated `redteam` tokens are intentional.

1. **Elon/first-principles frame** — reduce the request to the physics of the product, bottleneck, leverage point, and unnecessary complexity to delete.
2. **GaryVee frame** — define the teen or parent value, real user outcome, communication path, and fastest truthful proof.
3. **Lindy screen** — prefer durable privacy boundaries, standard Expo/React Native/Supabase/Worker primitives, portable data, simple interfaces, and reversible changes.
4. **Redteam I: premise** — attack whether the feature should exist, whether it is safe for teens, whether consent and identity boundaries support it, and whether the evidence is real.
5. **L99 systems pass** — inspect identity, account side, trust, parent links, consent, state transitions, memory, provenance, routes, storage, RLS, Worker behavior, release gates, rollback, and long-term drift.
6. **Redteam II: plan** — attack the selected implementation for cross-user leakage, parent overreach, anonymous-identity failure, stale state, unsafe AI behavior, broken revocation, migration damage, deployment failure, and missing proof.
7. **OODA / truthmode** — re-observe, orient, decide one scoped path, act minimally, verify privacy and runtime behavior, separate fact from inference, and loop.

Do not collapse the two redteam passes. The first attacks the product premise. The second attacks the chosen implementation.

## Truth order

1. Repository, branch, migrations, deployed configuration, and runtime actually inspected.
2. Founder Control Room release-truth records, outage records, merge authority, Cloudflare evidence, and explicit cross-repo decisions.
3. Current tests, Playwright evidence, logs, schemas, RLS policies, RPCs, Worker responses, Cloudflare builds/deploys, and observed behavior.
4. Explicit founder decisions and approved product, privacy, identity, and safety records.
5. Current official provider documentation.
6. Prior summaries, generated plans, chat memory, and assumptions.

Never claim a feature, privacy boundary, migration, test, deployment, account state, parent link, AI capability, release status, or code failure exists without evidence.

## Infrastructure outage and release truth

GitHub Actions failures must be classified before they influence code conclusions:

- `runner_startup_failure`: runner/job startup failed before meaningful steps executed, especially no steps, no logs, or null log URLs.
- `workflow_no_jobs`: workflow schedules no jobs or is skipped before jobs exist.
- `workflow_step_failure`: at least one job executed steps and logs show a concrete failing command, assertion, build, lint, type, or Playwright step.

Never claim a code regression when GitHub jobs have no executed steps or logs. Zero-step/no-log failures are infrastructure evidence. They can still gate release truth when exact-head checks, Playwright, runtime, Cloudflare, or Control Room evidence is required.

Founder Control Room is the first authority for interpreting GitHub Actions incidents. Capture exact repository, PR, branch, head SHA, workflow, run, job evidence, classification, Cloudflare build/deploy status, runtime evidence, impact, and next gate.

Cloudflare build/deploy success is separate from GitHub Actions success. A runner outage is not app failure. A Cloudflare success is not proof that app, auth, data, privacy, Supabase, Worker, or Playwright gates passed.

## Bip Engineering OS proposal status

The root [`bip-os.md`](bip-os.md) and Control Room copy [`control-room/bip-os.md`](control-room/bip-os.md) are **non-authoritative proposal and checklist references**. Their location does not make either copy the repository constitution, current architecture map, sprint, roadmap, CODEOWNERS file, workflow configuration, release approval, migration authority, or implementation evidence.

- This global contract, `AGENTS.md`, Founder Control Room evidence, current repository paths, ordered migrations, runtime evidence, and explicit founder decisions outrank both proposal copies.
- Their `apps/mobile` and `packages/*` tree, reviewer handles, commands, workflows, coverage targets, and 30-day plan are illustrative unless they exist in the current repository and pass exact-head proof.
- Their example tag-triggered EAS, Cloudflare, and Supabase steps do not authorize builds, deployment, credentials, paid capacity, publishing, or database application.
- Any statement suggesting parents can see everything a teen sees is invalid. Parent visibility remains consent-based, minimized, relationship-scoped, revocable, and enforced by services, RPCs, RLS, storage, and route authorization.
- See [`docs/BIP_ENGINEERING_OS_STATUS.md`](docs/BIP_ENGINEERING_OS_STATUS.md) for the reconciliation boundary.

## Product boundaries

- Teen privacy outranks speed and convenience.
- Parent visibility is consent-based and relationship-scoped. It is not general surveillance.
- Bridge contains only content intentionally shared into the linked relationship.
- Circle and Bridge are separate systems.
- Anonymous public identity and private account identity must not bleed across contexts.
- Private journal text, Voice Bip transcripts, private companion chats, private memory, unshared messages, and general activity history must not appear on parent or public surfaces.
- Parent-link creation, acceptance, revocation, blocking, and visibility must be enforced by services, RPCs, RLS, storage, and route authorization, not UI hiding.
- AI companions are supportive and non-clinical. They do not diagnose, treat, replace therapy, or replace emergency support.
- Durable AI memory must not be described as implemented until its migrations, privacy rules, services, invalidation, deletion, and tests exist.

## Repository boundaries

- Expo Router route groups, Supabase migrations, Cloudflare Worker, app services, local storage, and tests each own distinct concerns.
- `supabase/migrations/` is the schema source of truth.
- Search for active importers before treating parallel screens, helpers, or services as canonical.
- Preserve the current working path while isolating or clearly marking future and deprecated work.
- The existing root `CLAUDE.md` is a verified design-system and Figma integration reference. This global contract governs cross-cutting product, security, provider, and execution behavior alongside it.

## Provider roles

- **Claude / Claude Code** — long-context repository analysis, focused implementation, design-system-aware changes, structured refactors, and documentation. Must read `CLAUDE.md`, `AGENTS.md`, and this file.
- **Codex / ChatGPT** — debugging, code review, tests, repository operations, data analysis, threat modeling, Playwright, CI triage, and founder-readable decisions. Tool evidence is required for claimed writes, tests, merges, or deployments.
- **OpenAI Platform** — server-side AI, voice, moderation, embeddings, or structured output behind secure, versioned Worker/service adapters.
- **Anthropic Platform** — server-side model capability behind secure, versioned adapters; conversation context is not durable teen or product memory.
- **Perplexity** — current public research and source discovery, not private repo, Supabase, Cloudflare, deployed-runtime, account, or release truth unless those systems are explicitly connected and inspected.
- **GitHub** — source, review, CI evidence, and rollback; merge is not deployment proof.
- **Supabase** — Auth, Postgres, RLS, Storage, RPCs, functions, and durable data boundaries.
- **Cloudflare Workers / Pages** — privileged AI, voice, authenticated API, Pages/Worker build and deploy evidence, and server-side integration boundary.
- **Expo / React Native** — application runtime and device behavior; preserve Expo Go unless a native requirement is explicit.

## Non-negotiable rules

- Inspect existing routes, services, migrations, policies, storage, Worker endpoints, types, tests, and active importers before adding another.
- Keep service-role keys, model keys, private prompts, teen content, parent content, tokens, and privileged calls off clients and logs.
- Do not weaken auth, route guards, RLS, RPC consent checks, storage policies, moderation, safety, types, tests, Playwright, or release gates to make CI green.
- Do not silently change identity contexts, account-side state, parent visibility, Bip IDs, anonymous handles, route contracts, storage keys, schemas, or deployment targets.
- Prefer small patches, existing Expo/Supabase/Worker capabilities, and canonical active paths over new abstractions.
- Preserve deletion, revocation, sign-out cache clearing, cross-device isolation, and second-user safety.
- Never delete Juss’s material without explicit authorization for that specific deletion.

## Merge authority

Merge when it is the correct evidence-backed integration step, not merely because a PR exists or a badge looks green.

A merge is appropriate only when repository, target branch, PR, and exact head SHA are verified; scope is focused; code/config/docs have been reviewed; required checks have genuinely executed and passed or a documented infrastructure outage is classified with sufficient remaining evidence; Playwright passed for changed user-facing web/runtime paths or is explicitly inapplicable; Founder Control Room and Cloudflare evidence were checked when release truth or deployment is involved; no unresolved critical review remains; privacy, security, brand/IP, credentials, user data, teen/parent boundaries, and rollback remain intact; and the merge itself does not silently execute a separately gated action.

## Separate approval gates

Require explicit founder approval before force-push, production deployment, rollback, auth/authorization/RLS/RPC/identity/parent-linking changes, destructive database/storage/cache/memory/migration operations, secret creation/rotation/deletion/exposure, domains/DNS/Worker names/app identifiers/signing/production environment changes, paid-service changes, expanding parent access or public identity exposure, sending external communications, or deleting Ray/Juss material.

An audit authorizes inspection, not mutation. Approval for one gate does not silently approve the next.

## Required report

1. Reality
2. Risk I: premise
3. L99 product and trust view
4. Decision
5. Risk II: selected plan
6. Action
7. Proof, including Playwright result or inapplicability and Founder Control Room/Cloudflare release truth where applicable
8. Rollback
9. Next approval gate

Teen privacy is not a feature flag to be rediscovered after launch. It is the architecture, inconveniently requiring actual enforcement rather than a reassuring sentence in a modal.
