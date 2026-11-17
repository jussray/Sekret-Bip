# Se'kret Bip — Mood, Vibe & Language Audit

Audit only — no screens, features, or systems were added. Findings are
grounded in the actual mood lists, companion dialogue, and UI copy that
exist in the codebase today, cited by file:line throughout. Companion
piece to `docs/UX_AUDIT.md` (navigation/structure) — this sprint is about
*how the app feels*, not how it's organized.

**Headline finding, up front:** the worry behind this audit — that Bip
reads as a "mental health worksheet" — is mostly *not* what's actually in
the code. The mood vocabulary is positive-skewed, every "buried utility"
screen still carries room art and character voice, and the four
companions have genuinely distinct voices. The real gaps are narrower
than "the app feels clinical": a couple of color/label collisions, a
gendered split in two screens' mood options, zero "silly/playful" moods,
and the app's front-door real estate (Room hotspots) still pointing
harder at heavy-moment tools than at celebration tools.

---

## 1. Mood Audit Report

### 1.1 The canonical mood list

`HomeScreen.tsx:69-115` defines the one complete, non-clinical mood
picker — 30 moods in four named groups:

| Group | Count | Moods |
|---|---|---|
| Heavy | 8 | sad, anxious, frustrated, angry, lonely, overwhelmed, hurt, disappointed |
| Steady | 8 | calm, reflective, tired, okay, content, thoughtful, hopeful, grateful |
| Winning | 8 | proud, motivated, confident, excited, accomplished, loved, connected, celebrating |
| Fun | 6 | crushing, unbothered, curious, relieved, feeling-seen, glow-up |

By raw count this is **not** heavy-skewed — Heavy is 27% of the list,
the same share as Steady and Winning, with Fun close behind at 20%.
That contradicts the assumption a teen worksheet would have 70% sad/
clinical options. The four-group structure itself (instead of a flat
alphabetical list, or a 1-5 clinical intensity scale) is also a real
strength — "Winning" and "Fun" as named categories next to "Heavy" is
exactly the kind of framing a mood-tracking app for adults wouldn't use.

### 1.2 Where it gets thinner: secondary mood pickers

Four other screens define their **own**, much smaller mood sets instead
of reusing HomeScreen's 30:

- `CalmScreen.tsx:65-72` — 6 moods (anxious, overwhelmed, sad, stressed,
  tired, calm). This one is *intentionally* heavy-skewed and that's
  correct — it's a de-escalation tool, not a general check-in.
- `ManhoodScreen.tsx:53-60` — 6 moods: happy, calm, **stressed, angry**,
  tired, okay.
- `WomanhoodScreen.tsx:53-60` and `Bippin2Screen.tsx:41-75` — 6 moods:
  happy, calm, tired, **scared, emotional**, okay.

This is the single most concrete content issue this audit found: the
boys'-path screen offers *angry/stressed* and the girls'-path screen
offers *scared/emotional* instead of the same six. That's not a subtle
drift — it's two different emotional vocabularies handed to teens based
on which character track they're on, and it quietly reinforces exactly
the stereotype ("boys get angry, girls get scared/emotional") an app
built to make teens feel safe naming *any* feeling should be actively
avoiding. Recommend both screens ship the same 6 (or both pull from the
same shared set), regardless of which fix-priority bucket it lands in.

### 1.3 Missing moods

Checked against the brief's example list, Bip has **no playful/silly
register at all** — nothing like silly, daydreamy, in-my-own-world, or
chaotic exists anywhere in the mood system. It also has no "drained but
trying," no "overstimulated" (distinct from the more purely-emotional
"overwhelmed"), no "nervous" (separate from "anxious," which reads more
clinical), and no "cozy" as a nameable mood even though *cozy* is the
app's own stated brand keyword. "Okay-ish" isn't there either — only the
flatter "okay."

Mixed/ambivalent emotions are represented better than expected —
"crushing," "feeling-seen," and "unbothered" are all genuinely mixed/
complicated-feeling entries, not pure positive or negative. That's good
range for a 30-option list; it just stops short of *playful*.

### 1.4 Legacy keys — confirmed internal-only

