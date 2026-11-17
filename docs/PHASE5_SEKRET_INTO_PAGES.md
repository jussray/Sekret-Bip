# Phase 5 — Se'kret Into Pages: Safety Specification

> Created: 2026-06-18  
> Status: ACTIVE CONSTRAINT — applies to all Phase 5 work

---

## The Rule

> **Do not simply hide the Se'kret tab and leave Se'kret unreachable.**
> Se'kret's full functionality must be relocated *inside the Pages tab* as
> named sub-sections. The bottom nav tab entry may be removed only after this
> relocation is complete and verified.

---

## What Pages Becomes

Pages is no longer a journal tab. It becomes the **personal universe screen** —
everything the user writes, records, remembers, or confides:

| Section | Source | Notes |
|---------|--------|-------|
| **Write** | Existing journal | Core writing entry point |
| **Voice Bips** | Audio recording | Native inside Pages |
| **Se'kret Replies** | `SekretScreen` / Oracle | Companion chat threads — must be fully reachable here |
| **Memories** | Se'kret memory store | Saved companion moments, user-tagged memories |
| **Cloud Thoughts** | Existing feature | Surfaced inside Pages context |
| **S2Tell** | Existing feature | Private confession / expression space |
| **Period Calendar** | `PeriodCalendarScreen` | Personal tracking, lives naturally in notebook |
| **History** | Log / archive | Entry history across all sub-sections |

---

## Expo Router File Structure

```
app/
└── (tabs)/
    └── pages/
        ├── index.tsx           ← Pages home (8 section cards)
        ├── write.tsx
        ├── voice-bips.tsx
        ├── sekret-replies.tsx  ← SekretScreen content lives here
        ├── memories.tsx
        ├── cloud-thoughts.tsx
        ├── s2tell.tsx
        ├── period-calendar.tsx
        └── history.tsx
```

`SekretScreen` is **not deprecated**. It is embedded as a full sub-screen at
`/pages/sekret-replies` (option A) or linked via a dedicated card on the Pages
home that pushes to the existing `SekretScreen` (option B). Option A is
preferred for clean Expo Router nesting.

---

## Implementation Checklist

- [ ] Pages home (`index.tsx`) renders 8 named section cards
- [ ] `/pages/sekret-replies` mounts the full Se'kret / Oracle interaction
- [ ] Context providers that `SekretScreen` depends on are available in the
      Pages stack (move up from tab-level if needed)
- [ ] Se'kret bottom nav tab entry removed from `_layout.tsx` **only after**
      the above two items are verified working
- [ ] Back navigation from any Pages sub-screen returns to Pages home
- [ ] Deep links / push notification targets that pointed to `/sekret` are
      updated to redirect to `/pages/sekret-replies`
- [ ] Smoke test: open app → tap Pages → tap Se'kret Replies → full companion
      interaction completes without error

---

## Pass / Fail Criterion

> **Phase 5 passes when:** the user can open Pages → tap Se'kret Replies →
> and have a full companion interaction, with no Se'kret bottom nav tab required.
>
> **Phase 5 fails if:** companion interaction is unreachable after the tab
> is hidden, regardless of how the rest of Pages looks.

---

## What This Protects

Se'kret is not removed. Se'kret becomes part of Pages.
The soul moves with the screen. The tab is just the old door.
