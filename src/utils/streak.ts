import type { MoodEntry, JournalEntry, VoiceNote } from '@/types/index';

function toDateKey(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function calculateStreak(
  moodHistory: MoodEntry[],
  journalEntries: JournalEntry[],
  voiceNotes: VoiceNote[],
): number {
  const activeDays = new Set<string>();

  for (const m of moodHistory ?? []) {
    const k = toDateKey(m.date);
    if (k) activeDays.add(k);
  }
  for (const j of journalEntries ?? []) {
    const k = toDateKey((j as any).date);
    if (k) activeDays.add(k);
  }
  for (const v of voiceNotes ?? []) {
    const k = toDateKey(v.date);
    if (k) activeDays.add(k);
  }

  if (activeDays.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (activeDays.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      if (streak === 0) {
        // check yesterday in case user hasn't logged today yet
        cursor.setDate(cursor.getDate() - 1);
        const yk = cursor.toISOString().slice(0, 10);
        if (activeDays.has(yk)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  return streak;
}
