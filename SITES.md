---
schema: juss/chatgpt-sites-repository-binding@v1
project_id: sekret-bip
canonical_repository: jussray/Sekret-Bip
canonical_branch: main
authority_repository: jussray/founder-control-room
site_identity_status: verified
site_origin: https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site
site_role: control-room-audit
account_owner: unverified
chatgpt_site_url: https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site
custom_domain: null
control_room_link: https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site/control-room
last_verified: "2026-09-06"
verification_source: "Founder Control Room bridge repository evidence; editor-account/custom-domain/live publication readback pending"
continuity_status: UNKNOWN
---

# ChatGPT Sites repository binding — Se’kret Bip

This file defines the repository-side contract for the verified Se’kret Bip ChatGPT `@Sites` control-room/audit surface. It does not make that Site the production app, Cloudflare authority, Supabase authority, or Founder Control Room authority.

## Cross-account continuity

The frontmatter is the repository-side continuity record for this Site. `account_owner` identifies only a verified editor-account binding and must not expose private account-holder identity. `chatgpt_site_url`, `custom_domain`, `control_room_link`, `last_verified`, and `verification_source` must come from the authority that can actually observe them. `continuity_status` is one of `VERIFIED`, `UNKNOWN`, `STALE`, or `SUPERSEDED`.

Unknown stays unknown. Chat memory, another phone/account, a naming convention, DNS intent, or a repository guess must never upgrade an unverified field. The Site editor/account is authoritative for Site identity/publication, the canonical repository for project/source truth, Cloudflare for DNS/deployment truth, and Founder Control Room for cross-project authority/evidence registry truth.

## Canonical source

The Site must treat `jussray/Sekret-Bip` as the only active canonical Se’kret Bip working repository and resolve current `main` at use time. Historical or alternate Bip-named repositories, Site snapshots, screenshots, design artifacts, old PRs, and chat memory cannot replace current repository/provider/runtime evidence.

Before material planning, editing, publication, deployment, cross-repository coordination, or a current-state claim, read and apply the current versions of:

- `AGENTS.md`
- `AGENTS_FOUNDER_INTELLIGENCE.md`
- `GLOBAL_AI.md`
- `docs/CURRENT_STATUS.md`
- `docs/TRUTH_AUTHORITY.md`
- `docs/CLOUDFLARE_OWNERSHIP.md`
- `docs/CONTINUITY_FINGERPRINT_PROTOCOL.md`
- `docs/COOKIE_AND_SESSION_CONTRACT.md`
- `.agents/skills/founder-dev-flow/SKILL.md`
- `.agents/skills/bip-repo-truth/SKILL.md`
- `.control-room/plugin-management.json`
- `.control-room/repository.manifest.json`

Stricter Se’kret Bip teen privacy, consent, safety, dignity, anti-surveillance, auth, RLS, parent/teen, rollback, release-truth, and non-deletion rules always win.

## Verified Site identity

Repository evidence in `jussray/founder-control-room` currently identifies the peer Site origin as:

`https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site`

with a control-room path at `/control-room` and a Site-side manifest path at `/api/control-room-link`.

That identity is a bounded control-room/audit Site. It is not the production Se’kret Bip frontend at `app.sekretbip.net`, not the Cloudflare Pages project identity, and not proof of the currently deployed app release.

## Read contract

The Site may read repository material needed for the bounded project/control-room experience only after resolving the canonical repository, current head, and required authority files.

It must keep these evidence layers separate: repository, CI, Cloudflare Pages/Workers, Supabase, browser, controlled account, device, and design/prototype evidence. A green layer never silently proves another.

The Site must never ingest or expose journal text, voice recordings/transcripts, private messages, Circle content, teen or parent names, email addresses, private family data, safety content, Supabase service-role material, OpenAI keys, raw database rows, or other high-sensitivity product data merely to render project status.

## Write contract

The Site may prepare repository-backed changes only through a focused branch and pull request created from freshly resolved `main`.

It must never push ordinary implementation directly to `main`, force-push, delete founder or user material, bypass auth/RLS/privacy gates, broaden parent visibility, change identity rules, or use a Site command/string as authority.

A repository write or merge never silently authorizes Cloudflare deployment, Supabase migration, auth/RLS changes, Worker routes/bindings, secrets, DNS, billing, public communication, or another separately gated action.

## Existing Founder Control Room bridge

The existing FCR bridge intentionally keeps authority asymmetric:

- Founder Control Room: `approve`, `execute`
- Se’kret Bip Site: `observe`, `request`

Preserve that boundary. The Site must not promote itself from observer/requester into execution authority.

## Site publication contract

A Site edit/publication must bind to the intended exact repository state, re-read this Markdown authority chain, and capture an observable Site artifact after publication. A commit, PR, merge, editor save, Cloudflare deployment, or production-app release is not ChatGPT Sites publication proof.

Any claim that the Site represents current production state must additionally satisfy Se’kret Bip’s live truth and release-identity contracts. Site rendering alone cannot prove the production app, Worker topology, Supabase state, account behavior, or physical-device behavior.

The exact Site URL and FCR-linked `/control-room` path are verified repository evidence, but editor-account binding, custom domain, and current live publication readback are still unknown. The continuity record therefore remains `UNKNOWN` instead of carrying those missing facts forward.

## Stop conditions

Stop rather than improvise if the canonical repository or current head cannot be resolved, required authority files cannot be read, `main` moved after proof, the FCR/Site identity contract conflicts, private teen/family data would cross the boundary, a required continuity field is unknown, or the requested action requires a separate deploy/migration/auth/RLS/provider/publication authority that is not current.
