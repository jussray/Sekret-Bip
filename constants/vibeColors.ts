// constants/vibeColors.ts
// Se'kret Bip — Vibe Lab Color + Token System
//
// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL ALIGNMENT
// This file is the token extension layer of the canonical vibe system.
// All VibeKey values, legacy aliases, and room phase types are imported from
// constants/vibeRegistry.ts — never redefined here.
//
// Hierarchy:
//   vibeRegistry.ts  ← canonical preset registry (keys, phases, identity)
//       ↓
//   vibeColors.ts    ← color/typography/spacing/motion token extensions
//       ↓
//   VibeThemeContext  ← runtime provider  (useVibeTheme hook)
//       ↓
//   Screen/component  ← consumes theme via hook, never imports tokens directly
// ═══════════════════════════════════════════════════════════════════════════

export type { VibeKey, RoomPhase } from './vibeRegistry';
export {
  VIBE_KEYS,
  VIBE_DISPLAY_ORDER,
  PRESET_IDENTITY,
  resolveVibeKey,
  getRoomPhase,
  normalizeRoomPhase,
} from './vibeRegistry';

import { VIBE_KEYS } from './vibeRegistry';
import type { VibeKey, DesignToolTokenRow } from './vibeRegistry';

// ── FOUNDATION PALETTE ────────────────────────────────────────────────────
// Seven named source colors. Every other value in this file derives from one
// of these. Do not add colors here without a clear derivation rationale.

export const FOUNDATION = {
  daylightCream:   '#FFF8EE',  // page base — warm, open, never stark
  warmPeach:       '#FFB289',  // primary warmth — expressive, sunlit
  skyBlue:         '#7EC8E3',  // openness, clarity, breathing room
  softMint:        '#A8E6CF',  // fresh, energised, supportive
  sunGold:         '#FFD166',  // uplifting, celebratory, Vibe Lab accent
  cloudWhite:      '#F5F5F5',  // card surfaces, overlays, soft contrast
  softAccentBerry: '#E07A9F',  // warmth spike — for emphasis, not mood
} as const;

// ── SEMANTIC TOKENS ───────────────────────────────────────────────────────
// Vibe-invariant tokens consumed by shared UI elements (nav, forms, safety
// banners). Screens that need vibe-specific values use useVibeTheme() instead.

export const SEMANTIC = {
  // Surfaces
  pageBg:           FOUNDATION.daylightCream,
  cardBg:           FOUNDATION.cloudWhite,
  cardBgWarm:       '#FFF1E6',
  surfaceFloat:     'rgba(255,248,238,0.85)',
  surfaceDim:       'rgba(255,248,238,0.60)',
  overlayScrim:     'rgba(80,40,20,0.32)',

  // Text
  textPrimary:      '#2C1A0E',
  textSecondary:    '#7A5030',
  textTertiary:     '#B08060',
  textOnDark:       '#FFF8EE',
  textOnAccent:     '#2C1A0E',

  // Accent / Action
  accentPrimary:    FOUNDATION.warmPeach,
  accentSecondary:  FOUNDATION.sunGold,
  accentTertiary:   FOUNDATION.softMint,
  accentBerry:      FOUNDATION.softAccentBerry,

  // Borders
  borderSubtle:     'rgba(44,26,14,0.10)',
  borderMedium:     'rgba(44,26,14,0.20)',
  borderAccent:     FOUNDATION.warmPeach,

  // Glow
  glowDay:          'rgba(255,178,137,0.22)',
  glowGold:         'rgba(255,209,102,0.28)',
  glowSky:          'rgba(126,200,227,0.20)',
  glowMint:         'rgba(168,230,207,0.22)',

  // Safety (invariant — never overridden by active vibe)
  safetyBg:         '#FFF3F3',
  safetyBorder:     '#E07A9F',
  safetyText:       '#8B1A3A',

  // Privacy / parent visibility (invariant)
  privacyIndicator: '#7EC8E3',
  privacyText:      '#1A4A5C',
  parentBoundary:   '#FFD166',

  // Verification
  verifiedFill:     FOUNDATION.softMint,
  verifiedText:     '#1A5C3A',
  unverifiedFill:   '#FFF3E0',
  unverifiedText:   '#7A4500',
} as const;

// ── TYPOGRAPHY SCALE ──────────────────────────────────────────────────────

export const TYPE = {
  xs:    11,
  sm:    13,
  base:  15,
  md:    17,
  lg:    20,
  xl:    24,
  xxl:   30,
  hero:  40,

  light:     '300' as const,
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,

  lineRelaxed: 1.6,
  lineSnug:    1.35,
  lineNone:    1.0,

  trackingTight:  -0.3,
  trackingNormal:  0,
  trackingWide:    0.5,
  trackingUpper:   1.2,
} as const;

