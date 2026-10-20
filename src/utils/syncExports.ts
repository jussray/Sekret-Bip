// syncExports.ts
// parentBridgeCompat and pointsCompat are the canonical source for the
// types/functions they own. sync.ts duplicates those names (it was the
// original home before the compat split), so we must NOT re-export sync.*
// wholesale — that triggers TS2308 ambiguity errors.
//
// Instead: export the compat modules in full, then pull only the members
// that are UNIQUE to sync.ts (i.e. not re-exported by either compat file).

export * from './parentBridgeCompat';
export * from './pointsCompat';

// Unique exports from sync.ts — everything else is covered by the compat modules above.
export {
  ensureAnonymousSession,
  syncMood,
  syncJournal,
  syncCirclePost,
  syncParentCirclePost,
  loadParentCircleFeed,
  loadCircleFeed,
  syncCircleReaction,
  writeCirclePost,
  syncVoiceNote,
  syncComfortSession,
  syncCrewMember,
  deleteCrewMember,
  syncCrewCheckIn,
  syncRoomMemory,
  snapshotPoints,
  syncPeriodDay,
  deletePeriodDay,
  loadPeriodDays,
  syncOracleSession,
  loadOracleSession,
  syncTeenActivitySummary,
  initTeenActivitySync,
  fetchTeenActivitySummary,
  pullAll,
  type TeenActivitySummary,
} from './sync';
