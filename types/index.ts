export type JournalSource = 'me' | 'oracle' | 'raylene' | 'rylane' | 'cloud' | 'night' | 'parentSekret' | 'bridge' | string;
export type JournalEntryMode = 'typed' | 'voice' | 'oracle-memory';

export interface JournalEntry {
  id: number;
  text: string;
  mood: string;
  date: string;
  time: string;
  source?: JournalSource; // Undefined legacy entries are treated as 'me'.
  activeTab?: string;
  moodTag?: string;
  entryMode?: JournalEntryMode;
  hidden?: boolean;
  locked?: boolean;
  imageUri?: string;
  /** Se'kret reply text, stored after Worker responds. Undefined until reply arrives. */
  sekretReply?: string;
  /** Transient: true while the Worker call is in flight. Never persisted to AsyncStorage. */
  sekretTyping?: boolean;
}

export interface CirclePost {
  id: number | string;
  text: string;
  date?: string;
  time?: string;
  bipType?: string;
  mediaKind?: 'text' | 'struggle' | 'relatable' | 'growth';
  mediaUri?: string;
  anonymousName?: string;
  avatarKey?: string;
  visibility?: 'public_circle' | 'friends_only';
  identityContext?: 'public_circle' | 'trusted_friend';
  circleTag?: string;
  postMood?: string;
  quietRepliesCount?: number;
  reactions: {
    felt: number;
    comfort: number;
    proud: number;
    stay: number;
    sameHere?: number;
  };
}

export interface ParentCirclePost {
  id: number;
  text: string;
  date: string;
  time: string;
  circleTag?: string;
  anonymousName?: string;
  quietRepliesCount?: number;
  reactions: {
    beenThere: number;
    solidarity: number;
    reminder: number;
    needed: number;
    strength: number;
  };
}

export interface VoiceNote {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: string;
  /** Bip kind: 'voice' | 'video' | 'text' | 'cloud'. Optional for back-compat. */
  type?: string;
  avatarKey?: 'raylene' | 'rylane' | 'cloud' | 'night';
  transcriptId?: string;
}


export interface MoodEntry {
  id: number;
  mood: string;
  date: string;
  time: string;
}

export interface ComfortSession {
  id: number;
  type: 'comfort' | 'calm' | 'voice' | 'journal' | 'growth' | 'mood';
  date: string;
  time: string;
  mood?: string;
}

export interface CrewMember {
  id: number;
  name: string;
  bipId?: string;
  connectionStatus?: 'pending' | 'accepted' | 'blocked' | 'removed';
  emoji: string;            // soft picker, no profile pics
  commitment: string;       // "text me when you spiral", "daily check-in", etc.
  cadence: 'daily' | 'weekly' | 'whenever';
  inviteCode: string;       // local placeholder until Supabase
  addedAt: string;          // ISO
}

export interface CrewCheckIn {
  id: number;
  memberId: number;
  note: string;             // short, soft
  mood?: string;
  date: string;
  time: string;
}

export interface Theme {
  name: string;
  bipId?: string;
  connectionStatus?: 'pending' | 'accepted' | 'blocked' | 'removed';
  emoji: string;
  background: string;
  card: string;
  accent: string;
  soft: string;
}

export interface SekretProfile {
  name: string;
  bipId?: string;
  connectionStatus?: 'pending' | 'accepted' | 'blocked' | 'removed';
  emoji: string;
  title: string;
  vibe: string;
  greeting: string;
}

export interface BridgePayload {
  shareTypeLabel?: string;
  preview?:        string;
  mood?:           string;
  moodEmoji?:      string;
  sharedAt?:       string;
  sekretTip?:      string;
  softPrompt?:     string;
  conversationStarter?: string;
  followUp?:       string;
  avoid?:          string[];
  guidance?:       string;
  translation?:    { said: string; means: string };
}


export type ParentTeenLinkStatus = 'pending' | 'approved' | 'blocked' | 'removed';
export type ParentShareKind = 'mood_summary' | 'journal_entry' | 'voice_summary' | 'safety_alert' | 'streaks_rewards';

export interface ParentTeenLink {
  id: string;
  teenId: string;
  guardianId: string;
  inviteCode: string;
  status: ParentTeenLinkStatus;
  permissions: ParentShareKind[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TeenGuardianShare {
  id: string;
  teenId: string;
  linkId: string;
  shareKind: ParentShareKind;
  sourceId?: string;
  summary: string;
  createdAt?: string;
}
