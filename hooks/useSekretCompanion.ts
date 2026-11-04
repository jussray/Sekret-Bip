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
import {
  learnTeenRelationshipStyle,
  loadTeenRelationshipProfile,
  relationshipProfileToOracleNote,
  saveTeenRelationshipProfile,
} from '../services/oracleRelationship';
import { buildSekretPresence, normalizeSekretPersonality } from '../services/sekretPresence';
import { COMPANION_CURRICULUM, type CompanionId } from '../src/config/companionCurriculum';
import type { CompanionActivityInput, CompanionLevel, CompanionState, MemorySummary } from '../types/sekretCompanion';

const PERSONALITY_LABELS = {
  suhana: 'Suhana',
  sy: 'Sy',
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
  greeting: COMPANION_CURRICULUM.suhana.greeting,
  presenceMessage: 'You do not have to act fine with me.',
  checkIn: null,
  lastUpdated: '',
  personality: 'Suhana',
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

function buildGreeting(voice: CompanionId, summary: MemorySummary, relationshipNote: string): string {
  const familiar = summary.conversations >= 3;
  const dislikesNicknames = relationshipNote.includes('nickname comfort: dislikes');

  if (!familiar) {
    if (dislikesNicknames && voice === 'suhana') return 'Okay. What really happened?';
    if (dislikesNicknames && voice === 'sy') return 'Run it back. What really happened?';
    return COMPANION_CURRICULUM[voice].greeting;
  }

  if (voice === 'sy') return dislikesNicknames
    ? 'You’re back. What’s really up?'
    : 'Aight, you back. Run it back for me—what’s really up?';
  if (voice === 'cloud') return 'You’re back. We can keep it small and gentle again.';
  if (voice === 'night') return 'You found me again. Are we reflecting, planning, creating, or resetting tonight?';
  return dislikesNicknames
    ? 'You’re back. Tell me the part you keep trying to make sound smaller.'
    : 'Girl, you’re back. Tell me the part you keep trying to make sound smaller.';
}

function latestRelationshipText(input: CompanionActivityInput): string {
  if (input.journalText?.trim()) return input.journalText.trim();
  const latestJournal = input.journalEntries?.[input.journalEntries.length - 1]?.text;
  if (latestJournal?.trim()) return latestJournal.trim();
  const latestCircle = input.circlePosts?.[input.circlePosts.length - 1]?.text;
  return latestCircle?.trim() || '';
}

function snapshot(
  memory: SekretMemory,
  input: CompanionActivityInput,
  relationshipNote: string,
  oracleSignals?: { personalityNote?: string; growthEdge?: string },
): CompanionState {
  const memorySummary = summarizeSekretMemory(memory);
  const voice = normalizeSekretPersonality(input.selectedSekret || memory.selectedPersonality) as CompanionId;
  const personality = PERSONALITY_LABELS[voice];
  const curriculum = COMPANION_CURRICULUM[voice];
  const curriculumSignal = {
    personalityNote: [oracleSignals?.personalityNote, curriculum.coreIdentity, relationshipNote].filter(Boolean).join(' '),
    growthEdge: [oracleSignals?.growthEdge, curriculum.hiddenTeachingGoals.slice(0, 3).join(', ')].filter(Boolean).join(' | '),
  };

  return {
    memorySummary,
    companionLevel: buildLevel(memorySummary),
    greeting: buildGreeting(voice, memorySummary, relationshipNote),
    presenceMessage: buildSekretPresence(memorySummary, personality, input.screen, curriculumSignal),
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
      const [loaded, oracleRecord, relationshipProfile] = await Promise.all([
        loadSekretMemory(),
        loadOracleRecord('teen'),
        loadTeenRelationshipProfile(),
      ]);

      const relationshipText = latestRelationshipText(input);
      const learnedRelationship = relationshipText
        ? learnTeenRelationshipStyle(relationshipText, relationshipProfile)
        : relationshipProfile;

      if (relationshipText) await saveTeenRelationshipProfile(learnedRelationship);

      const relationshipNote = relationshipProfileToOracleNote(learnedRelationship);
      const oracleSignals = extractOracleSignals(oracleRecord);
      const updated = await updateSekretMemory(input, loaded);
      const nextState = snapshot(updated, input, relationshipNote, oracleSignals);

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
