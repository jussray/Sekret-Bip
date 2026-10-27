# Repo Knowledge Refresh — baseline 2026-07-20, refreshed 2026-08-09

This is the current agent-orientation checkpoint for Se'kret Bip. It preserves the July 20 filename for continuity but supersedes the earlier July 23, July 30, and July 31 status narratives where this refresh records newer authority.

## Current repository authority

- Default branch: `main`.
- Reviewed application baseline: `824b4dcffb9e0ffc7468a002f0390cbba98d79ae`. Later documentation-only merges may advance `main` without changing application evidence.
- Current launch gate: `docs/LAUNCH_GATE_STATUS_2026-07-31.md`.
- P0 live-release blocker: [#696](https://github.com/jussray/Sekret-Bip/issues/696).
- Cloudflare branch-control gate: [#646](https://github.com/jussray/Sekret-Bip/issues/646) is closed/completed as of 2026-08-03; provider-side branch-control proof was accepted and PR #712 added repository defense in depth. It is no longer an open implementation-branch blocker.
- Canonical frontend: Cloudflare Pages project `sekret-bip`.
- Canonical backend: Worker `sekret-backend`, entry point `worker/voice-entry.ts`.
- Canonical public release marker: `https://sekretbip.net/.well-known/sekret-release.json`.

## What is merged

- PR #595: canonical onboarding-state repair.
- PR #596: Crew invite behavior contract.
- PR #688: restored-session account switching fails closed.
- PR #691: current main-contract authority repair.
- PR #695: Cloudflare operator-document reconciliation, exact-head contract, unit suite, and type-check.
- PR #698: password-recovery route continuity, with PR #690 closed as preserved history.
- PR #700: reconstructed Calm mood/plan controls repair; PR #692, its stale mixed-stack predecessor, is closed and preserved only as historical source.
- PR #701: canonical Suhana/Sy companion naming in Teen and Parent Settings.
- PR #703, #704, #706: repository failure-truth auditor, branch-hygiene inventory gate, and post-merge Repository Truth/Calm/Product Design verification, including a parser-typo repair.
- PR #712: repository-side branch-control defense in depth after the founder/provider-side #646 proof was accepted.

A merge proves repository history only. It does not automatically prove the live Pages deployment, Supabase state, production auth, browser flow, or device behavior.

## Live production finding

The local web build emits both `dist/.well-known/sekret-release.json` and `dist/release.json`. A fresh read-only production check saw application fallbacks instead of JSON at both public paths. Therefore:

- do not call the live web frontend an exact release of current `main`;
- do not infer a Pages deploy from a green repository workflow;
- do not use the legacy `/release.json` URL as current release authority;
- route Cloudflare dashboard configuration and artifact verification through #696.

## Open merge candidates

This refresh does not use older statements such as “there are no open pull requests” as current truth. Re-check live GitHub state before any merge decision. Merged work still needs separate real-account, browser, and physical-device proof before it counts as launch evidence.

## Evidence discipline

Keep code, exact-head CI, merge-SHA CI, Cloudflare deployment, live Supabase, production browser, physical-device, and real-account witnesses separate. A green signal in one layer does not prove another.

## Current primary launch order

1. Restore the public release marker and exact production witness for the intended `main` SHA through #696.
2. Preserve #646's completed provider-side branch-control evidence and PR #712 repository defense; re-check current Cloudflare/release truth when deployment evidence is material without reopening #646 by assumption.
3. Complete separate real-account, browser, and device proof for the merged auth and Calm surfaces.
4. Continue independent authorization, deletion, relationship/Bridge, device, accessibility, legal, safeguarding, moderation, support, backup, restore, incident, and rollback gates.
5. Keep L4 and L5 out of launch scope unless the founder explicitly changes it.

## Historical note

Earlier July 23 prose in previous revisions described PR #595 and PR #596 as drafts. They are merged historical milestones, not current repair candidates. Earlier July 30 prose described PR #692 as a draft needing a rebase; it is closed, and its Calm-controls repair is merged repository history through PR #700. Earlier July 31 prose classified #646 as open; live issue authority now records it closed/completed as of 2026-08-03.