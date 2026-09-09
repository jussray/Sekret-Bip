import { MOTION, RADIUS, SPACE, TYPE } from './vibeColors';

/**
 * Public welcome surfaces use a stable brand atmosphere before an account has
 * loaded a personal Vibe Lab preference. This extension keeps that atmosphere
 * in one canonical source while reusing the shared spacing, radius, type, and
 * motion scales.
 */
export const FRONT_DOOR_THEME = {
  color: {
    page: '#05030F',
    shell: '#120927',
    shellRaised: '#1A1033',
    textHigh: '#FFFFFF',
    textMid: '#C9BDDF',
    textLow: '#A99DBC',
    eyebrow: '#BDA8EE',
    violet: '#6549E7',
    orchid: '#9C63ED',
    heart: '#DC68B1',
    pinkLight: '#F2A4D5',
    lilacLight: '#F1D3FF',
    border: 'rgba(255,255,255,0.13)',
    borderStrong: 'rgba(255,255,255,0.20)',
    surfaceSoft: 'rgba(255,255,255,0.05)',
    surfaceRaised: 'rgba(255,255,255,0.09)',
    badge: 'rgba(255,255,255,0.16)',
    ambientViolet: 'rgba(137,91,241,0.22)',
    ambientPink: 'rgba(231,81,162,0.15)',
    heroGlow: 'rgba(142,89,255,0.18)',
  },
  gradient: {
    wordmark: ['#F07BC3', '#8B64FF', '#596BE1'] as const,
    action: ['#6549E7', '#9C63ED', '#DC68B1'] as const,
  },
  shadow: {
    shell: '0 40px 110px rgba(0,0,0,0.66)',
    action: '0 16px 30px rgba(101,65,219,0.35)',
  },
  heroSafeArea: {
    teen: {
      desktopHeight: 430,
      compactHeight: 360,
      shortHeight: 320,
      bottomGap: SPACE[3],
    },
    bipJr: {
      desktopHeight: 400,
      compactHeight: 340,
      shortHeight: 300,
      bottomGap: SPACE[4],
    },
  },
  SPACE,
  RADIUS,
  TYPE,
  MOTION,
} as const;

export type FrontDoorTheme = typeof FRONT_DOOR_THEME;
