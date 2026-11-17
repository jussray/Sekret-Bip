import type { JournalEntry } from '@/types';

export type DailyIntentionCategory =
  | 'soothe'
  | 'body'
  | 'focus'
  | 'connect'
  | 'self_kind'
  | 'future'
  | 'reflect'
  | 'baseline';

export type DailyIntentionSourceKind =
  | 'baseline'
  | 'activity'
  | 'conversation'
  | 'manual';

export type DailyIntentionSourceLabel =
  | 'gentle default'
  | "today's mood"
  | "today's activity"
  | 'recent companion entry'
  | 'manual';

export type DailyIntentionCompanionKey =
  | 'raylene'
  | 'rylane'
  | 'cloud'
  | 'night'
  | 'sekret';

export interface DailyIntention {
  position: number;
  label: string;
  category: DailyIntentionCategory;
  sourceKind: DailyIntentionSourceKind;
  sourceLabel: DailyIntentionSourceLabel;
  companionKey?: DailyIntentionCompanionKey;
  generationVersion: 'local-v1' | 'manual-v1';
  completed: boolean;
  dismissed: boolean;
}

export interface DailyIntentionSignals {
  mood?: string;
  companionKey?: string;
  recentUserTexts?: string[];
  journaledToday: boolean;
  comfortUsedToday: boolean;
  voiceUsedToday: boolean;
  personalizationEnabled: boolean;
}

type Candidate = Omit<DailyIntention, 'position' | 'completed' | 'dismissed'> & {
  priority: number;
};

const COMPANION_KEYS = new Set<DailyIntentionCompanionKey>([
  'raylene',
  'rylane',
  'cloud',
  'night',
  'sekret',
]);

const SIGNAL_PATTERNS: Array<{
  category: DailyIntentionCategory;
  pattern: RegExp;
  label: string;
}> = [
  {
    category: 'soothe',
    pattern: /\b(anxious|overwhelm|stressed?|panic|heavy|angry|mad|sad|hurt|numb|too much)\b/i,
    label: 'Take one two-minute reset before the next thing.',
  },
  {
    category: 'body',
    pattern: /\b(tired|sleep|exhaust|hungry|eat|water|headache|body|rest|drained)\b/i,
    label: 'Drink water and check what your body needs.',
  },
  {
    category: 'focus',
    pattern: /\b(school|homework|work|task|finish|study|project|test|deadline|behind)\b/i,
    label: 'Pick one 10-minute next step — only one.',
  },
  {
    category: 'connect',
    pattern: /\b(friend|mom|dad|family|text|call|talk|alone|lonely|ignored|miss them)\b/i,
    label: 'Reach out to one safe person. No big explanation needed.',
  },
  {
    category: 'self_kind',
    pattern: /\b(guilt|sorry|my fault|hate myself|embarrass|ashamed|stupid|failure)\b/i,
    label: 'Say one kinder sentence to yourself.',
  },
  {
    category: 'future',
    pattern: /\b(tomorrow|want to|hope|goal|try|future|next time)\b/i,
    label: 'Write the smallest next step for tomorrow.',
  },
];

function normalizeCompanionKey(value?: string): DailyIntentionCompanionKey | undefined {
  if (!value) return undefined;
  const normalized = value === 'soft' ? 'raylene' : value === 'oracle' ? 'sekret' : value;
  return COMPANION_KEYS.has(normalized as DailyIntentionCompanionKey)
    ? normalized as DailyIntentionCompanionKey
    : undefined;
}

function signalCandidate(
  category: DailyIntentionCategory,
  label: string,
  sourceKind: DailyIntentionSourceKind,
  sourceLabel: DailyIntentionSourceLabel,
  priority: number,
  companionKey?: DailyIntentionCompanionKey,
): Candidate {
  return {
    category,
    label,
    sourceKind,
    sourceLabel,
    companionKey,
    generationVersion: 'local-v1',
    priority,
  };
}