// ── SPACING SCALE (4px grid) ───────────────────────────────────────────────

export const SPACE = {
  px:  1,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  3.5: 14,
  4:   16,
  5:   20,
  6:   24,
  7:   28,
  8:   32,
  10:  40,
  12:  48,
  14:  56,
  16:  64,
  20:  80,
  24:  96,
} as const;

// ── RADIUS SCALE ──────────────────────────────────────────────────────────

export const RADIUS = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  card: 18,
  pill: 999,
} as const;

// ── SHADOW TOKENS ─────────────────────────────────────────────────────────

export type ShadowToken = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export const SHADOW: Record<string, ShadowToken> = {
  none: {
    shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  xs: {
    shadowColor: '#2C1A0E', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  sm: {
    shadowColor: '#2C1A0E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  md: {
    shadowColor: '#2C1A0E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
  },
  lg: {
    shadowColor: '#2C1A0E', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13, shadowRadius: 24, elevation: 8,
  },
  glow: {
    shadowColor: FOUNDATION.warmPeach, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 18, elevation: 6,
  },
  glowGold: {
    shadowColor: FOUNDATION.sunGold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50, shadowRadius: 20, elevation: 6,
  },
} as const;

// ── MOTION TOKENS ─────────────────────────────────────────────────────────

export const MOTION = {
  instant:   80,
  fast:      180,
  normal:    300,
  relaxed:   480,
  slow:      700,
  breath:    1200,

  spring:        { damping: 18, stiffness: 180, mass: 1 },
  springGentle:  { damping: 22, stiffness: 120, mass: 1 },
  easeOut:       'easeOut' as const,
  easeInOut:     'easeInOut' as const,

  vibeCrossfade: 600,
} as const;

// ── VIBE PALETTE TYPE ─────────────────────────────────────────────────────
// All per-vibe color tokens. Screens read these through useVibeTheme().

export type VibePalette = {
  key: VibeKey;

  // Surfaces
  bg: string;
  card: string;
  cardAlt: string;

  // Accent triad
  accentA: string;
  accentB: string;
  accentC: string;

  // Text
  textHigh: string;
  textMid: string;
  textLow: string;

  // Atmosphere overlays (bottom → top, applied over room scene)
  overlayBottom: string;
  overlayMid: string;
  overlayTop: string;

  // Companion glow
  glowColor: string;
  glowRadius: number;

  // Component tokens
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  buttonBg: string;
  buttonText: string;
  badgeBg: string;
  badgeText: string;
  tabActive: string;
  tabInactive: string;
  divider: string;

  // Vibe Lab selector ring
  selectorRing: string;
};

// ── VIBE PACKS ────────────────────────────────────────────────────────────

export const VIBE_PACKS: Record<VibeKey, VibePalette> = {
  raylene: {
    key: 'raylene',
    bg: '#FFF8EE', card: '#FFF1E6', cardAlt: '#FFE8D6',
    accentA: '#FFB289', accentB: '#FFD166', accentC: '#F4A0C8',
    textHigh: '#2C1A0E', textMid: '#7A5030', textLow: '#B08060',
    overlayBottom: 'rgba(255,178,137,0.06)',
    overlayMid:    'rgba(255,209,102,0.14)',
    overlayTop:    'rgba(255,248,238,0.70)',
    glowColor: '#FFB289', glowRadius: 48,
    inputBg: '#FFF8EE', inputBorder: 'rgba(44,26,14,0.12)',
    inputBorderFocus: '#FFB289',
    buttonBg: '#FFB289', buttonText: '#2C1A0E',
    badgeBg: '#FFD166', badgeText: '#2C1A0E',
    tabActive: '#FFB289', tabInactive: '#B08060',
    divider: 'rgba(44,26,14,0.08)',
    selectorRing: '#FFB289',
  },
  rylane: {
    key: 'rylane',
    bg: '#EFF6FA', card: '#E4EFF6', cardAlt: '#D6E8F3',
    accentA: '#7EC8E3', accentB: '#A8E6CF', accentC: '#FFB289',
    textHigh: '#0E2433', textMid: '#3A6070', textLow: '#7AACBA',
    overlayBottom: 'rgba(126,200,227,0.07)',
    overlayMid:    'rgba(168,230,207,0.12)',
    overlayTop:    'rgba(239,246,250,0.72)',
    glowColor: '#7EC8E3', glowRadius: 52,
    inputBg: '#EFF6FA', inputBorder: 'rgba(14,36,51,0.12)',
    inputBorderFocus: '#7EC8E3',
    buttonBg: '#7EC8E3', buttonText: '#0E2433',
    badgeBg: '#A8E6CF', badgeText: '#0E2433',
    tabActive: '#7EC8E3', tabInactive: '#7AACBA',
    divider: 'rgba(14,36,51,0.08)',
    selectorRing: '#7EC8E3',
  },
  cloud: {
    key: 'cloud',
    bg: '#F3FEFA', card: '#E8FAF4', cardAlt: '#D8F5EC',
    accentA: '#A8E6CF', accentB: '#7EC8E3', accentC: '#FFD166',
    textHigh: '#0E2E22', textMid: '#3A6A52', textLow: '#7ABAA2',
    overlayBottom: 'rgba(168,230,207,0.08)',
    overlayMid:    'rgba(126,200,227,0.12)',
    overlayTop:    'rgba(243,254,250,0.74)',
    glowColor: '#A8E6CF', glowRadius: 44,
    inputBg: '#F3FEFA', inputBorder: 'rgba(14,46,34,0.12)',
    inputBorderFocus: '#A8E6CF',
    buttonBg: '#A8E6CF', buttonText: '#0E2E22',
    badgeBg: '#FFD166', badgeText: '#2C1A0E',
    tabActive: '#A8E6CF', tabInactive: '#7ABAA2',
    divider: 'rgba(14,46,34,0.08)',
    selectorRing: '#A8E6CF',
  },
  night: {
    key: 'night',
    bg: '#1E1A2E', card: '#2A2440', cardAlt: '#332D50',
    accentA: '#FFD166', accentB: '#FFB289', accentC: '#A8E6CF',
    textHigh: '#FFF8EE', textMid: '#C4B49A', textLow: '#7A6A52',
    overlayBottom: 'rgba(255,209,102,0.05)',
    overlayMid:    'rgba(255,178,137,0.08)',
    overlayTop:    'rgba(30,26,46,0.78)',
    glowColor: '#FFD166', glowRadius: 56,
    inputBg: '#2A2440', inputBorder: 'rgba(255,248,238,0.12)',
    inputBorderFocus: '#FFD166',
    buttonBg: '#FFD166', buttonText: '#1E1A2E',
    badgeBg: '#332D50', badgeText: '#FFF8EE',
    tabActive: '#FFD166', tabInactive: '#7A6A52',
    divider: 'rgba(255,248,238,0.08)',
    selectorRing: '#FFD166',
  },
  rain: {
    key: 'rain',
    bg: '#EEF4F9', card: '#E4EEF6', cardAlt: '#D6E6F2',
    accentA: '#7EC8E3', accentB: '#FFB289', accentC: '#A8E6CF',
    textHigh: '#0E2030', textMid: '#3A5A6E', textLow: '#6A9AAE',
    overlayBottom: 'rgba(126,200,227,0.08)',
    overlayMid:    'rgba(126,200,227,0.18)',
    overlayTop:    'rgba(238,244,249,0.75)',
    glowColor: '#7EC8E3', glowRadius: 40,
    inputBg: '#EEF4F9', inputBorder: 'rgba(14,32,48,0.12)',
    inputBorderFocus: '#7EC8E3',
    buttonBg: '#7EC8E3', buttonText: '#0E2030',
    badgeBg: '#FFB289', badgeText: '#2C1A0E',
    tabActive: '#7EC8E3', tabInactive: '#6A9AAE',
    divider: 'rgba(14,32,48,0.08)',
    selectorRing: '#7EC8E3',
  },
  sunset: {
    key: 'sunset',
    bg: '#FFF4E6', card: '#FFE8CC', cardAlt: '#FFD9B3',
    accentA: '#FFD166', accentB: '#FFB289', accentC: '#E07A9F',
    textHigh: '#2C1A0E', textMid: '#7A4A20', textLow: '#B07840',
    overlayBottom: 'rgba(255,209,102,0.10)',
    overlayMid:    'rgba(255,178,137,0.20)',
    overlayTop:    'rgba(255,244,230,0.72)',
    glowColor: '#FFD166', glowRadius: 60,
    inputBg: '#FFF4E6', inputBorder: 'rgba(44,26,14,0.12)',
    inputBorderFocus: '#FFD166',
    buttonBg: '#FFD166', buttonText: '#2C1A0E',
    badgeBg: '#FFB289', badgeText: '#2C1A0E',
    tabActive: '#FFD166', tabInactive: '#B07840',
    divider: 'rgba(44,26,14,0.08)',
    selectorRing: '#FFD166',
  },
};

// ── ATMOSPHERE HELPERS ────────────────────────────────────────────────────

export function atmosphereGradient(vibe: VibeKey): string[] {
  const p = VIBE_PACKS[vibe];
  return [p.overlayTop, p.overlayMid, p.overlayBottom];
}

// ── COMPONENT SURFACE HELPERS ─────────────────────────────────────────────
// Return flat React Native style objects keyed to the active vibe.

export function vibeCard(vibe: VibeKey) {
  const p = VIBE_PACKS[vibe];
  return {
    backgroundColor: p.card,
    borderColor: p.divider,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    ...SHADOW.sm,
  };
}

export function vibeButton(vibe: VibeKey) {
  const p = VIBE_PACKS[vibe];
  return {
    backgroundColor: p.buttonBg,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACE[3],
    paddingHorizontal: SPACE[6],
  };
}

export function vibeInput(vibe: VibeKey) {
  const p = VIBE_PACKS[vibe];
  return {
    backgroundColor: p.inputBg,
    borderColor: p.inputBorder,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingVertical: SPACE[3],
    paddingHorizontal: SPACE[4],
    color: p.textHigh,
    fontSize: TYPE.base,
  };
}

export function vibeBadge(vibe: VibeKey) {
  const p = VIBE_PACKS[vibe];
  return {
    backgroundColor: p.badgeBg,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACE[1],
    paddingHorizontal: SPACE[3],
  };
}

// ── INVARIANT SURFACE TOKENS ──────────────────────────────────────────────
// Safety, privacy, and parent-boundary surfaces never shift with the vibe.

export const SAFETY_SURFACE = {
  background:   SEMANTIC.safetyBg,
  border:       SEMANTIC.safetyBorder,
  borderWidth:  1.5,
  borderRadius: RADIUS.lg,
  text:         SEMANTIC.safetyText,
  iconColor:    SEMANTIC.safetyBorder,
} as const;

export const PRIVACY_BADGE = {
  background:   SEMANTIC.privacyIndicator,
  text:         SEMANTIC.privacyText,
  borderRadius: RADIUS.pill,
  paddingV:     SPACE[1],
  paddingH:     SPACE[3],
  fontSize:     TYPE.xs,
  fontWeight:   TYPE.semibold,
} as const;

export const PARENT_BOUNDARY = {
  background:   SEMANTIC.parentBoundary,
  text:         '#2C1A0E',
  borderRadius: RADIUS.pill,
  paddingV:     SPACE[2],
  paddingH:     SPACE[4],
  fontSize:     TYPE.sm,
  fontWeight:   TYPE.semibold,
} as const;

// ── VIBE LAB UI TOKENS ────────────────────────────────────────────────────

export const VIBE_LAB_UI = {
  chipBase: {
    borderRadius: RADIUS.xl,
    padding: SPACE[3],
    ...SHADOW.xs,
  },
  chipSelected: { borderWidth: 2.5 },
  chipLabel: {
    fontSize: TYPE.sm,
    fontWeight: TYPE.semibold,
    letterSpacing: TYPE.trackingNormal,
  },
  previewCard: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden' as const,
    ...SHADOW.md,
  },
  previewHeight: 220,
  crossfadeDuration: MOTION.vibeCrossfade,
  crossfadeEasing: MOTION.easeInOut,
} as const;

// ── LAYOUT CONSTANTS ──────────────────────────────────────────────────────

export const LAYOUT = {
  navBarHeight: 64,
  navBarPaddingV: SPACE[3],
  roomSceneAspect: '16/9' as const,
  companionBottom: 16,
  companionMaxWidth: 260,
  contentPaddingH: SPACE[5],
  contentPaddingV: SPACE[4],
  cardGap: SPACE[3],
  cardMinWidth: 150,
  sheetPeekHeight: 88,
} as const;

// ── RUNTIME ACCESSOR ──────────────────────────────────────────────────────

export function getVibe(key?: string | null): VibePalette {
  const { resolveVibeKey } = require('./vibeRegistry');
  return VIBE_PACKS[resolveVibeKey(key)];
}

// ── DESIGN TOOL TOKEN TABLE ───────────────────────────────────────────────
// Flat serialisable rows for Figma Tokens Studio / Canva brand kit import.
// Each row is the authoritative token set for one vibe preset.

export function getDesignToolTokenTable(): DesignToolTokenRow[] {
  const { PRESET_IDENTITY } = require('./vibeRegistry');
  return VIBE_KEYS.map((key) => {
    const p = VIBE_PACKS[key];
    const id = PRESET_IDENTITY[key];
    return {
      key,
      name:       id.name,
      emoji:      id.emoji,
      bg:         p.bg,
      card:       p.card,
      cardAlt:    p.cardAlt,
      accentA:    p.accentA,
      accentB:    p.accentB,
      accentC:    p.accentC,
      textHigh:   p.textHigh,
      textMid:    p.textMid,
      textLow:    p.textLow,
      glowColor:  p.glowColor,
      glowRadius: p.glowRadius,
      selectorRing: p.selectorRing,
    };
  });
}
