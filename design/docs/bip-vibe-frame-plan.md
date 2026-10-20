# Bip Vibe Frame Plan — Figma
## 6 × 390×844 Mobile Frames

Each frame: **390 × 844 px**, iPhone 14 canvas, 20px horizontal padding, 16px vertical padding.

---

## Frame Anatomy (all 6 vibes)

Layer stack from bottom to top:

```
[1] BG Rectangle         390×844  fill: {vibe.color.bg}
[2] Atmosphere BG Layer  390×320  placeholder image/gradient (16:9 aspect, top of frame)
[3] Overlay Scrim        390×320  fill: {vibe.overlay.base}  — softens scene
[4] Nav Bar              390×64   fill: {vibe.color.bg}/90  blur: 12
    └─ Logo / VibeKey label
[5] Hero Card            350×140  radius:18  fill: {vibe.card.bg}
    ├─ Card Title        semibold 17px  {vibe.color.textHigh}
    ├─ Card Body         regular 15px   {vibe.color.textMid}  max 2 lines
    └─ Glow              {vibe.color.glowColor} radius:{vibe.color.glowRadius} opacity:0.18
[6] Primary Button       pill  fill:{vibe.button.primaryBg}  text:{vibe.button.primaryText}
    label: "Save to Journal"  semibold 15px  paddingV:12 paddingH:24
[7] Secondary Button     pill  fill:{vibe.button.secondaryBg}  border:{vibe.button.secondaryBorder}
    label: "Share to Circle"  medium 15px
[8] Input Field          350×48  radius:12  fill:{vibe.input.bg}  border:{vibe.input.border}
    placeholder: "What's on your mind…"  regular 15px  textLow color
    focus ring: {vibe.input.borderFocus} 1.5px
[9] Privacy Badge        pill  fill:{global.privacy.bg}  border:{global.privacy.indicator}
    "🔒 Private"  medium 13px  {global.privacy.text}
[10] Verification Badge  pill  fill:{global.verification.bg}
    "✓ Verified"  medium 13px  {global.verification.text}
[11] Parent Boundary     350×auto  radius:16  border:2px {global.parentBoundary.border}
     fill:{global.parentBoundary.bg}
     label: "Parent View"  semibold 13px  {global.parentBoundary.text}
     Contains: mini preview of child's journal card
[12] Journal Card        350×96   radius:18  fill:{vibe.card.bg}
     ├─ Entry title      semibold 15px  {vibe.color.textHigh}
     ├─ Date/time        regular 11px   {vibe.color.textLow}
     └─ Excerpt          regular 13px   {vibe.color.textMid}  max 2 lines
[13] Circle Post Card    350×110  radius:18  fill:{vibe.card.cardAlt}
     ├─ Avatar circle    32×32    fill:{vibe.color.accentB}
     ├─ Username         semibold 13px  {vibe.color.textHigh}
     ├─ Post body        regular 13px   {vibe.color.textMid}
     └─ Reaction row     emoji + count  11px  {vibe.color.textLow}
[14] Selector Ring       390×844  strokeAlign:inside  stroke:{vibe.color.selectorRing} 2px
     (only visible in vibe-picker context)
```

---

## Layout Measurements

| Zone | Y start | Height | Notes |
|------|---------|--------|-------|
| Atmosphere scene | 0 | 320 | 16:9 imagery |
| Nav bar | 44 | 64 | Status bar offset |
| Hero card | 300 | 140 | Overlaps scene by 20px |
| Primary button | 460 | 48 | |
| Secondary button | 520 | 48 | |
| Input field | 584 | 48 | |
| Badge row (Privacy + Verify) | 648 | 32 | Inline, gap:8 |
| Parent Boundary block | 694 | 100 | Bottom of frame |
| Journal Card (scroll hint) | *(inside boundary or below)* | 96 | |
| Circle Post Card | *(tab 2 or below journal)* | 110 | |

---

## Per-Vibe Frame Names

| VibeKey | Frame name in Figma | Frame background |
|---------|--------------------|--------------------|
| raylene | `📱 raylene — Raylene's Room` | `#FFF8EE` |
| rylane  | `📱 rylane — Rylane After Dark` | `#EFF6FA` |
| cloud   | `📱 cloud — Cloud Drift` | `#F3FEFA` |
| night   | `📱 night — Night Comfort` | `#1E1A2E` |
| rain    | `📱 rain — Window Rain` | `#EEF4F9` |
| sunset  | `📱 sunset — Sunset Exhale` | `#FFF4E6` |

Space frames 440px apart horizontally (frame width 390 + 50px gutter).

---

## Component Hierarchy (for Figma component structure)

```
📦 Bip / Vibe Components
 ├── 🎨 VibeCard          (card bg, glow, radius:18)
 ├── 🔘 VibeButton/Primary
 ├── 🔘 VibeButton/Secondary
 ├── 📝 VibeInput
 ├── 🏷  VibeBadge/Privacy   (invariant — global.privacy tokens)
 ├── 🏷  VibeBadge/Verified  (invariant — global.verification tokens)
 ├── 🔒 ParentBoundary       (invariant — global.parentBoundary tokens)
 ├── 📓 JournalCard
 └── 💬 CirclePostCard
```

All components use Tokens Studio bindings — swap theme to instantly re-skin all 6 frames.
