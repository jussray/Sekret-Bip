import { useEffect, useMemo, useState } from 'react';
import { buildSekretCheckIn } from '../services/sekretCheckins';
import {
  loadSekretMemory,
  saveSekretMemory,
  summarizeSekretMemory,
  updateSekretMemory,
  type SekretMemory,
} from '../services/sekretMemory';
import { extractOracleSignals, loadOracleRecord } from '../services/oracleProfile';
import { buildSekretPresence, normalizeSekretPersonality } from '../services/sekretPresence';
import type { CompanionActivityInput, CompanionLevel, CompanionState, MemorySummary } from '../types/sekretCompanion';

const PERSONALITY_LABELS = {
  raylene: 'Raylene',
  rylane: 'Rylane',
  cloud: 'Cloud',
  night: 'Night',
} as const;

const EMPTY_SUMMARY: MemorySummary = {
  favoriteMood: 'Thoughtful', favoriteSekret: 'soft', commonTopics: [], streakDays: 0,
  lastCheckIn: '', comfortToolsUsed: [], recurringEmotions: [], recurringStruggles: [],
  importantMilestones: [], daysActive: 0, conversations: 0, journalsWritten: 0,
  voiceBips: 0, comfortActions: 0,
};

const EMPTY_LEVEL: CompanionLevel = {
  level: 1, title: 'First hello', progress: 0, nextLevel: 8,
  unlockedGreetings: ['Hey, I’m here.'], unlockedDepth: ['warm check-ins'],
  encouragements: ['You’re doing enough.'], personalityResponses: ['cousin-like care'],
};

const DEFAULT_STATE: CompanionState = {
  memorySummary: EMPTY_SUMMARY,
  companionLevel: EMPTY_LEVEL,
  greeting: 'Hey love, I’m here.',
  presenceMessage: 'You do not have to act fine with me.',
  checkIn: null,
  lastUpdated: '',
  personality: 'Raylene',
};

function buildLevel(summary: MemorySummary): CompanionLevel {
  const score = summary.daysActive * 2 + summary.journalsWritten * 3 + summary.voiceBips * 3 + summary.comfortActions * 2;
  const level = Math.max(1, Math.min(6, Math.floor(score / 10) + 1));
  const titles = ['First hello', 'Getting familiar', 'Real connection', 'Steady presence', 'In your corner', 'Day-one energy'];
  return {
    level,
    title: titles[level - 1],
    progress: Math.min(100, (score % 10) * 10),
    nextLevel: level === 6 ? 0 : 10 - (score % 10),
    unlockedGreetings: ['Hey, I’m here.', 'I remember you.', 'Talk to me for real.'].slice(0, Math.min(3, level)),
    unlockedDepth: ['memory-based presence', 'contextual check-ins', 'familiar encouragement'].slice(0, Math.min(3, level)),
    encouragements: ['You’re doing enough.', 'Starting again still counts.', 'I see you showing up.'].slice(0, Math.min(3, level)),
    personalityResponses: ['warm', 'honest', 'protective'].slice(0, Math.min(3, level)),
  };
}

function buildGreeting(personality: string, summary: MemorySummary): string {
  const voice = normalizeSekretPersonality(personality);
  const familiar = summary.conversations >= 3;
  if (voice === 'rylane') return familiar ? 'Aight, you back. Talk to me—what’s really up?' : 'Aight, I’m here. Keep it real with me.';
  if (voice === 'cloud') return familiar ? 'Welcome back. We can take this moment slowly.' : 'Come rest here a minute. No pressure.';
  if (voice === 'night') return familiar ? 'You found me again. What followed you into tonight?' : 'Still awake? I’m right here.';
  return familiar ? 'Hey love, you’re back. Tell me what’s on your heart.' : 'Hey love, I’m here. You can be real with me.';
}

function snapshot(
  memory: SekretMemory,
  input: CompanionActivityInput,
  oracleSignals?: { personalityNote?: string; growthEdge?: string },
): CompanionState {
  const memorySummary = summarizeSekretMemory(memory);
  const voice = normalizeSekretPersonality(input.selectedSekret || memory.selectedPersonality);
  const personality = PERSONALITY_LABELS[voice];
  return {
    memorySummary,
    companionLevel: buildLevel(memorySummary),
    greeting: buildGreeting(personality, memorySummary),
    presenceMessage: buildSekretPresence(memorySummary, personality, input.screen, oracleSignals),
    checkIn: buildSekretCheckIn(memorySummary, personality, input.mood, input.isLateNight, input, memory),
    lastUpdated: memory.lastUpdated,
    personality,
  };
}

export function useSekretCompanion(input: CompanionActivityInput) {
  const [state, setState] = useState<CompanionState>(DEFAULT_STATE);
  const [isReady, setIsReady] = useState(false);
  const signature = useMemo(() => JSON.stringify(input), [input]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, oracleRecord] = await Promise.all([
        loadSekretMemory(),
        loadOracleRecord(input.userSide || 'teen'),
      ]);
      const oracleSignals = extractOracleSignals(oracleRecord);
      const updated = await updateSekretMemory(input, loaded);
      const nextState = snapshot(updated, input, oracleSignals);
      if (nextState.checkIn) {
        updated.lastCheckIn = new Date().toISOString();
        await saveSekretMemory(updated);
        nextState.memorySummary = summarizeSekretMemory(updated);
      }
      if (!cancelled) {
        setState(nextState);
        setIsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [signature]);

  return { ...state, state, isReady };
}
