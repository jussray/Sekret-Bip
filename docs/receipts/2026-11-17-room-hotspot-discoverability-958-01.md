RECEIPT-ID:        2026-11-17-room-hotspot-discoverability-958-01
PREDECESSOR:       2026-11-17-trust06-deletion-completeness-417-01 (different logical change,
                    different branch per branch-hygiene policy — not a continuation of it)
SUCCESSOR:         (filled by the next receipt)
CREATED-AT:        2026-11-17 (session clock)
RECHECK-BY:        on next session touching #958, #924, or screens/UserRoomScreen.tsx
OPERATOR / MODE:   Claude (this session) · /goalfix, under the newly-loaded Sekret-Bip
                    Operating Contract (Sauce Guard / 5W1H / Governed Gap-to-Merge)
AUTHORITY-DIGEST:  jussray/Sekret-Bip@d089694f61590112ba30e481ac64db81714058f3 (main, branch base)
EVIDENCE:          screens/UserRoomScreen.tsx, test/room-hotspot-discoverability.test.mjs,
                   e2e/rooms/room-hotspot-discoverability.spec.ts (run via
                   playwright.room.config.ts), docs/ROOM_PRODUCTION_SUPABASE_TRUTH.md,
                   REPO_HEALTH_DUPLICATES.md, artifacts/branch-hygiene-report.json
EVIDENCE-DIGEST:   not computed (no scripts/receipts_check.py in this repo)
FINGERPRINT:       jussray/Sekret-Bip · branch fix/room-hotspot-discoverability ·
                   SHA d089694 (base) · env: local/dev only · deploy-id: n/a

GOAL:              Issue #958 (pilot under #924): make meaningful Room hotspots discoverable
                    before first interaction, without redesigning the Room or widening scope.
BASELINE:          npm run lint / type-check / test clean before this change (2259 pass on
                    main@d089694, same baseline already established for the #417 work this
                    session). The issue's own historical file pointers
                    (src/components/room/hotspots/RoomHotspot*.tsx) were revalidated and found
                    orphaned — exported from barrel files but imported nowhere in the live app
                    (CLAUDE.md's standing "grep for importers before trusting a file" warning
                    applied literally here). The real, live hotspot owner is the inline
                    implementation inside screens/UserRoomScreen.tsx (confirmed live via
                    app/(teen)/room.tsx -> screens/UserRoomScreen).
CAUSE:             UserRoomScreen already had a discoverability mechanism (isHinted / hintAnim /
                    tapHint, plus an always-on per-hotspot pulse ring for hotspots flagged
                    pulse:true) — but the one-time text-label reveal on mount was hardcoded to a
                    single hotspot id ('pages'). Every other hotspot in every room (voiceBip,
                    comfort, bridge, cloudThoughts, moodCheckIn, bippin2, circle, window,
                    headphones depending on character) never told a first-time user what it was
                    before they tapped it blind.

ACTIONS:
  - grepped for importers of the issue's historically-named files; confirmed them orphaned
  - read screens/UserRoomScreen.tsx's hotspot data (4 character arrays) and render/animation
    logic in full
  - checked this repo's existing useReducedMotion() convention (hooks/useReducedMotion.ts,
    used the same way in screens/CalmScreen.tsx) before adding any new motion
  - replaced the hardcoded single-hotspot mount timeout with a separate effect that cycles
    hintSpot through every hotspot in the current room once, sequentially, reusing the exact
    existing isHinted/hintAnim/tapHint render path (no new UI element, no new dependency);
    gated on reduceMotion and hotspots.length
  - wrote test/room-hotspot-discoverability.test.mjs (5 tests, source-contract style, matching
    this repo's established convention)
  - wrote e2e/rooms/room-hotspot-discoverability.spec.ts, run for real via
    `npx playwright test --config=playwright.room.config.ts` against the live Expo web app:
    proved >=2 distinct hotspot hint labels appear before interaction, and that tapping a
    hotspot still navigates away exactly as before
  - ran the full existing e2e/rooms/room-contract.spec.ts alongside it: all passing tests still
    pass, no regression to locked bottom-nav, companion tap target, or phone-width layout
  - ran node scripts/audit-branch-hygiene.mjs before branching (confirmed current branch
    matches policy) and after (same)
  - ran node scripts/audit-failure-truth.mjs --strict: exit 1, but every finding is pre-existing
    and at line numbers outside this diff (verified screens/UserRoomScreen.tsx:705/722, both
    untouched by this change, same pre-existing backlog across ~35 files repo-wide) — KNOWN-RED,
    does not intersect this goal, not introduced or fixed by this change

CHANGE:
  - screens/UserRoomScreen.tsx: +1 import, +1 hook call, 1 effect replaced with a new ~20-line
    effect; no change to hotspot data, styles, room art, navigation, or press handlers
  - test/room-hotspot-discoverability.test.mjs: new file, 5 tests
  - e2e/rooms/room-hotspot-discoverability.spec.ts: new file, 2 Playwright tests

PROOF:             VERIFIED at the real-path layer for the specific behavior changed.
  - VERIFIED (static): lint, type-check clean.
  - VERIFIED (unit/contract): 5/5 new tests pass; full suite 2264 pass / 0 fail / 2 pre-existing
    unrelated cancellations (a different, flaky timeout-related test file) / 1 pre-existing
    documented env-missing skip.
  - VERIFIED (real-path/Playwright): ran for real against the live Expo web app via
    playwright.room.config.ts (iPhone 13 viewport, chromium) — both new tests pass, and all
    4 active pre-existing room-contract.spec.ts tests still pass unchanged (2 unrelated
    test.fixme placeholders remain skipped, as before this change).
  - PARTIAL: did not visually screenshot-diff against founder-approved canon; "founder
    visual/product approval bound to the exact accepted artifact/head" from the issue's
    acceptance list is explicitly NOT mine to grant — that's the next gate.
  - UNKNOWN: native iOS/Android rendering (only verified on the web target via Playwright, per
    this repo's established e2e convention; no device farm access this session).

RISK:
  - Reveal timing (700ms initial delay, ~1.66s per hotspot) is a judgment call, not founder-
    specified; easy to retune without touching the mechanism if it reads too slow/fast live.
  - For a room with many hotspots (Raylene/Rylane have 7-8), the full one-time tour runs
    ~12-14 seconds total — still a single bounded one-time sequence, not a loop, but worth the
    founder watching it live before sign-off.
  - Did not add pulse:true to the hotspots that currently lack it (voiceBip, comfort, bippin2,
    circle, bridge across characters) — deliberately out of scope (see CAUSE); flagging in case
    the founder wants that follow-up as a separate, smaller change.

ROLLBACK:          code: revert this commit. Isolated to one file's two effects; no schema, no
                   migration, no navigation change, no new dependency.

NEXT GATE:         Founder visual/product approval on this exact head, watched live (not from
                   this report alone, per "never claim a feature is complete from documentation
                   or a manifest alone") — then a separate merge decision. No PR opened yet.

CONTEXT:           ~UNKNOWN — this receipt covers only this change's own investigation; heavy
                   items were reading the full UserRoomScreen.tsx hotspot/animation block and
                   the live Playwright run (~51s, 8 tests).
