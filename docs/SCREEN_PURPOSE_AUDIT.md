# Se'kret Bip — Two-Sided Screen Purpose Audit

## Decision

Primary screens are feature homes, not visual reskins of the same companion prompt layout.

### Teen side

| Screen | Single job | Features that belong inside |
|---|---|---|
| Room | Visual home base | companion presence, mood check-in, time/weather atmosphere, continue last activity, discoverable hotspots |
| Pages | Journal/notebook hub | typed entries, voice attachments, prompts, entry-linked Se’kret replies, saved history |
| Calm | Comfort tools | breathing, grounding, Cloud Thoughts, comfort cards, wind-down and sleep tools |
| Voice Bip | Voice/talk mode | record, playback, optional transcript, spoken companion response, save to Pages |
| Circle | Community | public anonymous Circle, friends, Crew, reactions, moderation |
| More | Feature drawer/settings | profile, rewards, Bippin 2, period calendar, parent link, safety, settings, help/legal |

### Parent side

| Screen | Single job | Features that belong inside |
|---|---|---|
| Parent Room | Parent home base | parent mood, calm presence, jump-back shortcuts, time/weather atmosphere |
| Parent Pages | Parent notebook | letters, private journal, repair notes, wins, future letters, Bridge reply drafts |
| Parent Calm | Pause-before-replying tools | breathing, grounding, response reset, wind-down, support prompts |
| Parent Voice Bip | Voice reflection | private recording, playback, transcript, spoken reply drafts, save to Parent Pages |
| Parent Circle | Parent community | parent-to-parent posts, anonymous identity, resources, reactions, moderation |
| Doorbell | Shared signal hub | teen-initiated Bridge signals, support requests, shared wins, connection status, calm reply entry point |
| Bridge | Intentional exchange | parent replies and teen-approved shared moments |
| Parent More | Feature drawer/settings | profile, connection management, settings, resources, help/legal |

## Audit findings from current code

1. `RoomScreen` and older dashboard concepts overlap. Room must remain the single home base.
2. `PagesScreen` contains companion interaction, comfort suggestions, prompts, entry history, and writing in one long workspace. Companion replies are valid only when attached to an entry; full chat belongs in companion chat.
3. Teen and parent Voice Bip currently share the same screen component. Shared recording infrastructure is good, but copy, actions, storage destination, and reply purpose need side-specific wrappers.
4. Teen and parent Calm already have separate route components, but their feature ownership must stay distinct: teen regulation versus parent pause-before-replying.
5. Teen More was an ungrouped collection of unrelated links. Parent More had the same risk. Both are now grouped feature drawers.
6. Doorbell and Parent Pages must remain separate. Doorbell is teen-shared signal metadata; Parent Pages is parent-owned private writing.
7. Parent Circle and Teen Circle must never share content identity or expose one side’s feed to the other.
8. The bottom navigation must contain only primary homes. Secondary features belong inside More or in-flow navigation.

## Implementation completed in this pass

- Added `src/constants/screenPurpose.ts` as the canonical two-sided ownership map.
- Grouped Teen More into Your Space, Growth Tools, and Account & Safety.
- Grouped Parent More into Parent Window, Your Support Space, and Account & Resources.
- Added explicit “must not become” boundaries to prevent future screen duplication.

## Next implementation order

1. **Pages separation — done.** Pages never embedded a full chat thread —
   its only companion surface was already entry-linked (`SekretReplyBubble`,
   one reply per saved entry) plus the scripted, non-chat Oracle Q&A panel;
   full multi-turn chat lives solely on `app/(teen)/chat/[personalityId].tsx`.
   What was missing was the Comfort handoff: teen Pages now has a small
   "Need a moment? Try a Calm tool →" link in the Write tab that pushes to
   Calm, rather than embedding any comfort experience directly.

2. **Voice Bip separation**
   - teen: talk, hear companion, save voice note to Pages
   - parent: reflect, draft a Bridge reply, save to Parent Pages

3. **Calm separation**
   - teen: comfort and regulation
   - parent: pause before replying and relationship reset

4. **Room cleanup — done.** Neither `RoomScreen.tsx` nor `ParentRoomScreen.tsx`
   contains dashboard/stats content (`ParentRoomScreen.tsx` states outright:
   "The room IS the interface. No cards. No grids. No dashboard."), and
   `app/(parent)/dashboard.tsx` is only a hidden redirect alias into Bridge,
   not a competing home. Removed one leftover: a dead `'dashboard'` member
   of the `RoomTarget` union in `RoomScreen.tsx` that no hotspot ever routed to.

5. **Circle separation — data sources done, moderation added.**
   Teen Circle (`public_circle_posts`/`friends_circle_posts`/`crew_circle_posts`)
   and Parent Circle (`parent_circle_posts`) were already fully separate
   tables with no overlap, and every post already renders without an author
   identity (by design — see `types/circle.ts`), which rules out a
   client-side block-by-user feature without a larger identity-exposure
   change. What was genuinely missing was moderation: added a `reported_posts`
   table (`supabase/migrations/20260703200000_circle_moderation.sql`) and a
   report action on both the teen (`app/(teen)/circle/feed.tsx`) and parent
   (`screens/ParentCircleScreen.tsx`) feeds — reporting a post hides it from
   that device immediately and records the report for founder/admin review.

6. **Mobile layout pass**
   - safe areas
   - Safari viewport height
   - floating Mood overlap
   - bottom-tab overflow
   - screen-specific header sizing

## Acceptance rule

A feature belongs on a screen only when it strengthens that screen’s single job. If the same complete interaction appears on two primary screens, one of them is wrong.
