import { useCallback } from 'react';
import type { VoiceBipAvatarKey } from '../constants/voiceBip';
import type { OracleProfile, OracleSide } from '../services/oracleDiscovery';
import { prepareVoiceBipIntelligence } from '../services/voiceBipIntelligence';
import { loadSekretMemory, updateSekretMemory } from '../services/sekretMemory';
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

    let memoryPersistence: Promise<void> = Promise.resolve();

    // Pages already feeds typed expression into the existing Se'kret memory
    // store. Voice Bip now does the same after a real transcript exists. The
    // memory service keeps bounded metadata/patterns, not the raw transcript.
    if (side === 'teen' && result.transcript.status === 'available' && result.transcript.text) {
      const transcriptId = result.transcript.id;
      memoryPersistence = (async () => {
        await updateSekretMemory({
          selectedSekret: avatarKey,
          journalEntries: [{
            id: transcriptId,
            text: result.transcript.text,
            mood,
            date: result.transcript.capturedAt,
          }],
        });

        // updateSekretMemory's storage adapter can fail closed by returning the
        // in-memory projection even when the underlying write did not stick.
        // Re-read the authority before calling this persistence step successful.
        const persisted = await loadSekretMemory();
        if (!persisted.journalActivity.some(entry => entry.sourceId === transcriptId)) {
          throw new Error('VOICE_BIP_MEMORY_PERSIST_VERIFY_FAILED');
        }
      })();

      // Keep the promise observable to callers while preventing a silent
      // fire-and-forget failure. Do not include transcript text or provider
      // payloads in the error path.
      void memoryPersistence.catch(() => {
        console.error('Voice Bip memory persistence failed');
      });
    }

    if (result.oracleMemory) onStoreOracleMemory?.(result.oracleMemory);
    return { ...result, memoryPersistence };
  }, [avatarKey, mood, onStoreOracleMemory, oracleJournalEntries, privateProfile, side]);

  return { prepareIntelligence };
}
