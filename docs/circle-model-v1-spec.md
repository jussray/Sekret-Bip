# Circle Model V1 — Implementation Spec

> Se'kret Bip | Product Contract for Screen Wiring, Schema, and RLS

---

## Overview

The Circle system defines **who can see what** in Se'kret Bip. Every post, mood entry, and interaction is scoped to one of four circles. Circles are not friend lists — they are **trust tiers** with distinct visibility rules and identity behaviors.

Circle Social Entry is documented separately in [`docs/CIRCLE_SOCIAL_ENTRY.md`](CIRCLE_SOCIAL_ENTRY.md). It may make Circle easier to reach from familiar external apps, but it must not change Circle Core behavior, feeling validation, Bip Crew/friend flows, identity rules, moderation, or privacy boundaries.

---

## The Four Circles

| Circle | Se'kret Bip Name | Identity | Who's In It |
|---|---|---|---|
| **Public** | Open Bip | Anonymous by default | Anyone on the app |
| **Friends** | My Circle | Username visible | Users you've added |
| **Crew** | Crew Bip | Full name or username | Close chosen group (≤15) |
| **Parent** | Parent Bridge | Anonymous to parent | One linked parent/guardian |

---

## Identity & Visibility Rules

### Public Circle (Open Bip)
- Posts are anonymous — no username, no avatar shown
- Users can optionally reveal identity per-post via a toggle
- No mutual follow required to see posts
- Comments are also anonymous by default

### Friends Circle (My Circle)
- Requires mutual add ("Add To My Circle" from both sides)
- Username and avatar visible to circle members
- Posts do not appear in Public feed
- User controls which posts are scoped here vs. Crew

### Crew Circle (Crew Bip)
- Max 15 members
- User sets display name preference (full name or username) per Crew
- Invite-only — no open requests
- Highest trust tier among peers; supports voice notes and memory scrapbook

### Parent Circle (Parent Bridge)
- One parent/guardian per account (expandable to two in V2)
- Parent sees **mood summaries and safety alerts only** — not raw posts
- Teen identity shown to parent; parent identity shown to teen
- Teen can set "quiet hours" during which non-emergency data is held
- Parent cannot post into teen's feed — bridge is read + alert only

---

## Circle Social Entry Non-Change Rule

Familiar external apps may help users discover or enter Circle, but Circle itself remains Se'kret-owned.

Circle Social Entry must preserve these rules:

- Feeling validation happens inside Se'kret Circle, not in public platform comment threads.
- Bip Crew members and trusted friends continue to work through Se'kret's own trust tiers.
- External followers, comments, DMs, likes, or platform-native friend graphs must not replace Open Bip, My Circle, Crew Bip, or Parent Bridge rules.
- Public social posts may invite a user into Circle, but they must not imply that Circle Core runs on TikTok, Instagram, or Facebook.
- Familiar-app entry reduces friction only; it must not import follower pressure, public diary pressure, open stranger DMs, or clout loops.

---

## Se'kret Bip Language Layer

All UI copy uses the following naming system. Engineering strings map to these labels:

| System Term | Se'kret Bip Label |
|---|---|
| Add to Friends | **Add To My Circle** |
| Friends list | **My Circle** |
| Shared / mutual circles | **Shared Circles** |
| Followers / mutual users | **People Who Bip With Me** |
| Public feed | **Open Bip** |
| Crew group | **Crew Bip** |
| Parent connection | **Parent Bridge** |

---

## Navigation Structure

```
Bottom Tab Bar (5 items)
├── 🏠  Home Feed        → Open Bip (public, anonymous)
├── 💜  My Circle        → Friends feed + circle management
├── ✨  Compose          → Post composer (circle selector required)
├── 👥  Crew Bip         → Crew feed + crew management
└── 👤  Me              → Profile, Parent Bridge, settings
```

---

## Composer Rules

Every post requires a circle selection before publish. The composer enforces:

1. **Circle Selector** (required) — Open Bip / My Circle / Crew Bip
   - Parent Bridge is not a post destination — it is a data bridge only
2. **Identity Toggle** — shown only when Open Bip is selected
   - Default: Anonymous
   - Optional: "Show my username on this Bip"
