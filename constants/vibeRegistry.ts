// constants/vibeRegistry.ts
// Se'kret Bip — Canonical Vibe Preset Registry
//
// ═══════════════════════════════════════════════════════════════════════════
// THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL VIBE PRESETS.
//
// Rule: Every vibe identifier, room-scene mapping, companion mapping, legacy
// alias, and display label must be declared here first. No other file may
// define its own VibeKey enum, alias table, or preset list.
//
// Consumers:
//   • constants/vibeColors.ts  — color/token extension layer (imports VibeKey)
//   • constants/theme.ts       — asset/image layer (imports VibeKey via
//                                normalizeVibeKey, which now delegates here)
//   • context/VibeThemeContext — runtime provider (imports getCanonicalPreset)
//   • Design tools (Figma/Canva) — reference token tables exported below
// ═══════════════════════════════════════════════════════════════════════════

import type { ImageSourcePropType } from 'react-native';

// ── 1. CANONICAL VIBE KEYS ─────────────────────────────────────────────────
// These six keys are the authoritative identifiers across the entire system.
// Never add a 7th without updating VIBE_DISPLAY_ORDER and all consumers.

export const VIBE_KEYS = [
  'raylene',
  'rylane',
  'cloud',
  'night',
  'rain',
  'sunset',
] as const;

export type VibeKey = typeof VIBE_KEYS[number];

/** Ordered as they appear in Vibe Lab UI */
export const VIBE_DISPLAY_ORDER: VibeKey[] = [
  'raylene',
  'rylane',
  'cloud',
  'night',
  'rain',
  'sunset',
];

// ── 2. LEGACY ALIAS TABLE ──────────────────────────────────────────────────
// All legacy string values that have historically represented a vibe.
// resolveVibeKey() is the ONLY place where alias resolution happens.

const LEGACY_ALIAS: Record<string, VibeKey> = {
  // theme.ts era aliases
  flower:  'raylene',
  galaxy:  'rylane',
  neon:    'night',
  // numeric/positional IDs used in early builds
  '0':     'raylene',
  '1':     'rylane',
  '2':     'cloud',
  '3':     'night',
  '4':     'rain',
  '5':     'sunset',
};

/**
 * Resolve any string — canonical key, legacy alias, or unknown — to a
 * guaranteed VibeKey. Falls back to 'raylene' (the default daytime preset).
 */
export function resolveVibeKey(key?: string | null): VibeKey {
  if (!key) return 'raylene';
  if ((VIBE_KEYS as readonly string[]).includes(key)) return key as VibeKey;
  return LEGACY_ALIAS[key] ?? 'raylene';
}

// ── 3. PRESET IDENTITY ────────────────────────────────────────────────────
// Non-color metadata: display name, emoji, tagline, companion character,
// atmosphere type classification.

export type VibeAtmosphereType =
  | 'companion-day'    // Suhana's Room, Sy After Dark — companion-anchored
  | 'companion-night'  // same companions but night phase
  | 'atmosphere'       // Cloud Drift, Window Rain, Sunset Exhale — mood-first, no companion
  | 'night-comfort';   // Night Comfort — companion Night, deep surface

export type VibePresetIdentity = {
  key: VibeKey;
  name: string;
  emoji: string;
  tagline: string;
  character?: 'raylene' | 'rylane' | 'cloud' | 'night'; // undefined = atmosphere-only
  atmosphereType: VibeAtmosphereType;
  /** True for Rain and Sunset: atmosphere presets, not companion identities */
  isAtmosphereOnly: boolean;
};

