export const BIP_COLORS = {
  night: '#120D1F',
  deepPlum: '#24112F',
  indigo: '#2B2E59',
  smokyBerry: '#6A3D63',
  paperBeige: '#E7D8C4',
  moonGold: '#D5B56B',
  cloudBlue: '#98B7D3',
  softBerry: '#9E4D64',
  softWhite: '#F7F2F8',
  ink: '#211B29',
  mutedText: '#B8AEC0',
  overlay: 'rgba(10, 7, 18, 0.68)',
} as const;

export const BIP_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BIP_RADII = {
  chip: 12,
  card: 20,
  sheet: 28,
  pill: 999,
} as const;

export const BIP_MOBILE_FRAMES = {
  compact: { width: 360, height: 800 },
  standard: { width: 390, height: 844 },
  large: { width: 430, height: 932 },
} as const;

export const BIP_TOUCH_TARGET = 44;