`Happy / Neutral / Sad / Angry / Tired` (`constants/moodGlow.ts:24`) are
never shown in any picker. They're used only for old-format data
fallback and `RoomScreen.tsx` avatar-pose logic (`mood === 'Happy'`,
etc.). No user-facing risk here — flagging only so nobody mistakes them
for a second, competing mood vocabulary.

---

## 2. Mood Emoji & Color Review

The emoji choices are genuinely teen-coded rather than generic-app
clinical: 😭 for "crushing" (Gen-Z "this is sending me," not literal
crying), 💅 for "unbothered," 📈 for "glow-up," 🥹 for "emotional" — these
read as language a teen would actually use, not a designer's guess at
one.

Two real at-a-glance problems in the color map (`constants/moodGlow.ts`):

- **`disappointed` (#a78bfa) is the same hue as `reflective` and
  `thoughtful`** — a Heavy emotion and two Steady, cognitive ones share
  a color. The brief explicitly asks "should every mood feel
  recognizable at a glance" — these three currently don't.
- **`hurt` (#7dd3fc) is identical to `sad` and `anxious`** — three
  meaningfully different feelings collapse to one glow color.

On the positive side: the palette deliberately avoids traffic-light
clinical signaling — anger/frustration/overwhelm map to soft magenta
(#f472b6), not alarm red, and nothing in the mood system uses red or
green at all. That keeps the whole thing feeling like "your room's
glow," not a stoplight dashboard, which is exactly the right call for
this product.

---

## 3. Vibe Audit Report

### 3.1 The core rooms (already known-good)

Splash, Home/Room, Pages, Calm, and Comfort all carry full illustrated
backgrounds, character presence, and mood-tinted glow — confirmed
warm, personal, scrapbook-coded, not clinical. (Splash in particular is
100% custom art with zero raw form UI — already covered in
`docs/UX_AUDIT.md` §4 and partially fixed this sprint via the AgeGate
overlay change.)

### 3.2 The "buried utility" screens — better than assumed

These were flagged in the original UX audit as only reachable via the
More menu, and were the most likely candidates to feel like a dashboard
instead of a room. They don't:

| Screen | Verdict |
|---|---|
| `VoiceBipScreen.tsx` | Most immersive of all nine — drifting Cloud companion, live presence state machine, room art |
| `HistoryScreen.tsx` | "Soft receipts page" — character voice, sticky note, breathing streak pill over what's structurally a stats screen |
| `PointsScreen.tsx` | Explicitly framed as "soft receipts, not a score" — room backdrop, animated tier progress |
| `ComfortStreaksScreen.tsx` | "Ritual tracker," not a fitness app — breathing loops, sticky note |
| `PeriodCalendarScreen.tsx` | Calendar grid is inherently transactional, but heavily softened with companion art and body-affirming copy |
| `GrowthScreen.tsx` | "Mentor," not a course — collapsible lessons read closer to coursework than the others, but companion voice and "no pressure" framing carry it |
| `BipCrewScreen.tsx` | Member/invite-code forms are the most form-like UI in this set, but still wrapped in room art and crew-coded copy |
| `SettingsScreen.tsx` | "Vibe Lab" — themed room previews per character, not a settings list |
| `S2TellScreen.tsx` | **The one real outlier** — relies on `theme`/gradient styling rather than full room art; reads as "a tool with warm copy" rather than "a room." Lowest-illustrated screen in the app. |

Net: 8 of 9 supposedly-clinical screens are not clinical. `S2TellScreen`
is the one place worth a vibe investment (room art / character presence
to match its siblings), and `BipCrewScreen`'s invite-code form is worth
a second look for the same reason, lower priority.

### 3.3 One real language wrinkle inside an otherwise-warm flow

`CircleScreen.tsx:199` — the safety-scan message *"This one looks
serious. Let's pull in a trusted grown-up through Bridge."* is the one
line in the whole codebase that sounds like the app noticing and
flagging you, rather than a person talking to you. It stands out
specifically because everything around it is so consistently
peer-voiced — see Language Audit below.

---

## 4. Language Audit Report

Full pass across buttons, empty states, errors, success copy,
onboarding, safety messaging, and parent-side copy. Strong overall —
most categories read as a person talking, not an app.

| Category | Verdict | Evidence |
|---|---|---|
| Buttons | Warm | *"send with love 💌"* (`ParentBridgeScreen.tsx:378`); *"← back to room"* (`:406`) |
| Empty states | Warm | *"Nothing here yet — This is your space. It's waiting for you."* (`BipEmptyState.tsx:44-45`) |
| Errors | Warm, no blame | *"It's not you. Try again whenever you're ready."* (`BipEmptyState.tsx:49-50`) |
| Save confirmations | Warm, emotionally specific | *"That small act of love matters more than you know."* (`ParentBridgeScreen.tsx:385-388`) |
| Onboarding | Casual, privacy-respecting | *"Quick check before you come in… nothing else is collected."* (`AgeGate.tsx:79-82`) |
| Safety/crisis | Mostly excellent | *"You're not in this alone. No fix. No fix-it talk. Just here."* (`ComfortScreen.tsx:91-92`) |
| Parent-side | Warmer than expected, peer-voiced not advice-y | *"Sitting on the stoop with you."* (`ParentBridgeScreen.tsx:154`) |

**Worst offenders found (only two):**
1. `CircleScreen.tsx:199` — *"This one looks serious."* (see §3.3).
2. Generic, personality-free labels scattered in `SettingsScreen.tsx`
   (*"Pick Your Vibe"*, *"Clear it"* / *"Never mind"* at `:122`) — not
   bad, just a visible step down in voice from everything around them.

**One carried-over content gap, not a tone problem:** the original UX
audit already flagged that no crisis hotline/text-line resource is
surfaced anywhere in `bip_voice.ts` or `ContentSafetyBlock`
(`services/sekretVoice.ts:160` detects serious self-harm language, but
what happens after detection wasn't found in either audit). Repeating
it here because it's the single highest-stakes gap touching this
sprint's territory, even though it's a safety-engineering fix, not a
copy or vibe one.

---

## 5. Se'kret Voice Audit

This is the strongest pillar found in either audit. All four companions
are distinct and recognizable without a name label:

- **Raylene** — big-sister warmth, pet names ("baby," "girl," "love"),
  expressive caps/emoji on wins: *"LOOK AT YOU. Baby, look at what you
  built."* (`bip_voice.ts:604`)
- **Rylane** — terse, lowercase, street-coded, no pet names: *"nah, you
  not carrying this alone. i'm right here."* (`HomeScreen.tsx:190`)
- **Cloud** — sparse, observational, no slang or exclamation marks,
  invites stillness rather than action: *"We can sit here a while."*
  (`bip_voice.ts:326`)
- **Night** — shortest of all four (60-token budget vs. 80/100/120 for
  Cloud/Rylane/Raylene — `worker/sekret-reply.ts:54`), pure presence,
  explicitly refuses to solve anything: *"yeah. i know."*
  (`bip_voice.ts:360`); *"We don't gotta solve it tonight."* (`:366`)

Minor, low-risk overlap: Raylene's and Rylane's comfort lines both land
near "I'm right here," and Cloud's and Night's sad-moment lines are both
short — but the *register* stays distinct in both pairs (warm/embracing
vs. matter-of-fact; observational vs. pure-presence). No character
currently reads as a copy of another.

---

## 6. Positive Energy Opportunities

The app already does more celebrating than it gets credit for —
`PointsScreen`, `HistoryScreen`, and `ComfortStreaksScreen` are all
explicitly framed as "soft receipts," not scores or leaderboards, and
`PagesScreen.tsx` now acknowledges a user's very first journal entry
(*"there it is. that's your first page in here."* — added this sprint).

Two concrete opportunities found:

1. **The win is invisible until you go looking for it.** Points,
   streaks, and history all carry warm copy, but none of them are
   reachable from a Room hotspot or BottomNav — a teen has to already
   know to check More to see them celebrated. (This is the same gap the
   original UX audit's "Rewards Polish" item names from a navigation
   angle; here it's worth naming again as an *emotional* gap — the app's
   warmest, most encouraging screens get the least front-door space.)
2. **No in-the-moment reaction to picking a Winning/Fun mood.** Logging
   "proud" or "celebrating" on HomeScreen doesn't trigger anything —
   Comfort Mode affirms you for completing a grounding step
   (`ComfortScreen.tsx:95-96`), but the mood picker itself never mirrors
   a win back to you the way it would be worth doing for a teen who just
   told the app they're proud of something.

---

## 7. Emotional Balance Score

Estimated mix across the whole product (mood vocabulary + companion
copy + feature surface area, not just the picker):

| | Estimate |
|---|---|
| Sad/stress-focused | ~30% |
| Neutral | ~15% |
| Hopeful | ~15% |
| Fun | ~15% |
| Cozy | ~15% |
| Encouraging | ~10% |

The mood picker itself actually skews positive (§1.1 — Heavy is only
27% of 30 options). The 30% sad/stress estimate above is higher than
the picker alone because of *where the product invests its front door*:
Comfort, Calm, Bridge, and S2 Tell are all reachable straight from Room
hotspots, while Points/Streaks/History/Growth — the celebratory and
cozy tools — are More-menu-only (cross-referencing `docs/UX_AUDIT.md`
§1.1's screen-reachability table). The words are balanced; the building
isn't laid out that way yet.

**Recommended adjustment, in one sentence:** give at least one
celebratory screen the same hotspot-level visibility Comfort and Calm
already have, so the room itself — not just the More menu — reflects
that winning days get noticed too.

---

## 8. Top 25 Copy Improvements

| # | Where | Current | Suggested |
|---|---|---|---|
| 1 | `CircleScreen.tsx:199` | "This one looks serious. Let's pull in a trusted grown-up through Bridge." | "Real heavy. Let's get a trusted grown-up in through Bridge." |
| 2 | `SettingsScreen.tsx:122` | "Clear it" / "Never mind" | "Yeah, clear it" / "Nah, keep it" |
| 3 | `SettingsScreen.tsx:193` | "Pick Your Vibe" | "Pick your room's vibe" (matches "Vibe Lab" framing already used elsewhere on the same screen) |
| 4 | `ManhoodScreen.tsx:53-60` mood set | stressed, angry only | add calm/positive parity with Womanhood's set (see §1.2) |
| 5 | `WomanhoodScreen.tsx:53-60` mood set | scared, emotional only | add the same set Manhood gets, or a shared 8-mood set for both |
| 6 | `constants/moodGlow.ts` `disappointed` | `#a78bfa` (shared w/ reflective/thoughtful) | a distinct hue so it reads at a glance |
| 7 | `constants/moodGlow.ts` `hurt` | `#7dd3fc` (shared w/ sad/anxious) | a distinct hue |
| 8 | HomeScreen mood list | no playful/silly option | add "silly" or "chaotic" with a 🤪/✨ emoji to Fun group |
| 9 | HomeScreen mood list | no "cozy" mood | add "cozy" 🌙 — it's already the brand's own word |
| 10 | HomeScreen mood list | no "overstimulated" | add to Heavy, distinct from "overwhelmed" |
| 11 | HomeScreen mood list | no "drained but trying" | add to Steady — common teen phrasing, currently only "tired" exists |
| 12 | HomeScreen mood list | no "nervous" | add to Heavy, distinct from clinical-reading "anxious" |
| 13 | Mood group order, `HomeScreen.tsx:69` | Heavy listed first | consider leading with Steady or Winning so the first thing a teen sees isn't the hardest options |
| 14 | `S2TellScreen.tsx` | generic theme/gradient background, no room art | give it the same companion-room treatment as its 8 More-menu siblings |
| 15 | Points/Streaks/History reachability | More-menu only | surface at least one via a Room hotspot (ties to UX audit "Rewards Polish") |
| 16 | HomeScreen mood logging | no reaction to Winning/Fun picks | add a one-line affirmation when a positive mood is logged, mirroring Comfort's grounding-step affirmations |
| 17 | `services/sekretVoice.ts:160` self-harm detection | no visible downstream resource in this audit's scope | surface a hotline/text-line resource somewhere in the comfort/crisis path (safety-engineering, flagged for visibility) |
| 18 | `BipCrewScreen.tsx` invite/member forms | most form-like UI among the 9 utility screens | lean further into crew-coded copy/art around the input fields specifically |
| 19 | `GrowthScreen.tsx` lesson cards | reads closest to "coursework" of the 9 | keep "no pressure" framing but consider one mentor line per card instead of plain lesson text |
| 20 | TextInput placeholder colors (3 different grays — `JournalScreen #4a3d6b`, `SekretScreen #94A3B8`, `PagesScreen #736c82`) | inconsistent | unify into one token (carried over from UX audit's Design System section — copy-adjacent because placeholder text is itself often a line of voice, e.g. "what's on your mind?") |
| 21 | Womanhood/Manhood mood emoji parity | 😶 "okay" on both, but otherwise no shared icon language | give the shared moods (calm/tired/okay) identical emoji across both screens for consistency |
| 22 | `ComfortStreaksScreen.tsx` | warm already | no change needed — listed as a confirmed strength, not a gap |
| 23 | `PointsScreen.tsx` "soft receipts" framing | warm already | no change needed — confirmed strength |
| 24 | Legacy capitalized mood keys (`Happy/Neutral/Sad/Angry/Tired`) | fine as internal-only | no user-facing change needed, just keep them out of any future picker |
| 25 | Parent Room copy (`ParentRoomScreen.tsx:63-75`) | already warm, slightly more advice-y than teen side | minor — fine as is, parents reasonably get a touch more guidance-flavored copy than teens |

---

## 9. Top 10 Vibe Improvements

1. Give Points, Streaks, or History a Room hotspot so a celebratory
   screen has the same front-door visibility as Comfort/Calm.
2. Bring `S2TellScreen.tsx` up to the same illustrated-room standard as
   its 8 More-menu siblings — it's the one real outlier.
3. Fix the Manhood/Womanhood gendered mood-vocabulary split (§1.2) —
   the highest-stakes single fix in this whole audit.
4. Add a small playful/silly mood option — currently zero exist
   anywhere in the app.
5. Add "cozy" as a real mood, not just a brand keyword.
6. Resolve the two mood-color collisions (`disappointed`↔reflective/
   thoughtful, `hurt`↔sad/anxious) so moods stay recognizable at a
   glance per the brief's own bar.
7. Reconsider leading the mood picker with "Heavy" — try Steady or
   Winning first.
8. Soften `CircleScreen.tsx:199`'s safety-scan copy — the one line in
   the app that sounds like the app, not a person.
9. Add a one-line in-the-moment affirmation when a Winning/Fun mood is
   logged, the way Comfort already affirms grounding steps.
10. Give `BipCrewScreen.tsx`'s invite/member forms a pass to match the
    crew-coded warmth already present in its copy.

---

## 10. Theme, Emoji & Color Recommendations

- **Keep the 100% emoji icon system.** It's already correctly
  identified (per `docs/UX_AUDIT.md` §2.4) as a deliberate, teen-coded
  choice — don't introduce a vector icon library to "fix" inconsistency
  here; the inconsistency that matters is color collisions, not the
  icon medium.
- **Keep the 5 character theme packs as-is** — they're the backbone of
  why every screen, including the "buried" ones, still reads as a room
  rather than a dashboard. No replacement needed, only the targeted
  color-collision fixes above.
- **Add 1-2 new mood-glow colors** for the new moods recommended in §8/
  §9 (cozy, silly, drained-but-trying, overstimulated, nervous) rather
  than reusing existing hexes, so the at-a-glance recognizability bar
  holds as the list grows.
- **Don't add a 5th visual mood-group category.** Four (Heavy/Steady/
  Winning/Fun) is already a good, teen-legible structure — the fix
  needed is order and color distinctness within it, not more categories.

---

## Summary

Run against the brief's own success test — "this feels like my space,"
not "this feels like a mental health app" — Bip passes more often than
it fails. The mood system is more positive and more mixed-emotion-aware
than a typical wellness app's, all four companions are genuinely
distinct voices, and even the screens buried in the More menu carry
room art and character voice rather than dashboard chrome. The honest
gaps are specific and fixable without new systems: two color collisions,
zero playful moods, one gendered mood split between Manhood and
Womanhood, one clinical-sounding safety line, and a front door that
still sends teens to heavy-moment tools faster than to celebration ones.
