import type { JournalEntry, MoodEntry, VoiceNote } from '@/types';

export interface OracleInsight {
  id: string;
  lines: string[];
  source: 'pages' | 'pages-and-moods' | 'activity';
}

interface OracleInput {
  journalEntries: JournalEntry[];
  moodHistory?: MoodEntry[];
  voiceNotes?: VoiceNote[];
  streakDays?: number;
}

const SELF_BLAME = /\b(my fault|blame myself|i ruin(?:ed)?|i messed everything up|because of me|i should(?:'ve| have))\b/i;
const QUITTING = /\b(i (?:want to|wanna|might) quit|give up|done trying|can't do this anymore)\b/i;
const CANT = /\b(i can'?t|i cannot|not possible for me)\b/i;
const TRYING = /\b(i'?m trying|i am trying|i tried|still trying)\b/i;

const TOPICS = [
  'school', 'grades', 'friends', 'friendship', 'family', 'home', 'sleep', 'future',
  'relationship', 'breakup', 'lonely', 'confidence', 'body', 'money', 'work', 'stress',
] as const;

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function countMatches(entries: JournalEntry[], pattern: RegExp): number {
  return entries.filter((entry) => pattern.test(entry.text)).length;
}

function countTopics(entries: JournalEntry[]): Array<[string, number]> {
  return TOPICS
    .map((topic): [string, number] => [
      topic,
      entries.filter((entry) => entry.text.toLowerCase().includes(topic)).length,
    ])
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);
}

function moodCounts(moods: MoodEntry[]): Array<[string, number]> {
  const counts = moods.reduce<Record<string, number>>((all, entry) => {
    const mood = entry.mood?.trim().toLowerCase();
    if (mood) all[mood] = (all[mood] || 0) + 1;
    return all;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function buildOracleInsight({
  journalEntries,
  moodHistory = [],
  voiceNotes = [],
  streakDays = 0,
}: OracleInput): OracleInsight | null {
  if (journalEntries.length < 2) return null;

  const quittingCount = countMatches(journalEntries, QUITTING);
  if (quittingCount >= 2) {
    return {
      id: `quitting-${quittingCount}-${journalEntries.length}`,
      source: 'pages',
      lines: [
        quittingCount === 2 ? 'You’ve written about quitting twice.' : `You’ve written about quitting ${quittingCount} times.`,
        `You’ve come back to the page ${journalEntries.length} times.`,
        'Those are not the same thing.',
      ],
    };
  }

  const blameCount = countMatches(journalEntries, SELF_BLAME);
  if (blameCount >= 3) {
    return {
      id: `self-blame-${blameCount}`,
      source: 'pages',
      lines: [
        `This is the ${ordinal(blameCount)} time the blame landed on you first.`,
        'Different situations.',
        'Same reflex.',
      ],
    };
  }

  const midpoint = Math.max(1, Math.floor(journalEntries.length / 2));
  const recent = journalEntries.slice(0, midpoint);
  const earlier = journalEntries.slice(midpoint);
  const earlierCant = countMatches(earlier, CANT);
  const recentTrying = countMatches(recent, TRYING);
  if (earlierCant >= 2 && recentTrying >= 2) {
    return {
      id: `cant-to-trying-${earlierCant}-${recentTrying}`,
      source: 'pages',
      lines: [
        'Your older pages kept saying “I can’t.”',
        'Your newer pages keep saying “I’m trying.”',
        'That’s not the same sentence.',
      ],
    };
  }

  const [topTopic] = countTopics(journalEntries);
  if (topTopic) {
    const [topic, count] = topTopic;
    const topicMoods = new Set(
      journalEntries
        .filter((entry) => entry.text.toLowerCase().includes(topic))
        .map((entry) => entry.mood?.toLowerCase())
        .filter(Boolean),
    );
    if (topicMoods.size >= 2) {
      return {
        id: `topic-${topic}-${count}-${topicMoods.size}`,
        source: 'pages-and-moods',
        lines: [
          `“${topic}” showed up on ${count} different pages.`,
          `${topicMoods.size} different moods.`,
          'Maybe the feeling changes before the subject does.',
        ],
      };
    }
  }

  const [topMood] = moodCounts(moodHistory);
  if (topMood && topMood[1] >= 5 && journalEntries.length >= 3) {
    const [mood, count] = topMood;
    return {
      id: `mood-${mood}-${count}`,
      source: 'pages-and-moods',
      lines: [
        `You checked in as “${mood}” ${count} times.`,
        `You still made ${journalEntries.length} pages.`,
        'The feeling stayed. So did you.',
      ],
    };
  }

  if (voiceNotes.length >= 3 && journalEntries.length >= 3 && streakDays >= 3) {
    return {
      id: `showing-up-${voiceNotes.length}-${journalEntries.length}-${streakDays}`,
      source: 'activity',
      lines: [
        `${journalEntries.length} pages. ${voiceNotes.length} voice bips.`,
        `${streakDays} days of coming back.`,
        'You keep finding a way to tell the truth.',
      ],
    };
  }

  return null;
}
