/**
 * Phase 0B — Parent Privacy Data Contract
 *
 * These types define what data parents may and may not see.
 * Every parent-facing data selector must reference an allowed source.
 * No parent-facing feature may be built without tracing its data to TeenShareVisibility.
 */

// ─── Visibility Levels ────────────────────────────────────────────────────────

export type TeenShareVisibility =
  | 'private'              // only the teen and Se'kret AI
  | 'shared_with_parent'   // teen explicitly shared this item
  | 'safe_aggregate'       // statistical trend, no individual entry exposed
  | 'public_circle';       // teen posted to Se'kret Circle (may be anonymous)

// ─── Allowed Parent Data Sources ─────────────────────────────────────────────

export type ParentAllowedSource =
  | 'explicit_teen_share'    // teen tapped "Share with parent"
  | 'bridge_message'         // teen sent a Bridge/S2Tell message
  | 'shared_mood'            // teen chose to share a mood check-in
  | 'shared_moment'          // a mutually acknowledged connection event
  | 'connection_pattern'     // derived from both sides' connection actions (not teen content)
  | 'parent_own_action';     // parent's own reflection, entry, or action

// ─── Blocked Parent Data Sources ─────────────────────────────────────────────
// These must NEVER be read into any parent-facing component or service.

export type ParentBlockedSource =
  | 'private_pages_text'
  | 'private_companion_chat'
  | 'private_voice_entry'
  | 'private_video_entry'
  | 'private_mood_tag'
  | 'private_circle_identity'
  | 'private_circle_activity'
  | 'ai_inferred_hidden_feeling';

// ─── What They Need Signal ─────────────────────────────────────────────────────

export type ParentNeedCategory =
  | 'encouragement'
  | 'listen_without_fixing'
  | 'quality_time'
  | 'space_and_understanding';

export interface ParentNeedSignal {
  category: ParentNeedCategory;
  /** 0–100, higher = stronger signal */
  score: number;
  source: ParentAllowedSource;
  /** Human-readable explanation shown in the UI */
  explanation: string;
  /** ISO timestamp of the event that produced this signal */
  derivedAt: string;
}

// ─── Safe Mood Aggregate ──────────────────────────────────────────────────────
// Parent mood trend may only use aggregated, shared check-ins.

export interface SafeMoodAggregate {
  /** Only moods the teen explicitly shared */
  sharedMoods: Array<{
    mood: string;
    sharedAt: string;
    source: 'shared_mood';
  }>;
  /** e.g. "Based on 3 shared check-ins this week" */
  summaryLabel: string;
  visibility: 'safe_aggregate';
}

// ─── Connection Strength ─────────────────────────────────────────────────────

export interface ConnectionStrength {
  score: number;       // 0–100
  label: 'building' | 'steady' | 'strong' | 'very_strong';
  sources: ParentAllowedSource[];
  /** e.g. "Based on recent shared check-ins and Bridge moments" */
  explanation: string;
}

// ─── Shared Moment ────────────────────────────────────────────────────────────

export interface SharedMoment {
  id: string;
  label: string;
  note: string;
  createdAt: string;
  initiatedBy: 'teen' | 'parent';
  visibility: 'shared_with_parent';
}

// ─── Type Guard ───────────────────────────────────────────────────────────────

export function isParentSafeSource(source: string): source is ParentAllowedSource {
  const allowed: ParentAllowedSource[] = [
    'explicit_teen_share',
    'bridge_message',
    'shared_mood',
    'shared_moment',
    'connection_pattern',
    'parent_own_action',
  ];
  return allowed.includes(source as ParentAllowedSource);
}

export function assertParentSafeSource(source: string): asserts source is ParentAllowedSource {
  if (!isParentSafeSource(source)) {
    throw new Error(
      `[Privacy violation] Parent-facing data derived from blocked source: "${source}". ` +
      `Only allowed sources may be used in parent components.`
    );
  }
}
