import type { MemorySummary } from '../types/sekretCompanion';

export type SekretPersonality = 'suhana' | 'sy' | 'cloud' | 'night';

export function normalizeSekretPersonality(value?: string): SekretPersonality {
  const personality = (value || '').toLowerCase().replace(/[’']/g, '').replace(/[\s_-]+/g, '');
  if (personality.includes('sy') || personality.includes('rylane') || personality === 'bro') return 'sy';
  if (personality.includes('cloud')) return 'cloud';
  if (personality.includes('night')) return 'night';
  return 'suhana';
}

function shouldNoticeMemory(summary?: Partial<MemorySummary>, screen?: string): boolean {
  if (screen || !summary) return false;
  const conversations = summary.conversations || 0;
  return conversations >= 5 && conversations % 5 === 0;
}

function rememberedPresence(summary: Partial<MemorySummary>, voice: SekretPersonality): string | null {
  if (summary.recentGrowth || (summary.winningStreak || 0) >= 3) {
    if (voice === 'sy') return 'look at you still standing. keep going.';
    if (voice === 'cloud') return 'something feels different today. lighter, maybe.';
    if (voice === 'night') return 'yesterday had hands. you’re still here.';
    return 'look at that. yesterday had hands and you’re still standing.';
  }

  const recurringEmotion = summary.recurringEmotions?.[0];
  if (recurringEmotion) {
    if (voice === 'sy') return `${recurringEmotion} again, huh. aight. what happened?`;
    if (voice === 'cloud') return `that ${recurringEmotion} feeling came back. no rush.`;
    if (voice === 'night') return 'rough again? stay here a minute.';
    return `friend... that ${recurringEmotion} feeling again? c’mere.`;
  }

  return null;
}

export function buildSekretPresence(
  summary: Partial<MemorySummary> | undefined,
  personality?: string,
  screen?: string,
  oracleSignals?: { personalityNote?: string; growthEdge?: string },
): string {
  const voice = normalizeSekretPersonality(personality);
  const memoryLine = shouldNoticeMemory(summary, screen) && summary
    ? rememberedPresence(summary, voice)
    : null;
  if (memoryLine) return memoryLine;

  if (!screen && oracleSignals?.growthEdge) {
    if (voice === 'sy') return `i see you ${oracleSignals.growthEdge}. that's not nothing.`;
    if (voice === 'cloud') return "something's shifting. i can feel it.";
    if (voice === 'night') return 'still in it. and still going. that matters.';
    return `i see it. you're ${oracleSignals.growthEdge}.`;
  }

  if (!screen && oracleSignals?.personalityNote && (summary?.conversations || 0) >= 5) {
    if (voice === 'sy') return 'i know how you move. stay real with me.';
    if (voice === 'cloud') return "i'm starting to understand your weather.";
    if (voice === 'night') return 'i know how you carry things.';
    return "i'm starting to really understand you.";
  }

  if (voice === 'sy') {
    if (screen === 'voiceBip') return 'drop a voice bip. say it straight.';
    if (screen === 'comfort') return 'aight. one thing at a time.';
    return 'aight. what REALLY happened?';
  }

  if (voice === 'cloud') {
    if (screen === 'voiceBip') return 'let the words come.';
    if (screen === 'comfort') return 'come sit for a sec.';
    return 'something feels different today.';
  }

  if (voice === 'night') {
    if (screen === 'voiceBip') return 'say the loud part.';
    if (screen === 'comfort') return 'one breath.';
    return 'rough night?';
  }

  if (screen === 'voiceBip') return 'okay, say it before you talk yourself out of it.';
  if (screen === 'comfort') return 'girl... breathe first. then tell me who did what.';
  return 'friend... 😭 what happened?';
}
