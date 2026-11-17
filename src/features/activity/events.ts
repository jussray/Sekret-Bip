/**
 * Activity Event System.
 *
 * Local consumers are notified before the best-effort cloud write. Event
 * payloads stay minimal and must never contain private journal or mood text.
 */
import { getSupabase } from '@/utils/supabase';
import { recordMeaningfulReturnReceipt } from '@/features/retention/meaningfulReturn';
import { bumpStreak } from '../../../services/sekretMemory';

export type ActivityEventType =
  | 'mood_logged'
  | 'journal_saved'
  | 'voice_completed'
  | 'comfort_completed'
  | 'breathe_completed'
  | 'crew_checkin'
  | 'circle_post'
  | 'circle_reaction'
  | 'companion_message'
  | 'app_opened'
  | 'goal_completed'
  | 'bridge_shared'
  | 'memory_reviewed'
  | 'bippin2_step_completed'
  | 'streak_milestone';

export interface ActivityEvent {
  type: ActivityEventType;
  occurredAt: string;
  meta?: ActivityEventMeta;
}

export interface ActivityEventMeta {
  mood?: string;
  wordCount?: number;
  durationSecs?: number;
  personalityId?: string;
  messageIndex?: number;
  reactionKey?: string;
  milestone?: number;
  date?: string;
  routineId?: string;
  resetMode?: 'mind' | 'body';
  completionKind?: 'guided' | 'breath' | 'workout';
  exerciseCount?: number;
  intensity?: 'light' | 'medium' | 'high';
  route?: string;
  receiptKey?: string;
  category?: 'understand' | 'express' | 'regulate' | 'connect' | 'grow';
  responsePreference?: 'listen' | 'comfort' | 'help_plan' | 'check_later' | 'give_space';
}

type Subscriber = (event: ActivityEvent) => void;
const subscribers: Subscriber[] = [];

export function subscribeToEvents(fn: Subscriber): () => void {
  subscribers.push(fn);
  return () => {
    const index = subscribers.indexOf(fn);
    if (index !== -1) subscribers.splice(index, 1);
  };
}

function notifySubscribers(event: ActivityEvent): void {
  for (const fn of subscribers) {
    try { fn(event); } catch { /* a subscriber must not break the user flow */ }
  }
}

async function persistEvent(userId: string, event: ActivityEvent): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { error } = await sb.from('bip_events').insert({
      user_id: userId,
      event_type: event.type,
      occurred_at: event.occurredAt,
      meta: event.meta ?? {},
    });
    if (error && __DEV__) console.warn('[events] persist failed:', error.message);
  } catch (error) {
    if (__DEV__) console.warn('[events] persist threw:', error);
  }
}

export function emitEvent(type: ActivityEventType, meta?: ActivityEventMeta): void {
  const event: ActivityEvent = { type, occurredAt: new Date().toISOString(), meta };
  notifySubscribers(event);
  void recordMeaningfulReturnReceipt(event);

  // Keep the legacy counter for compatibility while new product surfaces use
  // active days and meaningful actions. Missing a day never removes points.
  void bumpStreak();

  void (async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { data } = await sb.auth.getUser();
      const userId = data?.user?.id;
      if (userId) await persistEvent(userId, event);
    } catch {
      // Meaningful actions must keep working offline or during an expired session.
    }
  })();
}
