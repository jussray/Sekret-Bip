// constants/vibeIndex.ts
// Se'kret Bip — Canonical Vibe System Barrel Export
//
// Single import point for all vibe-system consumers.
// Import order matters: registry first, then extensions.
//
// Usage:
//   import { VibeKey, VIBE_PACKS, resolveVibeKey, useVibeTheme } from '@/constants/vibeIndex';

// ── Canonical registry (keys, phases, identity) ───────────────────────────
export type { VibeKey, RoomPhase, VibePresetIdentity, VibeAtmosphereType, CanonicalPreset, DesignToolTokenRow } from './vibeRegistry';
export {
  VIBE_KEYS,
  VIBE_DISPLAY_ORDER,
  PRESET_IDENTITY,
  resolveVibeKey,
  getRoomPhase,
  normalizeRoomPhase,
  ALL_ROOM_PHASES,
} from './vibeRegistry';

// ── Token extension layer (colors, typography, spacing, motion) ───────────
export type { VibePalette, ShadowToken } from './vibeColors';
export {
  FOUNDATION,
  SEMANTIC,
  TYPE,
  SPACE,
  RADIUS,
  SHADOW,
  MOTION,
  VIBE_PACKS,
  VIBE_LAB_UI,
  LAYOUT,
  SAFETY_SURFACE,
  PRIVACY_BADGE,
  PARENT_BOUNDARY,
  atmosphereGradient,
  vibeCard,
  vibeButton,
  vibeInput,
  vibeBadge,
  getVibe,
  getDesignToolTokenTable,
} from './vibeColors';

// ── Figma/Tokens Studio contract (June 2026) ──────────────────────────────
export type { VibeDesignTokenSet } from './vibeDesignTokens';
export {
  GLOBAL_VIBE_TOKENS,
  VIBE_DESIGN_TOKENS,
  getVibeDesignTokens,
} from './vibeDesignTokens';

// ── Runtime hook + provider ───────────────────────────────────────────────
export { useVibeTheme, VibeThemeProvider } from '../context/VibeThemeContext';
export type { VibeThemeContextValue } from '../context/VibeThemeContext';
