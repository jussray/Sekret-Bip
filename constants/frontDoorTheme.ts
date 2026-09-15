import { MOTION, RADIUS, SPACE, TYPE } from './vibeColors';

/**
 * Public welcome surfaces use a stable brand atmosphere before an account has
 * loaded a personal Vibe Lab preference. This extension keeps that atmosphere
 * in one canonical source while reusing the shared spacing, radius, type, and
 * motion scales.
 *
 * QUALITY bar: the front door should read as premium cinematic 3D family-world
 * product UI, not flat neon decoration. The reference sets finish, depth,
 * lighting, material, and composition expectations without changing character
 * canon or turning the welcome screen into a labeled character poster.
 */
export const FRONT_DOOR_THEME = {
  color: {
    page: '#05030F',
    shell: '#120927',
    shellRaised: '#1A1033',
    textHigh: '#FFFFFF',
    textMid: '#C9BDDF',
    textLow: '#A99DBC',
    eyebrow: '#D6C8FF',
    violet: '#744DFF',
    orchid: '#A764FF',
    heart: '#ED63CE',
    pinkLight: '#FFC0EC',
    lilacLight: '#F3E8FF',
    border: 'rgba(255,255,255,0.15)',
    borderStrong: 'rgba(232,215,255,0.30)',
    surfaceSoft: 'rgba(255,255,255,0.055)',
    surfaceRaised: 'rgba(255,255,255,0.105)',
    badge: 'rgba(255,255,255,0.18)',
    ambientViolet: 'rgba(126,73,255,0.30)',
    ambientPink: 'rgba(237,72,203,0.21)',
    heroGlow: 'rgba(128,74,255,0.30)',
    qualityDeep: '#030109',
    qualityBlue: 'rgba(46,123,255,0.15)',
    qualityViolet: 'rgba(129,70,255,0.18)',
    qualityMagenta: 'rgba(239,73,223,0.16)',
    qualityRim: 'rgba(220,203,255,0.24)',
  },
  gradient: {
    wordmark: ['#FF83D7', '#A66CFF', '#5A7DFF'] as const,
    action: ['#6D43F2', '#A55CFF', '#E95FCA'] as const,
    cinematicBackdrop: ['#030109', '#120628', '#060318'] as const,
    cinematicWash: [
      'rgba(46,123,255,0.12)',
      'rgba(125,70,255,0.035)',
      'rgba(239,73,223,0.13)',
    ] as const,
    cinematicVignette: [
      'rgba(3,1,9,0.30)',
      'rgba(3,1,9,0.00)',
      'rgba(3,1,9,0.46)',
    ] as const,
  },
  shadow: {
    shell: '0 46px 140px rgba(0,0,0,0.76)',
    action: '0 18px 38px rgba(125,73,255,0.42)',
    qualityRim: '0 0 42px rgba(141,91,255,0.20)',
  },
  heroSafeArea: {
    teen: {
      desktopHeight: 460,
      compactHeight: 385,
      shortHeight: 335,
      bottomGap: SPACE[3],
    },
    bipJr: {
      desktopHeight: 420,
      compactHeight: 355,
      shortHeight: 310,
      bottomGap: SPACE[4],
    },
  },
  SPACE,
  RADIUS,
  TYPE,
  MOTION,
} as const;

export type FrontDoorTheme = typeof FRONT_DOOR_THEME;
