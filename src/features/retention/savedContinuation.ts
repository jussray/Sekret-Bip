import AsyncStorage from '@react-native-async-storage/async-storage';

export const SAVED_CONTINUATION_STORAGE_KEY = 'sekretbip_saved_continuation_v1';

export type SavedContinuation = {
  version: 1;
  entryId: string;
  companionKey: string;
  savedAt: string;
};

function parseSavedContinuation(raw: string | null): SavedContinuation | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<SavedContinuation>;
    if (
      value.version !== 1 ||
      typeof value.entryId !== 'string' ||
      !value.entryId ||
      typeof value.companionKey !== 'string' ||
      typeof value.savedAt !== 'string'
    ) {
      return null;
    }

    return value as SavedContinuation;
  } catch {
    return null;
  }
}

export async function saveContinuation(input: {
  entryId: string | number;
  companionKey?: string | null;
}): Promise<SavedContinuation> {
  const continuation: SavedContinuation = {
    version: 1,
    entryId: String(input.entryId),
    companionKey: input.companionKey || 'pages',
    savedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    SAVED_CONTINUATION_STORAGE_KEY,
    JSON.stringify(continuation),
  );

  return continuation;
}

export async function loadSavedContinuation(): Promise<SavedContinuation | null> {
  try {
    return parseSavedContinuation(
      await AsyncStorage.getItem(SAVED_CONTINUATION_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export async function archiveSavedContinuation(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVED_CONTINUATION_STORAGE_KEY);
  } catch {
    // Bookmark cleanup is optional and must never block Room or Pages.
    return undefined;
  }
}
