// constants/moodGlow.ts — single source of truth for "what color is this mood"
//
// Previously this exact map (or a fuzzy `glowFor()` matcher built on the same
// five colors) was copy-pasted into 15 screen files independently, drifting
// slightly each time. Screens should import from here instead of keeping a
// local copy — see docs/UX_AUDIT.md Section 2.2.

export const MOOD_GLOW: Record<string, string> = {
  // Heavy
  sad: '#7dd3fc', anxious: '#7dd3fc', frustrated: '#f472b6', angry: '#f472b6',
  lonely: '#818cf8', overwhelmed: '#f472b6', hurt: '#7dd3fc', disappointed: '#a78bfa',
  stressed: '#f472b6',
  // Steady
  calm: '#c4b5fd', reflective: '#a78bfa', tired: '#6d28d9', okay: '#c4b5fd',
  content: '#86efac', thoughtful: '#a78bfa', hopeful: '#6ee7b7', grateful: '#fde68a',
  // Winning
  proud: '#fbbf24', motivated: '#fb923c', confident: '#fbbf24', excited: '#fb7185',
  accomplished: '#fbbf24', loved: '#e879f9', connected: '#34d399', celebrating: '#fbbf24',
  'locked-in': '#60a5fa', 'glow-up': '#fbbf24',
  // Fun
  crushing: '#fb7185', unbothered: '#c4b5fd', curious: '#60a5fa',
  relieved: '#86efac', 'feeling-seen': '#e879f9',
  // Legacy capitalized keys (older mood-tag format, still written by some screens)
  Happy: '#fbbf24', Neutral: '#c4b5fd', Sad: '#7dd3fc', Angry: '#f472b6', Tired: '#6d28d9',
};

const DEFAULT_GLOW = '#c4b5fd';

// Fuzzy matcher for free-text mood strings (vs. MOOD_GLOW's exact-key lookup).
// `fallback` lets a screen keep its own default tint when mood is unset/unmatched
// (e.g. Manhood/Womanhood fall back to their character accent, not the generic purple).
export function glowForMood(mood?: string, fallback: string = DEFAULT_GLOW): string {
  const m = (mood || '').toLowerCase();
  if (m.includes('happy')) return '#fbbf24';
  if (m.includes('sad') || m.includes('anx')) return '#7dd3fc';
  if (m.includes('angry') || m.includes('over') || m.includes('stress')) return '#f472b6';
  if (m.includes('tired')) return '#6d28d9';
  if (m.includes('calm')) return '#c4b5fd';
  return fallback;
}
