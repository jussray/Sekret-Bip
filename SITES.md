---
schema: juss/chatgpt-sites-repository-binding@v1
project_id: sekret-bip
canonical_repository: jussray/Sekret-Bip
canonical_branch: main
authority_repository: jussray/founder-control-room
site_identity_status: verified
site_origin: https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site
site_role: audit-mirror
account_owner: unverified
chatgpt_site_url: https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site
custom_domain: null
canonical_control_room_entry: app/(dev)/control-room.tsx
audit_view_link: https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site/control-room
legacy_route_note: "/control-room is a compatibility route for the audit mirror; it is not a second Se’kret Bip Control Room"
last_verified: "2026-09-06"
verification_source: "Founder Control Room bridge repository evidence; editor-account/custom-domain/live publication readback pending"
continuity_status: UNKNOWN
---

# ChatGPT Sites repository binding — Se’kret Bip

This file defines the repository-side contract for the verified Se’kret Bip ChatGPT `@Sites` audit mirror. Se’kret Bip has exactly one Control Room: the founder-only repo-local operating layer whose canonical entry is `app/(dev)/control-room.tsx` in `jussray/Sekret-Bip`.

The ChatGPT Site is not a second Control Room. It is a read-only/request-only audit mirror that may present sanitized engineering evidence from the canonical Control Room. The existing Site route `/control-room` is retained only as a compatibility URL and must not be described, modeled, or granted authority as an independent Control Room.

The Site does not become the production app, Cloudflare authority, Supabase authority, Founder Control Room authority, or execution authority.

## Cross-account continuity

The frontmatter is the repository-side continuity record for this Site. `account_owner` identifies only a verified editor-account binding and must not expose private account-holder identity. `chatgpt_site_url`, `custom_domain`, `audit_view_link`, `last_verified`, and `verification_source` must come from the authority that can actually observe them. `continuity_status` is one of `VERIFIED`, `UNKNOWN`, `STALE`, or `SUPERSEDED`.

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
- `.agents/skills/bip-control-room/SKILL.md`
- `.control-room/plugin-management.json`
- `.control-room/repository.manifest.json`

Stricter Se’kret Bip teen privacy, consent, safety, dignity, anti-surveillance, auth, RLS, parent/teen, rollback, release-truth, and non-deletion rules always win.

## One-Control-Room invariant

There is exactly one Se’kret Bip Control Room.

Canonical identity:

- repository: `jussray/Sekret-Bip`
- entry: `app/(dev)/control-room.tsx`
- workspace: `src/screens/DevControlRoomWorkspace.tsx`
- execution: repo-local allowlisted Control Room missions
- evidence: `reports/control-room/`

The ChatGPT Site may mirror sanitized status, receipts, decisions, and requests from that Control Room. It must not maintain an independent mission registry, approval state, execution queue, authority ledger, or competing source of truth.

## Verified Site identity

Repository evidence in `jussray/founder-control-room` currently identifies the peer Site origin as:

`https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site`

The compatibility audit route remains:

`https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site/control-room`

The route name is historical compatibility only. Its product role is `audit-mirror`, not `control-room`.

The Site-side manifest path remains `/api/control-room-link` for compatibility with the existing bridge. That endpoint links the audit mirror to the canonical Control Room; it does not establish a second Control Room.

## Read contract

The Site may read repository material needed for the bounded audit experience only after resolving the canonical repository, current head, and required authority files.

It must keep these evidence layers separate: repository, CI, Cloudflare Pages/Workers, Supabase, browser, controlled account, device, and design/prototype evidence. A green layer never silently proves another.

The Site must never ingest or expose journal text, voice recordings/transcripts, private messages, Circle content, teen or parent names, email addresses, private family data, safety content, Supabase service-role material, model keys, raw database rows, or other high-sensitivity product data merely to render project status.

## Write contract

The audit mirror may request or prepare repository-backed changes only through the repository's governed workflow. It does not own execution authority.

It must never push ordinary implementation directly to `main`, force-push, delete founder or user material, bypass auth/RLS/privacy gates, broaden parent visibility, change identity rules, or use a Site command/string as authority.

A repository write or merge never silently authorizes Cloudflare deployment, Supabase migration, auth/RLS changes, Worker routes/bindings, secrets, DNS, billing, public communication, or another separately gated action.

## Founder Control Room bridge

The FCR bridge intentionally keeps authority asymmetric while preserving one Bip Control Room:

- Founder Control Room: portfolio-level `approve`, `execute`
- Se’kret Bip canonical Control Room: project-local founder operations and evidence
- Se’kret Bip Site audit mirror: `observe`, `request`

The audit mirror must never promote itself into a second Control Room or execution authority.

## Site publication contract

A Site edit/publication must bind to the intended exact repository state, re-read this Markdown authority chain, and capture an observable Site artifact after publication. A commit, PR, merge, editor save, Cloudflare deployment, or production-app release is not ChatGPT Sites publication proof.

Any claim that the Site represents current production state must additionally satisfy Se’kret Bip’s live truth and release-identity contracts. Site rendering alone cannot prove the production app, Worker topology, Supabase state, account behavior, or physical-device behavior.

The exact Site URL and compatibility audit route are verified repository evidence, but editor-account binding, custom domain, and current live publication readback are still unknown. The continuity record therefore remains `UNKNOWN` instead of carrying those missing facts forward.

## Stop conditions

Stop rather than improvise if the canonical repository or current head cannot be resolved, required authority files cannot be read, `main` moved after proof, the FCR/Site identity contract conflicts, the Site is represented as a second Control Room, private teen/family data would cross the boundary, a required continuity field is unknown, or the requested action requires a separate deploy/migration/auth/RLS/provider/publication authority that is not current.
