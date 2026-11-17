import type { JournalEntry } from '../src/types';
import type { VoiceBipAvatarKey } from '../constants/voiceBip';
import type { OracleProfile, OracleSide } from '../services/oracleDiscovery';

export type VoiceTranscriptStatus = 'pending' | 'available' | 'unavailable';

export interface VoiceBipTranscript {
  id: string;
  voiceNoteId: number;
  side: OracleSide;
  avatarKey: VoiceBipAvatarKey;
  status: VoiceTranscriptStatus;
  text: string | null;
  capturedAt: string;
  provider: 'none';
}

export type OracleMemoryKind =
  | 'pattern'
  | 'repeated-topic'
  | 'emotional-theme'
  | 'confidence-change'
  | 'stress-signal'
  | 'growth-moment';

export interface OracleMemoryEvidence {
  transcriptId: string;
  excerpt?: string;
  observedAt: string;
}

export interface OracleJournalMetadata {
  side: OracleSide;
  kind: OracleMemoryKind;
  confidence: 'emerging' | 'growing' | 'strong';
  topic?: string;
  evidence: OracleMemoryEvidence[];
  avatarKey?: VoiceBipAvatarKey;
}

/** Device-local, invisible journal record used only by Oracle context. */
export interface OracleJournalEntry extends JournalEntry {
  source: 'oracle';
  activeTab: 'oracle';
  hidden: true;
  entryMode: 'oracle-memory';
  oracle: OracleJournalMetadata;
}

export interface SekretUnderstanding {
  id: string;
  side: OracleSide;
  transcriptId: string;
  avatarKey: VoiceBipAvatarKey;
  memoryContext: string[];
  emotionalDirection: 'hold' | 'notice' | 'invite';
  responseBrief: string;
  createdAt: string;
}

export interface AvatarResponseRequest {
  avatarKey: VoiceBipAvatarKey;
  visibleSpeaker: VoiceBipAvatarKey;
  transcriptText: string;
  mood?: string;
  sekretUnderstanding: SekretUnderstanding;
  privateProfile?: OracleProfile;
  profileSide: OracleSide;
}

export interface VoiceBipIntelligenceResult {
  transcript: VoiceBipTranscript;
  oracleMemory: OracleJournalEntry | null;
  sekretUnderstanding: SekretUnderstanding;
  avatarResponse: AvatarResponseRequest;
}
