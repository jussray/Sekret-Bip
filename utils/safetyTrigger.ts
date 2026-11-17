/**
 * safetyTrigger.ts — Trust-04: Safety-Trigger Detection & Warm Response
 *
 * Detects high-risk language in user-generated content (journal entries,
 * chat messages, free-text inputs) and returns a warm, supportive response
 * object — never a punitive action.
 *
 * Design principles:
 *  - Never punish users for expressing pain. The goal is connection, not moderation.
 *  - False positives are better than false negatives, but err toward gentle support.
 *  - No content is stored differently because it triggered this check.
 *  - This runs client-side as a first layer; server-side checks can augment.
 *
 * Usage:
 *   const result = safetyTrigger.check(userText);
 *   if (result.triggered) {
 *     showSafetyResponse(result.level, result.message);
 *   }
 */

export type SafetyLevel = 'none' | 'low' | 'medium' | 'high';

export interface SafetyTriggerResult {
  triggered: boolean;
  level: SafetyLevel;
  /** Warm message to show the user. Never clinical or alarming. */
  message: string;
  /** Whether to prominently surface crisis resources alongside the message. */
  showCrisisResources: boolean;
  /** Internal only — do not show to user. For analytics/logging if needed. */
  _matchedPatterns: string[];
}

interface TriggerPattern {
  pattern: RegExp;
  level: SafetyLevel;
  label: string;
}

const TRIGGER_PATTERNS: TriggerPattern[] = [
  {
    pattern: /\b(kill\s+my\s*self|end\s+my\s+life|take\s+my\s+life|want\s+to\s+die|wish\s+i\s+(was|were)\s+dead|suicid(e|al)|self[\s-]?harm|cut\s+my(self)?|hurt\s+my(self)?)\b/i,
    level: 'high',
    label: 'direct-self-harm',
  },
  {
    pattern: /\b(being\s+abused|someone\s+(is\s+)?hurting\s+me|sexually\s+assault(ed)?|raped|domestic\s+violence)\b/i,
    level: 'high',
    label: 'abuse-disclosure',
  },
  {
    pattern: /\b(no\s+point\s+(in\s+)?living|can't\s+go\s+on|give\s+up\s+on\s+(life|everything)|nothing\s+to\s+live\s+for|everyone\s+would\s+be\s+better\s+without\s+me|disappear\s+forever|never\s+wake\s+up)\b/i,
    level: 'medium',
    label: 'hopelessness',
  },
  {
    pattern: /\b(not\s+eating|starving\s+my(self)?|purging|throwing\s+up\s+(on\s+purpose)?|hate\s+my\s+(body|weight|food))\b/i,
    level: 'medium',
    label: 'eating-disorder',
  },
  {
    pattern: /\b(feeling\s+hopeless|feel\s+so\s+alone|can't\s+take\s+it|breaking\s+down|falling\s+apart|no\s+one\s+(cares|understands)|completely\s+lost)\b/i,
    level: 'low',
    label: 'general-distress',
  },
];

const RESPONSES: Record<SafetyLevel, string> = {
  none: '',
  low:
    `It sounds like things feel really heavy right now. You don't have to carry this alone — Bip is here, and so are people who care.`,
  medium:
    `What you're feeling matters, and so do you. It takes courage to put words to hard things. If you ever need someone to talk to beyond Bip, real support is just a tap away.`,
  high:
    'Thank you for trusting Bip with something so hard. Please know — you matter, and you deserve real support right now. Free, confidential help is available any time.',
};

export const safetyTrigger = {
  check(text: string): SafetyTriggerResult {
    if (!text || text.trim().length < 3) return _noTrigger();

    const normalised = text.toLowerCase();
    const matched: TriggerPattern[] = [];
    for (const trigger of TRIGGER_PATTERNS) {
      if (trigger.pattern.test(normalised)) matched.push(trigger);
    }
    if (matched.length === 0) return _noTrigger();

    const topLevel = _highestLevel(matched.map((match) => match.level));
    return {
      triggered: true,
      level: topLevel,
      message: RESPONSES[topLevel],
      showCrisisResources: topLevel === 'high' || topLevel === 'medium',
      _matchedPatterns: matched.map((match) => match.label),
    };
  },

  async checkAsync(text: string): Promise<SafetyTriggerResult> {
    return this.check(text);
  },
};

function _noTrigger(): SafetyTriggerResult {
  return {
    triggered: false,
    level: 'none',
    message: '',
    showCrisisResources: false,
    _matchedPatterns: [],
  };
}

const LEVEL_ORDER: SafetyLevel[] = ['none', 'low', 'medium', 'high'];

function _highestLevel(levels: SafetyLevel[]): SafetyLevel {
  return levels.reduce(
    (max, level) => LEVEL_ORDER.indexOf(level) > LEVEL_ORDER.indexOf(max) ? level : max,
    'none' as SafetyLevel,
  );
}