3. **Mood Tag** — optional, shown in all circles
4. **Content Warning** — optional, collapses post behind a tap

---

## Permissions Matrix

| Action | Open Bip | My Circle | Crew Bip | Parent Bridge |
|---|---|---|---|---|
| See posts | Anyone | Circle members | Crew members | N/A |
| Post | Any user | Circle members | Crew members | N/A |
| Comment | Any user (anon) | Circle members | Crew members | N/A |
| React | Any user | Circle members | Crew members | N/A |
| See mood data | ✗ | ✗ | ✗ | Summary only |
| Receive safety alerts | ✗ | ✗ | ✗ | ✓ |
| See identity | Hidden (default) | Username | Name or username | Teen ↔ Parent |

---

## Backend Tables (Supabase)

| Table | Purpose |
|---|---|
| `profiles` | User identity, display name, avatar |
| `circles` | Circle type enum: public / friends / crew / parent |
| `circle_members` | Join table — user ↔ circle membership |
| `posts` | All posts with `circle_id` foreign key |
| `post_identity_override` | Per-post anonymous override for Open Bip |
| `moods` | Mood entries, scoped to user (not circle) |
| `mood_summaries` | Aggregated summaries surfaced to Parent Bridge |
| `safety_alerts` | Triggered alerts routed to parent |
| `crews` | Crew metadata, max_members: 15 |
| `crew_members` | Join table — user ↔ crew |
| `parent_links` | One-to-one teen ↔ parent connection |

---

## RLS Behavior Notes

- `posts` RLS: `circle_id = 'public'` → visible to all authenticated users; `circle_id = 'friends'` → restricted to `circle_members` where mutual; `circle_id = 'crew'` → restricted to `crew_members`
- `mood_summaries` RLS: readable only by the linked parent in `parent_links`
- `safety_alerts` RLS: writable by system/teen, readable by linked parent only
- `post_identity_override`: when `is_anonymous = true`, strip `user_id` from public query response at DB level

---

## Implementation Checklist

### Phase 1 — Data Layer
- [ ] Create all tables listed above in Supabase
- [ ] Write RLS policies per permissions matrix
- [ ] Seed circle type enum
- [ ] Build `parent_links` with invite token flow

### Phase 2 — Navigation & Composer
- [ ] Wire bottom tab bar (5 items)
- [ ] Build circle selector component in composer
- [ ] Implement identity toggle (Open Bip only)
- [ ] Enforce circle selection before publish

### Phase 3 — Feeds
- [ ] Open Bip feed — anonymous, all public posts
- [ ] My Circle feed — mutual-only, username visible
- [ ] Crew Bip feed — crew members only
- [ ] Feed switcher / tab per circle

### Phase 4 — Parent Bridge
- [ ] Mood summary aggregation job
- [ ] Safety alert trigger system
- [ ] Parent-facing read-only bridge view
- [ ] Teen quiet hours setting
- [ ] Anonymous display of teen identity to parent (name only, no post content)

### Phase 5 — Polish
- [ ] Se'kret Bip language layer applied across all UI strings
- [ ] Circle membership management screens
- [ ] Crew invite flow (max 15 enforced)
- [ ] "People Who Bip With Me" screen

### Phase 6 — Circle Social Entry
- [ ] Add only familiar-app entry or deep-link routes that return to Se'kret-owned Circle surfaces
- [ ] Prove Circle Core visibility, identity, validation, Bip Crew/friend, and moderation rules remain unchanged
- [ ] Block platform-native follower/comment/DM graphs from becoming Circle membership or trust evidence
- [ ] Add tests proving external entry cannot bypass circle selection, identity toggles, RLS, or moderation

---

## Notes

- Parent Circle is **never a post destination** — it is a trust bridge, not a feed
- Quiet hours apply to non-emergency mood data only; safety alerts always fire
- V2 will explore a second parent/guardian slot and crew size expansion
- All Se'kret Bip language labels are final — do not revert to generic social terms in any user-facing string
- Circle Social Entry is a doorway into Circle, not an external-platform replacement for Circle

---

*Last updated: July 2026 — Circle Model V1 + Social Entry boundary*
