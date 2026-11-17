import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { requestMicrophonePermission } from '../components/audio/RecordingPermissionGate';
import { saveRecordingLocally } from '../services/audio/audioStorage';

export type RecordingState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'error';

export interface VoiceRecorderResult {
  state: RecordingState;
  durationMs: number;
  localUri: string | null;
  error: string | null;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<string | null>;
  discard: () => Promise<void>;
}

export function useVoiceRecorder(): VoiceRecorderResult {
  const [state, setState] = useState<RecordingState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [clearTimer]);

  const start = useCallback(async () => {
    try {
      setState('requesting');
      setError(null);
      setDurationMs(0);
      setLocalUri(null);

      const granted = await requestMicrophonePermission();
      if (!granted) {
        setState('error');
        setError('Microphone permission denied.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState('recording');

      timerRef.current = setInterval(() => {
        setDurationMs((d) => d + 100);
      }, 100);
    } catch (e: unknown) {
      setState('error');
      setError(e instanceof Error ? e.message : 'Recording failed to start.');
    }
  }, []);

  const pause = useCallback(async () => {
    if (!recordingRef.current || state !== 'recording') return;
    try {
      await recordingRef.current.pauseAsync();
      clearTimer();
      setState('paused');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to pause.');
    }
  }, [state, clearTimer]);

  const resume = useCallback(async () => {
    if (!recordingRef.current || state !== 'paused') return;
    try {
      await recordingRef.current.startAsync();
      setState('recording');
      timerRef.current = setInterval(() => {
        setDurationMs((d) => d + 100);
      }, 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to resume.');
    }
  }, [state]);

  const stop = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;
    try {
      clearTimer();
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setState('stopped');

      if (!uri) {
        setError('No recording URI returned.');
        return null;
      }

      const savedUri = await saveRecordingLocally(uri);
      setLocalUri(savedUri);

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      return savedUri;
    } catch (e: unknown) {
      setState('error');
      setError(e instanceof Error ? e.message : 'Failed to stop recording.');
      return null;
    }
  }, [clearTimer]);

  const discard = useCallback(async () => {
    clearTimer();
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    setLocalUri(null);
    setDurationMs(0);
    setError(null);
    setState('idle');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  }, [clearTimer]);

  return { state, durationMs, localUri, error, start, pause, resume, stop, discard };
}
