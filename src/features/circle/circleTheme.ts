/**
 * Circle view tokens — dark "night sky" treatment from the Circle design
 * reference (Open Bip / My Circle / Crew Bip boards).
 *
 * The app ships `userInterfaceStyle: "dark"`, so only the dark set is wired.
 * A light set belongs with an app-wide theme switch, not a Circle-only one.
 */
export const CIRCLE_COLORS = {
  bg: '#0a0520',
  bgDeep: '#07031a',
  card: '#140a2c',
  cardRaised: '#1a0e38',
  border: '#34205e',
  borderSoft: '#2a1850',
  text: '#f4eeff',
  textSoft: '#d9ccf5',
  muted: '#9a88bf',
  faint: '#6d5b92',
  accent: '#8b5cf6',
  accentSoft: '#c4b5fd',
  chip: '#1d1140',
  chipActive: '#7c3aed',
  pill: '#1c1038',
  pillSelected: '#3b1a6b',
  danger: '#3b1025',
  dangerText: '#fecdd3',
} as const;

/** Header + primary-action gradient: violet into night blue. */
export const CIRCLE_GRADIENT = ['#7c3aed', '#4f46e5'] as const;
/** Soft sky wash behind the Open Bip header. */
export const CIRCLE_SKY = ['#241050', '#140a2c', '#0a0520'] as const;
