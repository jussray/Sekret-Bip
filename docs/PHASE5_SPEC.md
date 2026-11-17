# Phase 5 Specification — Se'kret → Pages Migration

## Intent

Se'kret is not removed. Se'kret becomes part of Pages.

Se'kret was never just a screen — it is the companion, the memory keeper, the emotional
continuity that makes a journal feel alive. This phase relocates Se'kret's soul into Pages
without losing any of its function.

Hiding the Se'kret tab is only valid if Se'kret's entire functionality lives inside Pages.

---

## What Pages Becomes

Pages is no longer a journal tab. It becomes the personal universe screen — the notebook,
scrapbook, and Se'kret memory space combined.

```
Pages
├── Write              ← journal entries
├── Voice Bips         ← audio emotional snapshots
├── Se'kret Replies    ← companion interaction (SekretScreen content lives here)
├── Memories           ← glue layer: saved replies, entries, voice bips, milestones
├── Cloud Thoughts     ← existing feature
├── S2Tell             ← private expression space
├── Period Calendar    ← personal tracking
└── History            ← archive across all sections
```

---

## Memories Section

Memories is the cross-section glue that makes Pages feel like a scrapbook, not a filing cabinet.

Memories can contain:
- Favorite journal entries (from Write)
- Saved Se'kret replies (from Se'kret Replies)
- Voice Bips worth keeping (from Voice Bips)
- Comfort moments (from Se'kret / Write)
- Growth milestones (from History / Streaks)
- Streak milestones (from Rewards system)
- Meaningful Circle moments (if user chooses to save them)

---

## Target Route Structure

```
app/
└── (tabs)/
    └── pages/
        ├── index.tsx            ← Pages home (scrapbook entry view)
        ├── write.tsx
        ├── voice-bips.tsx
        ├── sekret-replies.tsx   ← SekretScreen content relocated here
        ├── memories.tsx         ← new glue layer
        ├── cloud-thoughts.tsx
        ├── s2tell.tsx
        ├── period-calendar.tsx
        └── history.tsx
```

---

## Safety Constraints

1. **Do not simply hide the Se'kret tab.** Hiding it is only valid if companion interaction
   remains fully reachable inside Pages → Se'kret Replies.

2. **SekretScreen is not deprecated.** Its component and logic must be reused or embedded
   at `app/(tabs)/pages/sekret-replies.tsx` — not removed.

3. **Se'kret context providers** must be initialized at the Pages stack level, not the
   tab level, so they still initialize after the tab is hidden.

4. **Deep link safety.** Any push notifications or links pointing to `/sekret` must
   redirect to `/pages/sekret-replies` after migration.

5. **Back navigation.** Inside Pages sub-screens, the header back button must return to
   the Pages home view — not the bottom tab root.

---

## Bottom Nav After Phase 5

```
Room    ← ambient home
Pages   ← your world (notebook + scrapbook + companion)
Calm    ← grounding
Circle  ← community
More    ← settings / profile
```

Se'kret tab is hidden. Se'kret lives inside Pages.

---

## Definition of Done

- [ ] Se'kret bottom nav tab is hidden
- [ ] SekretScreen functionality is reachable at `app/(tabs)/pages/sekret-replies`
- [ ] Memories section exists and accepts saved items from Write, Se'kret Replies, and Voice Bips
- [ ] Pages home feels like a personal scrapbook, not a list of links
- [ ] Companion interaction works end-to-end from inside Pages
- [ ] Deep links `/sekret` redirect to `/pages/sekret-replies`
- [ ] Se'kret context providers initialized at Pages stack level, not tab level
- [ ] `npm run type-check` passes
- [ ] `npm run audit:runtime-assets` passes

---

## Acceptance Test

> "If a teen opens Pages for the first time, does it feel like opening their personal scrapbook world?"

**If yes → Phase 5 passes.**

If it feels like "just a journal with links" → Phase 5 is incomplete. Do not merge.

The companion's soul must survive the migration. Se'kret is not a feature that was removed.
Se'kret is a layer that became home.
