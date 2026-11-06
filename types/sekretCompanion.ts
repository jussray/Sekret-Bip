export interface MemorySummary {
  favoriteMood: string;
  favoriteSekret: string;
  commonTopics: string[];
  streakDays: number;
  lastCheckIn: string;
  comfortToolsUsed: string[];
  recurringEmotions: string[];
  recurringStruggles: string[];
  importantMilestones: string[];
  daysActive: number;
  conversations: number;
  journalsWritten: number;
  voiceBips: number;
  comfortActions: number;
  // Pattern noticing — drives Tolan-level companion awareness
  comfortWordPattern?: string;   // most-used evasive word ('tired', 'fine', 'whatever')
  hasDeferredGoal?: boolean;     // user has said 'monday'/'next week' 2+ times
  recurringEntity?: string;      // name/word that keeps showing up in journals
  // Growth tracking — companions celebrate wins, not just process pain
  winMoments?: string[];         // winning-category moods logged (proud, motivated, etc.)
  proudMoodCount?: number;       // total winning moods in last 30 days
  recentGrowth?: string;         // human-readable note, e.g. "3x proud this week"
  winningStreak?: number;        // consecutive days with a winning mood logged
}

export interface CompanionLevel {
  level: number;
  title: string;
  progress: number;
  nextLevel: number;
  unlockedGreetings: string[];
  unlockedDepth: string[];
  encouragements: string[];
  personalityResponses: string[];
}

export interface CompanionCheckIn {
  id: string;
  message: string;
  tone: 'gentle' | 'warm' | 'protective';
}

export interface CompanionState {
  memorySummary: MemorySummary;
  companionLevel: CompanionLevel;
  greeting: string;
  presenceMessage: string;
  checkIn: CompanionCheckIn | null;
  lastUpdated: string;
  personality: string;
}

export interface CompanionActivityInput {
  selectedSekret?: string;
  mood?: string;
  journalEntries?: Array<{ id?: string | number; text?: string; mood?: string; date?: string }>;
  moodHistory?: Array<{ id?: string | number; mood?: string; date?: string }>;
  voiceNotes?: Array<{ id?: string | number; title?: string; type?: string; date?: string }>;
  comfortSessions?: Array<{ id?: string | number; type?: string; date?: string }>;
  circlePosts?: Array<{ id?: string | number; text?: string; date?: string }>;
  streakDays?: number;
  lastOpenDate?: string;
  screen?: string;
  isLateNight?: boolean;
  journalText?: string;
  userSide?: 'teen' | 'parent';
  oracleSignals?: {
    personalityNote?: string;
    growthEdge?: string;
    strategyLead?: string;
    strategyPole?: 'A' | 'B';
  };
}
