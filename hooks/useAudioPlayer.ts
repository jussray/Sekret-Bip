import { useState, useRef, useCallback, useEffect } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { prepareAudioSource, type PreparedAudioSource } from '../services/audio/audioPlayback';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'finished' | 'error';

export interface AudioPlayerResult {
  state: PlaybackState;
  positionMs: number;
  durationMs: number;
  progress: number;
  error: string | null;
  load: (uri: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  unload: () => Promise<void>;
}

export function useAudioPlayer(): AudioPlayerResult {
  const [state, setState] = useState<PlaybackState>('idle');
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const sourceRef = useRef<PreparedAudioSource | null>(null);

  const unload = useCallback(async () => {
    const player = playerRef.current;
    playerRef.current = null;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    player?.release();
    const source = sourceRef.current;
    sourceRef.current = null;
    await source?.cleanup();
    setState('idle');
    setPositionMs(0);
    setDurationMs(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => { void unload(); };
  }, [unload]);

  const load = useCallback(async (uri: string) => {
    await unload();
    try {
      setState('loading');
      const source = await prepareAudioSource(uri);
      let player: AudioPlayer;
      try {
        player = createAudioPlayer({ uri: source.uri });
      } catch (err) {
        await source.cleanup();
        throw err;
      }
      playerRef.current = player;
      sourceRef.current = source;
      subscriptionRef.current = player.addListener('playbackStatusUpdate', (status) => {
        if (playerRef.current !== player) return;
        setPositionMs(Math.round(status.currentTime * 1000));
        setDurationMs(Math.round(status.duration * 1000));
        if (status.error) {
          setError(status.error);
          setState('error');
        } else if (status.didJustFinish) {
          setState('finished');
        } else if (status.isLoaded) {
          setState((previous) => previous === 'loading' ? 'paused' : previous);
        }
      });
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to load audio.');
    }
  }, [unload]);

  const play = useCallback(async () => {
    if (!playerRef.current) return;
    try { playerRef.current.play(); setState('playing'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Playback failed.'); }
  }, []);

  const pause = useCallback(async () => {
    if (!playerRef.current) return;
    try { playerRef.current.pause(); setState('paused'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Pause failed.'); }
  }, []);

  const seek = useCallback(async (ms: number) => {
    if (!playerRef.current) return;
    try { await playerRef.current.seekTo(ms / 1000); setPositionMs(ms); }
    catch (err) { setError(err instanceof Error ? err.message : 'Seek failed.'); }
  }, []);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  return { state, positionMs, durationMs, progress, error, load, play, pause, seek, unload };
}
