// Generated from bip-vibe-tokens.zip (June 2026).
// This is the app-facing source of truth for the six Figma vibe token sets.

import type { VibeKey } from './vibeRegistry';

export const GLOBAL_VIBE_TOKENS = {
  typography: {
    size: { xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 30, hero: 40 },
    weight: { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
    lineHeight: { none: 1, snug: 1.35, relaxed: 1.6 },
    letterSpacing: { tight: -0.3, normal: 0, wide: 0.5, upper: 1.2 },
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96 },
  radius: { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, card: 18, pill: 999 },
  motion: {
    duration: { instant: 80, fast: 180, normal: 300, relaxed: 480, slow: 700, breath: 1200, vibeCrossfade: 600 },
    spring: { damping: 18, stiffness: 180, mass: 1 },
    springGentle: { damping: 22, stiffness: 120, mass: 1 },
  },
  safety: { bg: '#FFF3F3', border: '#E07A9F', text: '#8B1A3A', borderWidth: 1.5, radius: 12 },
  privacy: { indicator: '#7EC8E3', text: '#1A4A5C', bg: '#E8F5FA', radius: 999 },
  parentBoundary: { border: '#FFD166', text: '#2C1A0E', bg: '#FFFBE6', borderWidth: 2, radius: 16 },
  verification: { badge: '#A8E6CF', text: '#0E2E22', icon: '#3A6A52', bg: '#E8FAF4', radius: 999 },
  layout: { navBarHeight: 64, companionMaxWidth: 260, contentPaddingH: 20, contentPaddingV: 16, cardGap: 12, cardMinWidth: 150, sheetPeekHeight: 88 },
} as const;

export type VibeDesignTokenSet = {
  metadata: {
    vibeKey: VibeKey;
    displayName: string;
    atmosphere: 'companion-day' | 'night-comfort' | 'atmosphere';
    character: 'raylene' | 'rylane' | 'cloud' | 'night' | null;
    isAtmosphereOnly: boolean;
    isDarkSurface?: boolean;
    isCompanionMascot?: boolean;
  };
  color: {
    bg: string;
    card: string;
    cardAlt: string;
    accentA: string;
    accentB: string;
    accentC: string;
    textHigh: string;
    textMid: string;
    textLow: string;
    divider: string;
    glowColor: string;
    glowRadius: number;
    selectorRing: string;
  };
  overlay: { base: string; accent: string; primary: string };
  input: { bg: string; border: string; borderFocus: string; radius: number };
  button: {
    primaryBg: string;
    primaryText: string;
    secondaryBg: string;
    secondaryText: string;
    secondaryBorder: string;
    radius: number;
  };
  badge: { bg: string; text: string; radius: number };
};

const createVibe = (
  metadata: VibeDesignTokenSet['metadata'],
  color: VibeDesignTokenSet['color'],
  overlay: VibeDesignTokenSet['overlay'],
  component?: Partial<Pick<VibeDesignTokenSet, 'input' | 'button' | 'badge'>>,
): VibeDesignTokenSet => ({
  metadata,
  color,
  overlay,
  input: component?.input ?? {
    bg: color.bg,
    border: color.divider,
    borderFocus: color.accentA,
    radius: GLOBAL_VIBE_TOKENS.radius.md,
  },
  button: component?.button ?? {
    primaryBg: color.accentA,
    primaryText: color.textHigh,
    secondaryBg: color.card,
    secondaryText: color.textHigh,
    secondaryBorder: color.accentA,
    radius: GLOBAL_VIBE_TOKENS.radius.pill,
  },
  badge: component?.badge ?? {
    bg: color.accentB,
    text: color.textHigh,
    radius: GLOBAL_VIBE_TOKENS.radius.pill,
  },
});

export const VIBE_DESIGN_TOKENS: Record<VibeKey, VibeDesignTokenSet> = {
  raylene: createVibe(
    { vibeKey: 'raylene', displayName: "Suhana's Room", atmosphere: 'companion-day', character: 'raylene', isAtmosphereOnly: false },
    { bg: '#FFF8EE', card: '#FFF1E6', cardAlt: '#FFE8D6', accentA: '#FFB289', accentB: '#FFD166', accentC: '#F4A0C8', textHigh: '#2C1A0E', textMid: '#7A5030', textLow: '#B08060', divider: 'rgba(44,26,14,0.08)', glowColor: '#FFB289', glowRadius: 48, selectorRing: '#FFB289' },
    { base: 'rgba(255,248,238,0.70)', accent: 'rgba(255,209,102,0.14)', primary: 'rgba(255,178,137,0.06)' },
  ),
  rylane: createVibe(
    { vibeKey: 'rylane', displayName: 'Sy After Dark', atmosphere: 'companion-day', character: 'rylane', isAtmosphereOnly: false },
    { bg: '#EFF6FA', card: '#E4EFF6', cardAlt: '#D6E8F3', accentA: '#7EC8E3', accentB: '#A8E6CF', accentC: '#FFB289', textHigh: '#0E2433', textMid: '#3A6070', textLow: '#7AACBA', divider: 'rgba(14,36,51,0.08)', glowColor: '#7EC8E3', glowRadius: 52, selectorRing: '#7EC8E3' },
    { base: 'rgba(239,246,250,0.72)', accent: 'rgba(168,230,207,0.12)', primary: 'rgba(126,200,227,0.07)' },
  ),
  cloud: createVibe(
    { vibeKey: 'cloud', displayName: 'Cloud Drift', atmosphere: 'atmosphere', character: 'cloud', isAtmosphereOnly: false, isCompanionMascot: true },
    { bg: '#F3FEFA', card: '#E8FAF4', cardAlt: '#D8F5EC', accentA: '#A8E6CF', accentB: '#7EC8E3', accentC: '#FFD166', textHigh: '#0E2E22', textMid: '#3A6A52', textLow: '#7ABAA2', divider: 'rgba(14,46,34,0.08)', glowColor: '#A8E6CF', glowRadius: 44, selectorRing: '#A8E6CF' },
    { base: 'rgba(243,254,250,0.74)', accent: 'rgba(126,200,227,0.12)', primary: 'rgba(168,230,207,0.08)' },
    { badge: { bg: '#A8E6CF', text: '#0E2E22', radius: 999 } },
  ),
  night: createVibe(
    { vibeKey: 'night', displayName: 'Night Comfort', atmosphere: 'night-comfort', character: 'night', isAtmosphereOnly: false, isDarkSurface: true },
    { bg: '#1E1A2E', card: '#2A2440', cardAlt: '#332D50', accentA: '#FFD166', accentB: '#FFB289', accentC: '#A8E6CF', textHigh: '#FFF8EE', textMid: '#C4B49A', textLow: '#7A6A52', divider: 'rgba(255,248,238,0.08)', glowColor: '#FFD166', glowRadius: 56, selectorRing: '#FFD166' },
    { base: 'rgba(30,26,46,0.78)', accent: 'rgba(255,178,137,0.08)', primary: 'rgba(255,209,102,0.05)' },
    {
      input: { bg: '#2A2440', border: 'rgba(255,248,238,0.08)', borderFocus: '#FFD166', radius: 12 },
      button: { primaryBg: '#FFD166', primaryText: '#1E1A2E', secondaryBg: '#2A2440', secondaryText: '#FFF8EE', secondaryBorder: '#FFD166', radius: 999 },
      badge: { bg: '#332D50', text: '#FFF8EE', radius: 999 },
    },
  ),
  rain: createVibe(
    { vibeKey: 'rain', displayName: 'Window Rain', atmosphere: 'atmosphere', character: null, isAtmosphereOnly: true },
    { bg: '#EEF4F9', card: '#E4EEF6', cardAlt: '#D6E6F2', accentA: '#7EC8E3', accentB: '#FFB289', accentC: '#A8E6CF', textHigh: '#0E2030', textMid: '#3A5A6E', textLow: '#6A9AAE', divider: 'rgba(14,32,48,0.08)', glowColor: '#7EC8E3', glowRadius: 40, selectorRing: '#7EC8E3' },
    { base: 'rgba(238,244,249,0.75)', accent: 'rgba(126,200,227,0.18)', primary: 'rgba(126,200,227,0.08)' },
    { badge: { bg: '#FFB289', text: '#2C1A0E', radius: 999 } },
  ),
  sunset: createVibe(
    { vibeKey: 'sunset', displayName: 'Sunset Exhale', atmosphere: 'atmosphere', character: null, isAtmosphereOnly: true },
    { bg: '#FFF4E6', card: '#FFE8CC', cardAlt: '#FFD9B3', accentA: '#FFD166', accentB: '#FFB289', accentC: '#E07A9F', textHigh: '#2C1A0E', textMid: '#7A4A20', textLow: '#B07840', divider: 'rgba(44,26,14,0.08)', glowColor: '#FFD166', glowRadius: 60, selectorRing: '#FFD166' },
    { base: 'rgba(255,244,230,0.72)', accent: 'rgba(255,178,137,0.20)', primary: 'rgba(255,209,102,0.10)' },
  ),
};

export const getVibeDesignTokens = (key: VibeKey): VibeDesignTokenSet =>
  VIBE_DESIGN_TOKENS[key];
