// context/VibeThemeContext.tsx
// Se'kret Bip — Vibe Theme Runtime Provider
//
// ═══════════════════════════════════════════════════════════════════════════
// USAGE
//
//   1. Wrap your root layout (app/_layout.tsx or App.tsx):
//        <VibeThemeProvider vibeKey={user.vibeKey}>
//          {children}
//        </VibeThemeProvider>
//
//   2. In any screen or component:
//        const { vibe, palette, setVibeKey } = useVibeTheme();
//
//   3. Apply tokens:
//        <View style={{ backgroundColor: palette.bg }}>
//          <Text style={{ color: palette.textHigh }}>hello</Text>
//        </View>
//
// The provider also re-exports all invariant tokens (SEMANTIC, TYPE, SPACE,
// RADIUS, SHADOW, MOTION, LAYOUT) so components only need a single import.
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  VIBE_PACKS,
  SEMANTIC,
  TYPE,
  SPACE,
  RADIUS,
  SHADOW,
  MOTION,
  LAYOUT,
  VIBE_LAB_UI,
  SAFETY_SURFACE,
  PRIVACY_BADGE,
  PARENT_BOUNDARY,
  atmosphereGradient,
  vibeCard,
  vibeButton,
  vibeInput,
  vibeBadge,
  type VibePalette,
} from '@/constants/vibeColors';

import {
  resolveVibeKey,
  PRESET_IDENTITY,
  type VibeKey,
  type VibePresetIdentity,
} from '@/constants/vibeRegistry';

// ── Context Shape ─────────────────────────────────────────────────────────

export type VibeThemeContextValue = {
  /** Resolved canonical VibeKey for the active preset */
  vibeKey: VibeKey;

  /** Full color/surface token palette for the active vibe */
  palette: VibePalette;

  /** Identity metadata: name, emoji, tagline, character, atmosphereType */
  identity: VibePresetIdentity;

  /** Atmosphere gradient stops [top, mid, bottom] for LinearGradient */
  atmosphereGradient: string[];

  /** Update the active vibe (e.g., from Vibe Lab screen) */
  setVibeKey: (key: string) => void;

  // ── Component helpers (pre-bound to active vibe) ────────────────────────
  card:   ReturnType<typeof vibeCard>;
  button: ReturnType<typeof vibeButton>;
  input:  ReturnType<typeof vibeInput>;
  badge:  ReturnType<typeof vibeBadge>;

  // ── Invariant token pass-throughs ───────────────────────────────────────
  // Import these from the hook so components have a single import point.
  SEMANTIC:          typeof SEMANTIC;
  TYPE:              typeof TYPE;
  SPACE:             typeof SPACE;
  RADIUS:            typeof RADIUS;
  SHADOW:            typeof SHADOW;
  MOTION:            typeof MOTION;
  LAYOUT:            typeof LAYOUT;
  VIBE_LAB_UI:       typeof VIBE_LAB_UI;
  SAFETY_SURFACE:    typeof SAFETY_SURFACE;
  PRIVACY_BADGE:     typeof PRIVACY_BADGE;
  PARENT_BOUNDARY:   typeof PARENT_BOUNDARY;
};

// ── Context + hook ────────────────────────────────────────────────────────

const VibeThemeContext = createContext<VibeThemeContextValue | null>(null);

export function useVibeTheme(): VibeThemeContextValue {
  const ctx = useContext(VibeThemeContext);
  if (!ctx) {
    throw new Error(
      'useVibeTheme() must be called inside <VibeThemeProvider>. ' +
      'Wrap your root layout with <VibeThemeProvider vibeKey={...}>.',
    );
  }
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────

type VibeThemeProviderProps = {
  /**
   * The user's stored vibe preference. Accepts any string — canonical keys,
   * legacy aliases ('flower', 'galaxy', 'neon'), or null/undefined.
   * Defaults to 'raylene'.
   */
  vibeKey?: string | null;
  children: ReactNode;
};

export function VibeThemeProvider({
  vibeKey: initialVibeKey,
  children,
}: VibeThemeProviderProps) {
  const [rawKey, setRawKey] = useState<string>(initialVibeKey ?? 'raylene');

  const setVibeKey = useCallback((key: string) => {
    setRawKey(key);
  }, []);

  const value = useMemo<VibeThemeContextValue>(() => {
    const vibeKey  = resolveVibeKey(rawKey);
    const palette  = VIBE_PACKS[vibeKey];
    const identity = PRESET_IDENTITY[vibeKey];

    return {
      vibeKey,
      palette,
      identity,
      atmosphereGradient: atmosphereGradient(vibeKey),
      setVibeKey,

      // Pre-bound component helpers
      card:   vibeCard(vibeKey),
      button: vibeButton(vibeKey),
      input:  vibeInput(vibeKey),
      badge:  vibeBadge(vibeKey),

      // Invariant token pass-throughs
      SEMANTIC,
      TYPE,
      SPACE,
      RADIUS,
      SHADOW,
      MOTION,
      LAYOUT,
      VIBE_LAB_UI,
      SAFETY_SURFACE,
      PRIVACY_BADGE,
      PARENT_BOUNDARY,
    };
  }, [rawKey, setVibeKey]);

  return (
    <VibeThemeContext.Provider value={value}>
      {children}
    </VibeThemeContext.Provider>
  );
}

export default VibeThemeContext;
