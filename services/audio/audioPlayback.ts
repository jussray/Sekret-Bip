import { Audio } from 'expo-av';

/**
 * One-shot helper for simple playback without a hook.
 * For UI with progress tracking, use useAudioPlayer instead.
 */
export async function playOnce(uri: string): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
  });
  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      sound.unloadAsync().catch(() => {});
    }
  });
}

/**
 * Returns the duration in milliseconds of an audio file without playing it.
 */
export async function getAudioDuration(uri: string): Promise<number | null> {
  try {
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );
    const duration = status.isLoaded ? (status.durationMillis ?? null) : null;
    await sound.unloadAsync();
    return duration;
  } catch {
    return null;
  }
}
