/**
 * src/features/safety/safetyCoordinator.ts
 *
 * Safety Coordinator — Phase 2E
 *
 * Turns moderation results into experiences rather than database rows.
 *
 * The Edge Function (supabase/functions/safety-scan) already handles:
 *   - Two-layer scan (keyword + OpenAI Moderation)
 *   - Writing safety_alerts rows
 *   - Setting safety_flagged = true on source rows
 *   - Parent notification for high-severity
 *
 * This coordinator handles the CLIENT experience:
 *   - Pre-flight check before posting (synchronous, no network)
 *   - Post-scan check (async poll of safety_alerts)
 *   - Maps severity → SafetyTier → SafetyExperience
 *   - Acknowledgment (AsyncStorage, not DB — no extra migration needed)
 *
 * Three tiers:
 *   emotional_support   — low:    companion check-in, soft resources
 *   concerning_pattern  — medium: companion + Bridge nudge + Comfort tools
 *   immediate_danger    — high:   crisis lines front-and-center, parent notified
 *
 * Security constraints:
 *   - Tier 3 messages are STATIC (not AI-generated) — no hallucination risk
 *   - No event emission — safety data never touches the point ledger
 *   - Never throws — degrades silently without auth/network
 *   - Acknowledgment is local-only; the DB alert row is never mutated by client
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/utils/supabase';
import type { CompanionId } from '@/features/sekret/companionEngine';

// ── Tier definitions ───────────────────────────────────────────────────────────

export type SafetyTier =
  | 'emotional_support'   // low severity
  | 'concerning_pattern'  // medium severity
  | 'immediate_danger';   // high severity

// ── Experience shape ───────────────────────────────────────────────────────────

export interface CrisisResource {
  label:  string;
  detail: string;
  action: 'call_988' | 'text_741741' | 'call_911';
}

export interface SafetyAction {
  label:  string;
  target: 'comfort' | 'bridge' | 'journal' | 'dismiss' | 'call_988' | 'text_741741';
}

export interface SafetyExperience {
  tier:              SafetyTier;
  companionId:       CompanionId;
  companionMessage:  string;
  actions:           SafetyAction[];
  resources:         CrisisResource[];
  parentNotified:    boolean;
  alertId?:          number;
}

// ── Crisis resources (always static, always visible at tier 3) ─────────────────

const CRISIS_RESOURCES: CrisisResource[] = [
  { label: '988 Suicide & Crisis Lifeline', detail: 'call or text 988',           action: 'call_988' },
  { label: 'Crisis Text Line',              detail: 'text HOME to 741741',         action: 'text_741741' },
];

// ── Companion messages (static — never AI-generated for safety tiers) ──────────

type CompanionMessages = Record<SafetyTier, Partial<Record<CompanionId, string>> & { default: string }>;

const MESSAGES: CompanionMessages = {
  emotional_support: {
    default: "hey. sounds like something's heavy. I'm here — no pressure to explain.",
    suhana: "hey. sounds like something's heavy. I'm here if you want to talk, or just sit.",
    sy:     "that's a lot to hold. I'm here. no judgment, no pressure.",
    cloud:   "come sit for a sec. you don't have to carry this one alone.",
    night:   "rough night. I'm still here. one breath at a time.",
    sekret:  "I noticed. You don't have to name it right now. I'm here.",
  },
  concerning_pattern: {
    default: "I'm noticing this feels heavy. You don't have to push through alone — Comfort is here, and Bridge can help you reach someone who loves you.",
    suhana: "okay, I'm right here. This feels like a lot. Comfort is here, and if you want your parent to know you need support, Bridge can help with that.",
    sy:     "this is the moment to not carry it alone. Comfort. Bridge. One of those — your call. I'll be here.",
    cloud:   "let's make it smaller. Comfort first. And Bridge is there if you want someone to know you need support.",
    night:   "you don't have to hold this in the dark. Comfort or Bridge — both are safe.",
    sekret:  "the pattern says you've been here before. You deserve support. Comfort and Bridge are both here.",
  },
  immediate_danger: {
    default: "You matter. Right now — cold water, sit down, one breath. If it feels like you might hurt yourself, please reach out to a real person or a crisis line.",
    suhana: "I love you and I'm scared for you right now. Please — cold water, sit down. Call or text 988. Your parent has been quietly notified.",
    sy:     "I'm serious right now. Cold water. Sit down. Call 988. You're not alone in this.",
    cloud:   "one thing. cold water on your face. then 988 or text HOME to 741741. I'm staying right here.",
    night:   "stay here with me. one breath. then call 988 or text HOME to 741741. please.",
    sekret:  "this is the moment that matters most. One breath. Then 988 or text HOME to 741741. You are worth staying.",
  },
};

function getCompanionMessage(tier: SafetyTier, companionId: CompanionId): string {
  return MESSAGES[tier][companionId] ?? MESSAGES[tier].default;
}

// ── Actions per tier ───────────────────────────────────────────────────────────

function actionsForTier(tier: SafetyTier): SafetyAction[] {
  if (tier === 'immediate_danger') {
    return [
      { label: 'call or text 988',    target: 'call_988' },
      { label: 'text HOME to 741741', target: 'text_741741' },
      { label: "I'm okay for now",    target: 'dismiss' },
    ];
  }
  if (tier === 'concerning_pattern') {
    return [
      { label: 'go to Comfort',       target: 'comfort' },
      { label: 'send via Bridge',      target: 'bridge' },
      { label: "I'm okay for now",    target: 'dismiss' },
    ];
  }
  return [
    { label: 'open Comfort',         target: 'comfort' },
    { label: "I'm okay",             target: 'dismiss' },
  ];
}

// ── Experience builder ─────────────────────────────────────────────────────────

function buildExperience(
  tier: SafetyTier,
  companionId: CompanionId,
  parentNotified: boolean,
  alertId?: number,
): SafetyExperience {
  return {
    tier,
    companionId,
    companionMessage: getCompanionMessage(tier, companionId),
    actions:          actionsForTier(tier),
    resources:        tier === 'immediate_danger' ? CRISIS_RESOURCES : [],
    parentNotified,
    alertId,
  };
}

// ── Severity → tier ────────────────────────────────────────────────────────────

function tierForSeverity(severity: string): SafetyTier {
  if (severity === 'high' || severity === 'critical') return 'immediate_danger';
  if (severity === 'medium')                           return 'concerning_pattern';
  return 'emotional_support';
}

// ── Client-side pre-flight patterns ───────────────────────────────────────────
// Mirror of edge function PATTERNS — ordered, first match wins.
// This is a secondary layer; the backend is authoritative.

const PRE_FLIGHT_RULES: { re: RegExp; tier: SafetyTier }[] = [
  // immediate_danger (high)
  {
    re:   /\b(kill myself|end my life|want to die|suicidal|cut myself|self[- ]?harm|not safe|being abused|he hits|she hits)\b/i,
    tier: 'immediate_danger',
  },
  // concerning_pattern (medium)
  {
    re:   /\b(can't take it|cant take it|i hate myself|nobody cares|give up|disappear forever|running away|leaving forever|goodbye forever)\b/i,
    tier: 'concerning_pattern',
  },
  // emotional_support (low)
  {
    re:   /\b(worst day|nothing matters|hate everything|end it all|hurt myself)\b/i,
    tier: 'emotional_support',
  },
];

// ── Acknowledgment (local — no DB write) ───────────────────────────────────────

const ACK_PREFIX = 'sekret:safety:acked:';

async function isAcknowledged(alertId: number): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(`${ACK_PREFIX}${alertId}`);
    return val === 'true';
  } catch {
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Pre-flight: synchronous client-side check before the teen posts.
 * Returns an experience immediately — no network call.
 *
 * Call this BEFORE sendCompanionMessage / saving a journal entry / posting to circle.
 * The backend scan still runs after the write — this catches obvious cases instantly.
 */
