import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export type PlaybackHandle = { stop: () => Promise<void> };
export type PreparedAudioSource = { uri: string; cleanup: () => Promise<void> };
let audioFileSequence = 0;

// Generated voice responses may be data:audio/*;base64 URIs. Native playback
// requires a file URI; keep the private bytes in cache and erase after use.
export async function prepareAudioSource(uri: string): Promise<PreparedAudioSource> {
  if (!uri.startsWith('data:')) return { uri, cleanup: async () => {} };
  const match = /^data:(audio\/[\w.+-]+);base64,([\s\S]+)$/.exec(uri);
  if (!match) throw new Error('Unsupported audio data URI');
  if (!FileSystem.cacheDirectory) throw new Error('Audio cache is unavailable');

  const mime = match[1];
  const ext = mime.includes('mpeg') ? 'mp3' : mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'm4a';
  const output = FileSystem.cacheDirectory + 'sekret-voice-' + Date.now() + '-' + (++audioFileSequence) + '.' + ext;
  await FileSystem.writeAsStringAsync(output, match[2], { encoding: FileSystem.EncodingType.Base64 });

  let cleaned = false;
  return {
    uri: output,
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      await FileSystem.deleteAsync(output, { idempotent: true });
    },
  };
}

// Caller owns stop(); natural completion and playback errors also release
// the native player and remove temporary voice audio from the cache.
export async function startAudioPlayback(uri: string): Promise<PlaybackHandle> {
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  const source = await prepareAudioSource(uri);
  let player: AudioPlayer;
  try {
    player = createAudioPlayer({ uri: source.uri });
  } catch (error) {
    await source.cleanup();
    throw error;
  }

  let subscription: { remove: () => void } | null = null;
  let stopped: Promise<void> | null = null;
  const stop = (): Promise<void> => {
    if (stopped) return stopped;
    stopped = (async () => {
      subscription?.remove();
      player.release();
      await source.cleanup();
    })();
    return stopped;
  };
  subscription = player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish || status.error) void stop().catch(() => {});
  });
  try {
    player.play();
  } catch (error) {
    await stop();
    throw error;
  }
  return { stop };
}

export async function playOnce(uri: string): Promise<void> {
  await startAudioPlayback(uri);
}

export async function getAudioDuration(uri: string): Promise<number | null> {
  const source = await prepareAudioSource(uri);
  let player: AudioPlayer;
  try {
    player = createAudioPlayer({ uri: source.uri });
  } catch (error) {
    await source.cleanup();
    throw error;
  }
  try {
    if (player.duration > 0) return Math.round(player.duration * 1000);
    return await new Promise<number | null>((resolve) => {
      let complete = false;
      let subscription: { remove: () => void } | null = null;
      const finish = (value: number | null) => {
        if (complete) return;
        complete = true;
        clearTimeout(timeout);
        subscription?.remove();
        resolve(value);
      };
      const timeout = setTimeout(() => finish(null), 5000);
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.error) finish(null);
        else if (status.isLoaded) finish(Math.round(status.duration * 1000));
      });
      if (player.duration > 0) finish(Math.round(player.duration * 1000));
    });
  } finally {
    player.release();
    await source.cleanup();
  }
}
