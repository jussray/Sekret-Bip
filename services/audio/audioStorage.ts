import * as FileSystem from 'expo-file-system/legacy';

const RECORDINGS_DIR = `${FileSystem.documentDirectory}bip_recordings/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
}

/**
 * Moves a temp recording URI into the app's persistent recordings directory.
 * Returns the new persistent URI.
 */
export async function saveRecordingLocally(tempUri: string): Promise<string> {
  await ensureDir();
  const filename = `recording_${Date.now()}.m4a`;
  const dest = `${RECORDINGS_DIR}${filename}`;
  await FileSystem.moveAsync({ from: tempUri, to: dest });
  return dest;
}

/**
 * Deletes a locally stored recording by URI.
 */
export async function deleteLocalRecording(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

/**
 * Lists all locally saved recording URIs.
 */
export async function listLocalRecordings(): Promise<string[]> {
  await ensureDir();
  const files = await FileSystem.readDirectoryAsync(RECORDINGS_DIR);
  return files.map((f) => `${RECORDINGS_DIR}${f}`);
}

/**
 * Returns file size in bytes for a given URI, or null if not found.
 */
export async function getRecordingSize(uri: string): Promise<number | null> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return null;
  return info.size ?? null;
}
