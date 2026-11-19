import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
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

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingRef = useRef<ReturnType<typeof useAudioRecorder> | null>(null);
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
        recordingRef.current.stop().catch(() => {});
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

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      recordingRef.current = audioRecorder;
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
      recordingRef.current.pause();
      clearTimer();
      setState('paused');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to pause.');
    }
  }, [state, clearTimer]);

  const resume = useCallback(async () => {
    if (!recordingRef.current || state !== 'paused') return;
    try {
      recordingRef.current.record();
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
      await recordingRef.current.stop();
      const uri = recordingRef.current.uri;
      recordingRef.current = null;
      setState('stopped');

      if (!uri) {
        setError('No recording URI returned.');
        return null;
      }

      const savedUri = await saveRecordingLocally(uri);
      setLocalUri(savedUri);

      await setAudioModeAsync({ allowsRecording: false });
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
      await recordingRef.current.stop().catch(() => {});
      recordingRef.current = null;
    }
    setLocalUri(null);
    setDurationMs(0);
    setError(null);
    setState('idle');
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, [clearTimer]);

  return { state, durationMs, localUri, error, start, pause, resume, stop, discard };
}
