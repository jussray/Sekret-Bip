/**
 * SEKRET_PROFILES
 * Canonical personality definitions for all Se'kret characters.
 * Previously inlined in app/index.tsx — now shared across AppContent,
 * RouteRenderer, and any screen that needs profile metadata.
 *
 * Key mapping:
 *   'soft'   → Star (legacy key kept for AsyncStorage backwards compat)
 *   'raylene'→ Star (internal key kept for data/API backwards compat)
 *   'rylane' → Sy
 *   'cloud'  → Cloud Se'kret
 *   'night'  → Night Se'kret
 */
export interface SekretProfile {
  name: string;
  emoji: string;
  title: string;
  vibe: string;
  greeting: string;
}

export const SEKRET_PROFILES: Record<string, SekretProfile> = {
  soft: {
    name: 'Star',
    emoji: '🌸',
    title: 'Favorite Older Sister',
    vibe: 'Funny, warm, protective, and impossible to fool.',
    greeting: 'friend... 😭 okay, what happened?',
  },
  raylene: {
    name: 'Star',
    emoji: '🌸',
    title: 'Favorite Older Sister',
    vibe: 'Funny, warm, protective, and impossible to fool.',
    greeting: 'friend... 😭 okay, what happened?',
  },
  rylane: {
    name: 'Sy',
    emoji: '⚡',
    title: 'Loyal Bro',
    vibe: 'Quiet loyalty. Keeps it real. Never talks down.',
    greeting: "Aight, what's actually on your mind? No fake 'I'm fine'.",
  },
  cloud: {
    name: "Cloud Se'kret",
    emoji: '☁️',
    title: 'Quiet Observer',
    vibe: 'Notices. Waits. Rarely pushes.',
    greeting: 'something feels different today.',
  },
  night: {
    name: "Night Se'kret",
    emoji: '🌙',
    title: 'The Light Left On',
    vibe: 'Presence. Not conversation.',
    greeting: 'rough night?',
  },
};

/** Resolve any stored key (including legacy 'soft') to the canonical profile */
export function getProfile(key: string): SekretProfile {
  return SEKRET_PROFILES[key] ?? SEKRET_PROFILES.soft;
}
