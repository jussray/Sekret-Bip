// types/bridge.ts
// Compatibility re-export. The real type definitions live in ./index.ts —
// BridgePayload is defined there. This shim exists only so legacy imports
// like `from '../types/bridge'` keep resolving without touching every screen.

export type {
  JournalEntry,
  CirclePost,
  VoiceNote,
  MoodEntry,
  BridgePayload,
} from '@/types';
