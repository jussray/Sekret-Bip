import { useCallback } from 'react';
import type { VoiceBipAvatarKey } from '../constants/voiceBip';
import type { OracleProfile, OracleSide } from '../services/oracleDiscovery';
import { prepareVoiceBipIntelligence } from '../services/voiceBipIntelligence';
import { updateSekretMemory } from '../services/sekretMemory';
import type { OracleJournalEntry } from '../types/voiceIntelligence';

interface UseVoiceBipIntelligenceArgs {
  avatarKey: VoiceBipAvatarKey;
  side: OracleSide;
  mood?: string;
  privateProfile?: OracleProfile;
  oracleJournalEntries?: readonly OracleJournalEntry[];
  onStoreOracleMemory?: (entry: OracleJournalEntry) => void;
}

export function useVoiceBipIntelligence({
  avatarKey,
  side,
  mood,
  privateProfile,
  oracleJournalEntries = [],
  onStoreOracleMemory,
}: UseVoiceBipIntelligenceArgs) {
  const prepareIntelligence = useCallback((voiceNoteId: number, transcriptText?: string | null) => {
    const result = prepareVoiceBipIntelligence({
      voiceNoteId,
      avatarKey,
      side,
      mood,
      transcriptText,
      privateProfile,
      oracleJournal: oracleJournalEntries,
    });

    // Pages already feeds typed expression into the existing Se'kret memory
    // store. Voice Bip now does the same after a real transcript exists. The
    // memory service keeps bounded metadata/patterns, not the raw transcript.
    if (side === 'teen' && result.transcript.status === 'available' && result.transcript.text) {
      void updateSekretMemory({
        selectedSekret: avatarKey,
        journalEntries: [{
          id: result.transcript.id,
          text: result.transcript.text,
          mood,
          date: result.transcript.capturedAt,
        }],
      }).catch(() => undefined);
    }

    if (result.oracleMemory) onStoreOracleMemory?.(result.oracleMemory);
    return result;
  }, [avatarKey, mood, onStoreOracleMemory, oracleJournalEntries, privateProfile, side]);

  return { prepareIntelligence };
}
