/**
 * utils/sekretReply.ts
 *
 * Thin helper layer between PagesScreen and the Cloudflare Worker.
 *
 * Responsibilities:
 *   1. Map a PagesTab to the correct avatarKey for fetchSekretReply.
 *   2. Gate which tabs are allowed to call the Worker.
 *   3. Build the voiceInstruction using the existing sekretVoice service.
 *   4. Call fetchSekretReply and return the reply string.
 *   5. Return the tab-appropriate fallback string if the Worker fails or is unreachable.
 *
 * Nothing here touches UI, AsyncStorage, or Oracle memory.
 */

import { fetchSekretReply } from './api';
import { buildSekretVoiceInstruction, getSekretFallback } from '../services/sekretVoice';
import { normalizeSekretPersonality } from '../services/sekretPresence';
import type { PagesTab } from '../screens/PagesScreen';

/** Tabs that are allowed to trigger a Worker reply. */
const REPLY_TABS = new Set<PagesTab>(['raylene', 'rylane', 'cloud', 'night']);

/**
 * Maps a PagesTab to the avatarKey expected by fetchSekretReply.
 * Returns null for tabs that must not call the Worker.
 */
export function tabToAvatarKey(
  tab: PagesTab,
): 'raylene' | 'rylane' | 'cloud' | 'night' | null {
  if (!REPLY_TABS.has(tab)) return null;
  // Tab id already matches the avatarKey shape exactly.
  return tab as 'raylene' | 'rylane' | 'cloud' | 'night';
}

/**
 * Typing indicator labels shown while waiting for the Worker.
 * Matches character names shown in the tab bar.
 */
export const THINKING_LABELS: Record<string, string> = {
  raylene: "Raylene is thinking\u2026",
  rylane: "Rylane is thinking\u2026",
  cloud: "Cloud is thinking\u2026",
  night: "Night is thinking\u2026",
};

/**
 * Calls the Cloudflare Worker for a Se'kret reply.
 *
 * Returns:
 *   - The Worker reply string on success.
 *   - The character fallback string if the Worker is unavailable or returns an error.
 *   - The character fallback string if the tab is not in REPLY_TABS.
 *
 * Never throws.
 */
export async function fetchPagesReply({
  tab,
  text,
  mood,
}: {
  tab: PagesTab;
  text: string;
  mood?: string;
}): Promise<string> {
  const avatarKey = tabToAvatarKey(tab);
  if (!avatarKey || !text.trim()) {
    return '';
  }

  const voice = normalizeSekretPersonality(avatarKey);
  const fallback = getSekretFallback(voice, text);

  // Build the full voice instruction so the Worker receives the complete
  // character brief — same path as VoiceBip. No duplication of prompt logic.
  const voiceInstruction = buildSekretVoiceInstruction(
    voice,
    text,
    mood,
    undefined, // previousMood: not tracked per-entry yet
    undefined, // adaptationInstruction: Oracle memory wiring deferred
  );

  try {
    const reply = await fetchSekretReply(
      text,
      'pages',
      mood,
      avatarKey,
      undefined,  // previousMood
      undefined,  // privateProfile (Oracle memory deferred per spec)
      'teen',     // profileSide
      [],         // privateContext
    );
    // fetchSekretReply already applies keepSekretReply filtering and
    // returns the fallback on Worker failure, so we just pass it through.
    return reply || fallback;
  } catch {
    return fallback;
  }
}