export const PRESET_IDENTITY: Record<VibeKey, VibePresetIdentity> = {
  raylene: {
    key: 'raylene',
    name: "Suhana's Room",
    emoji: '🌸',
    tagline: 'scrapbook soft · fairy lights · yours',
    character: 'raylene',
    atmosphereType: 'companion-day',
    isAtmosphereOnly: false,
  },
  rylane: {
    key: 'rylane',
    name: 'Sy After Dark',
    emoji: '🌃',
    tagline: 'city chill · cool-lit · keeps it real',
    character: 'rylane',
    atmosphereType: 'companion-day',
    isAtmosphereOnly: false,
  },
  cloud: {
    key: 'cloud',
    name: 'Cloud Drift',
    emoji: '☁️',
    tagline: 'floating · fresh start · headphones in',
    character: 'cloud',
    atmosphereType: 'atmosphere',
    isAtmosphereOnly: false, // Cloud has a companion mascot
  },
  night: {
    key: 'night',
    name: 'Night Comfort',
    emoji: '🌙',
    tagline: 'late-night safe · lamp still on',
    character: 'night',
    atmosphereType: 'night-comfort',
    isAtmosphereOnly: false,
  },
  rain: {
    key: 'rain',
    name: 'Window Rain',
    emoji: '🌧️',
    tagline: 'reflective · held · rain on glass',
    character: undefined,
    atmosphereType: 'atmosphere',
    isAtmosphereOnly: true,
  },
  sunset: {
    key: 'sunset',
    name: 'Sunset Exhale',
    emoji: '🌆',
    tagline: 'golden hour · warm exhale · unwinding',
    character: undefined,
    atmosphereType: 'atmosphere',
    isAtmosphereOnly: true,
  },
};

// ── 4. ROOM PHASE MAPPING ─────────────────────────────────────────────────
// Canonical phase type. Used by theme.ts getRoomPhase() and getRoomScene().
// Declaring it here ensures vibeColors.ts and theme.ts share the same type.

export type RoomPhase =
  | 'day'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'rain'
  | 'night'
  | 'deepNight';

export const ALL_ROOM_PHASES: RoomPhase[] = [
  'day', 'midday', 'afternoon', 'evening', 'rain', 'night', 'deepNight',
];

/**
 * Canonical getRoomPhase() — shared between theme.ts and any other consumer.
 * Returns the phase that matches the current real-world time, with an
 * optional weatherMode override.
 */
export function getRoomPhase(
  date: Date = new Date(),
  weatherMode?: string,
): RoomPhase {
  if (weatherMode === 'rain') return 'rain';
  const h = date.getHours();
  if (h >= 5  && h < 10) return 'day';
  if (h >= 10 && h < 14) return 'midday';
  if (h >= 14 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  if (h >= 21)           return 'night';
  return 'deepNight'; // 0–4 AM
}

/** Normalize legacy 'deep-night' string to canonical 'deepNight' */
export function normalizeRoomPhase(phase: string): RoomPhase {
  if (phase === 'deep-night') return 'deepNight';
  if (phase === 'morning')    return 'day';
  const valid: RoomPhase[] = ALL_ROOM_PHASES;
  return valid.includes(phase as RoomPhase) ? (phase as RoomPhase) : 'day';
}

// ── 5. CANONICAL PRESET RECORD TYPE ───────────────────────────────────────
// The full preset shape that joins identity + room scenes.
// color tokens are supplied by vibeColors.ts — not duplicated here.

export type CanonicalPreset = VibePresetIdentity & {
  /** Room scene image for the CURRENT phase (resolved at runtime) */
  roomScene: (phase: RoomPhase) => ImageSourcePropType;
  /** Default/hero room scene shown in Vibe Lab selector and previews */
  heroScene: ImageSourcePropType;
};

// ── 6. DESIGN TOOL EXPORT TABLE ───────────────────────────────────────────
// A flat, serialisable representation of all presets for use in Figma tokens
// plugins (e.g., Tokens Studio) or Canva brand kits. This must match the
// token values in vibeColors.ts VIBE_PACKS exactly.
//
// Format: { [vibeKey]: { [tokenName]: value } }
// Generated from vibeColors.ts VIBE_PACKS to guarantee zero drift.

export type DesignToolTokenRow = {
  key: VibeKey;
  name: string;
  emoji: string;
  // Surface
  bg: string;
  card: string;
  cardAlt: string;
  // Accents
  accentA: string;
  accentB: string;
  accentC: string;
  // Text
  textHigh: string;
  textMid: string;
  textLow: string;
  // Glow
  glowColor: string;
  glowRadius: number;
  // Selector
  selectorRing: string;
};

// The actual token table is assembled in vibeColors.ts (to avoid circular
// imports) and re-exported from the index barrel. See the
// getDesignToolTokenTable() function there.