export function checkTextBeforePost(
  text:        string,
  companionId: CompanionId = 'suhana',
): SafetyExperience | null {
  for (const rule of PRE_FLIGHT_RULES) {
    if (rule.re.test(text)) {
      return buildExperience(rule.tier, companionId, false);
    }
  }
  return null;
}

/**
 * Post-scan: async check for server-flagged items in safety_alerts.
 * Poll this on app open and after saving content (give the trigger ~2 s to fire).
 *
 * Returns the most recent unacknowledged experience, or null if clean.
 */
export async function checkForFlaggedItems(
  companionId: CompanionId = 'suhana',
): Promise<SafetyExperience | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    // 7-day window — old alerts don't resurface after acknowledged
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await sb
      .from('safety_alerts')
      .select('id, severity, parent_notified_at')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) return null;

    // Find the most severe unacknowledged alert
    const TIER_ORDER: SafetyTier[] = ['immediate_danger', 'concerning_pattern', 'emotional_support'];
    for (const targetTier of TIER_ORDER) {
      for (const row of data) {
        const tier = tierForSeverity(row.severity as string);
        if (tier !== targetTier) continue;
        const alertId = row.id as number;
        if (await isAcknowledged(alertId)) continue;
        return buildExperience(tier, companionId, Boolean(row.parent_notified_at), alertId);
      }
    }

    return null;
  } catch (e) {
    if (__DEV__) console.warn('[safety] checkForFlaggedItems failed:', e);
    return null;
  }
}

/**
 * Mark an experience as seen.
 * The alert remains in the DB; only the local acknowledgment flag is set.
 * Call this when the teen dismisses the experience or takes an action.
 */
export async function acknowledgeAlert(alertId: number): Promise<void> {
  try {
    await AsyncStorage.setItem(`${ACK_PREFIX}${alertId}`, 'true');
  } catch {
    // Non-fatal — worst case the experience re-surfaces once on next open
  }
}

/**
 * Clear all local acknowledgments. Use during sign-out / reset.
 */
export async function clearSafetyAcks(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ackKeys = keys.filter(k => k.startsWith(ACK_PREFIX));
    if (ackKeys.length > 0) await AsyncStorage.multiRemove(ackKeys);
  } catch {
    // Non-fatal
  }
}
