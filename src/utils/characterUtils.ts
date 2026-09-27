/**
 * characterUtils
 * Helpers for resolving the active Se'kret character from a theme/sekret key.
 */

export type ActiveCharacter = 'raylene' | 'rylane' | 'cloud' | 'night' | null;

/**
 * Maps any stored sekret/theme key to a typed character identity.
 * 'soft' is the legacy AsyncStorage key for Suhana — kept for backwards compat.
 */
export function getActiveCharacter(themeKey: string): ActiveCharacter {
  if (themeKey === 'raylene' || themeKey === 'soft') return 'raylene';
  if (themeKey === 'rylane') return 'rylane';
  if (themeKey === 'cloud') return 'cloud';
  if (themeKey === 'night') return 'night';
  return null;
}

/**
 * Returns true if the given key resolves to a known character.
 * Useful for guarding character-specific UI branches.
 * Accepts `string | null` safely.
 */
export function isKnownCharacter(key: string | null): key is ActiveCharacter {
  if (key === null) return false;
  return getActiveCharacter(key) !== null;
}
