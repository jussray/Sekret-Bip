/**
 * constants/guardrails.ts
 *
 * Single source of truth for all app-wide guardrail rules.
 * Covers guardrails 5, 6, 7, and 14.
 *
 * NOTHING HERE TOUCHES UI — this is pure data consumed by
 * screens, hooks, and components.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Guardrail 6 — Age boundary
// ─────────────────────────────────────────────────────────────────────────────

/** Inclusive age range that Teen onboarding accepts. */
export const TEEN_AGE_RANGE = { min: 10, max: 19 };

/** Message shown when age is outside the teen range during onboarding. */
export const AGE_BOUNDARY_MESSAGES = {
  tooYoung: "Se'kret Bip is for teens aged 10–19. Have a parent or guardian take a look.",
  tooOld:   "Looks like you might be over 19! The parent side of Se'kret Bip is made for you. Tap \"Parent\" on the sign-in screen.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Guardrail 7 — Content safety
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard soft message shown when a post or image is flagged.
 * No shame language. Always gives an edit path.
 */
export const CONTENT_SAFETY_MESSAGE =
  "This post flagged a safety check. You can edit it and try again — nothing was lost.";

/**
 * Keywords that trigger a client-side soft warning before posting.
 * This is a secondary layer — the Worker also filters.
 * Keep this list short and obvious. False positives hurt trust.
 */
export const SOFT_CONTENT_FLAGS = [
  'kill myself', 'want to die', 'end it all', 'hurt myself',
];

/**
 * Crisis resource shown when soft flags fire.
 * Always visible, never hidden behind another tap.
 */
export const CRISIS_NUDGE =
  "If you\'re going through something heavy right now, Comfort is here. You can also text HOME to 741741.";

// ─────────────────────────────────────────────────────────────────────────────
// Guardrail 11 — Progress / reward (no-punishment streak tone)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Messages shown when a streak is broken.
 * Rotate through these so it feels alive, not scripted.
 * Tone: warm, gentle, forward-looking. Zero shame.
 */
export const STREAK_RECOVERY_MESSAGES = [
  "You missed a few days — that's completely okay. Pick back up whenever you're ready. 💜",
  "Streaks don't define you. You showed up before and you can show up again.",
  "Life got busy. No worries. Your space is still here exactly as you left it.",
  "Missing days doesn't mean starting over — it just means today is a new day.",
  "Hey, you came back. That already counts. 💜",
];

/**
 * Returns a recovery message based on a numeric seed (e.g. days missed modulo length).
 */
export function getStreakRecoveryMessage(seed: number): string {
  return STREAK_RECOVERY_MESSAGES[seed % STREAK_RECOVERY_MESSAGES.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardrail 14 — App-wide tone
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic fallback messages for each error type.
 * Used when a screen-specific message isn't available.
 * Tone rule: warm, plain, teen-safe. No clinical robot language.
 */
export const TONE = {
  loadError:   "Couldn't load this right now. Try again in a sec.",
  saveError:   "Didn't save — your entry is still here though. Tap to try again.",
  networkError:"Se'kret Bip saved it on your device. It'll sync when you're back online.",
  emptyJournal:"Nothing here yet. This is your space — whenever you're ready.",
  emptyMood:   "No moods logged yet. Tap the mood bar whenever you feel something.",
  emptyCircle: "Your circle is quiet. Be the first one to post something today.",
  emptyCrew:   "No crew yet. Add someone you trust.",
  emptyVoice:  "No voice bips yet. Tap record when you have something to say.",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Guardrail 10 — Data ownership copy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plain-language privacy copy rendered in Settings → Privacy section.
 * All items are displayed as a list. Keep under 2 lines each.
 */
export const PRIVACY_COPY = [
  { emoji: '📱', text: 'Your journal stays private on this device unless you share it.' },
  { emoji: '🔒', text: 'Mood history is yours alone — parents see only what you choose to share.' },
  { emoji: '☁️', text: 'When you\'re online, your entries back up securely to the cloud.' },
  { emoji: '👀', text: 'Parents only see posts you\'ve marked as \"Shared with parent\".' },
  { emoji: '🗑️', text: 'You can clear all local data from this screen any time.' },
  { emoji: '🚫', text: 'We don\'t sell your data. Se\'kret Bip is not an ad product.' },
];