function addMatchingSignals(
  candidates: Candidate[],
  text: string,
  sourceKind: DailyIntentionSourceKind,
  sourceLabel: DailyIntentionSourceLabel,
  priority: number,
  companionKey?: DailyIntentionCompanionKey,
): void {
  for (const signal of SIGNAL_PATTERNS) {
    if (signal.pattern.test(text)) {
      candidates.push(signalCandidate(
        signal.category,
        signal.label,
        sourceKind,
        sourceLabel,
        priority,
        companionKey,
      ));
    }
  }
}

/**
 * Builds a tiny daily checklist without a network call.
 *
 * Privacy contract:
 * - Basic mode uses only the current mood plus coarse activity booleans.
 * - Personalized mode may inspect up to three user-authored companion entries in memory.
 * - Raw entries, excerpts, companion replies, and transcripts are never returned or persisted.
 */
export function buildDailyIntentions(signals: DailyIntentionSignals): DailyIntention[] {
  const candidates: Candidate[] = [];
  const companionKey = normalizeCompanionKey(signals.companionKey);

  addMatchingSignals(
    candidates,
    signals.mood ?? '',
    'activity',
    "today's mood",
    100,
  );

  if (signals.personalizationEnabled) {
    for (const text of (signals.recentUserTexts ?? []).slice(0, 3)) {
      addMatchingSignals(
        candidates,
        text,
        'conversation',
        'recent companion entry',
        90,
        companionKey,
      );
    }
  }

  if (!signals.journaledToday) {
    candidates.push(signalCandidate(
      'reflect',
      'Write one honest sentence in Pages.',
      'activity',
      "today's activity",
      70,
    ));
  } else {
    candidates.push(signalCandidate(
      'reflect',
      'Name one thing you handled today.',
      'activity',
      "today's activity",
      55,
    ));
  }

  if (signals.comfortUsedToday) {
    candidates.push(signalCandidate(
      'soothe',
      'Carry one calm minute into the next thing.',
      'activity',
      "today's activity",
      65,
    ));
  }

  if (signals.voiceUsedToday) {
    candidates.push(signalCandidate(
      'self_kind',
      'Let one thought stay finished — no replay.',
      'activity',
      "today's activity",
      60,
    ));
  }

  candidates.push(
    signalCandidate(
      'baseline',
      'Do one small thing that makes tonight easier.',
      'baseline',
      'gentle default',
      40,
    ),
    signalCandidate(
      'body',
      'Unclench your shoulders and take three slow breaths.',
      'baseline',
      'gentle default',
      35,
    ),
    signalCandidate(
      'future',
      'Choose one thing that can wait until tomorrow.',
      'baseline',
      'gentle default',
      30,
    ),
  );

  const usedCategories = new Set<DailyIntentionCategory>();
  const usedLabels = new Set<string>();

  return candidates
    .sort((a, b) => b.priority - a.priority)
    .filter(candidate => {
      if (usedCategories.has(candidate.category) || usedLabels.has(candidate.label)) return false;
      usedCategories.add(candidate.category);
      usedLabels.add(candidate.label);
      return true;
    })
    .slice(0, 3)
    .map(({ priority: _priority, ...candidate }, position) => ({
      ...candidate,
      position,
      completed: false,
      dismissed: false,
    }));
}

export function isCompanionJournalEntry(entry: JournalEntry): boolean {
  const source = entry.activeTab ?? entry.source;
  return source === 'raylene'
    || source === 'rylane'
    || source === 'cloud'
    || source === 'night';
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function happenedToday(idOrTimestamp: number | string, now = new Date()): boolean {
  const parsed = typeof idOrTimestamp === 'number'
    ? new Date(idOrTimestamp)
    : new Date(idOrTimestamp);
  return Number.isFinite(parsed.getTime()) && localDateKey(parsed) === localDateKey(now);
}
