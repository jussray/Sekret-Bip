import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import RecordingPermissionGate from './RecordingPermissionGate';
import WaveformPlayer from './WaveformPlayer';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const sec = (totalSec % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

interface Props {
  onSave: (uri: string, durationMs: number) => void;
  onDiscard?: () => void;
  maxDurationMs?: number;
  tintColor?: string;
}

export default function VoiceRecorder({
  onSave,
  onDiscard,
  maxDurationMs = 60000,
  tintColor = '#8B5CF6',
}: Props) {
  const { state, durationMs, localUri, error, start, pause, resume, stop, discard } =
    useVoiceRecorder();

  const handleStop = async () => {
    const uri = await stop();
    if (uri) {
      // stay in stopped state; show preview
    }
  };

  const handleSave = () => {
    if (localUri) onSave(localUri, durationMs);
  };

  const handleDiscard = async () => {
    await discard();
    onDiscard?.();
  };

  React.useEffect(() => {
    if (state === 'recording' && durationMs >= maxDurationMs) {
      handleStop();
    }
  }, [durationMs, state]);

  return (
    <RecordingPermissionGate>
      <View style={styles.container}>
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={[styles.timer, { color: tintColor }]}>
          {formatDuration(durationMs)}
        </Text>

        {state === 'stopped' && localUri ? (
          <WaveformPlayer uri={localUri} tintColor={tintColor} />
        ) : (
          <View style={styles.waveformPlaceholder}>
            {(state === 'recording' || state === 'paused') && (
              <View style={[styles.pulse, { backgroundColor: tintColor, opacity: state === 'recording' ? 1 : 0.4 }]} />
            )}
          </View>
        )}

        <View style={styles.controls}>
          {state === 'idle' || state === 'requesting' ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: tintColor }]}
              onPress={start}
              disabled={state === 'requesting'}
            >
              {state === 'requesting' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>● Record</Text>
              )}
            </TouchableOpacity>
          ) : state === 'recording' ? (
            <View style={styles.row}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pause}>
                <Text style={styles.btnText}>⏸ Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: tintColor }]}
                onPress={handleStop}
              >
                <Text style={styles.btnText}>■ Stop</Text>
              </TouchableOpacity>
            </View>
          ) : state === 'paused' ? (
            <View style={styles.row}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={resume}>
                <Text style={styles.btnText}>▶ Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: tintColor }]}
                onPress={handleStop}
              >
                <Text style={styles.btnText}>■ Stop</Text>
              </TouchableOpacity>
            </View>
          ) : state === 'stopped' ? (
            <View style={styles.row}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleDiscard}>
                <Text style={styles.btnText}>✕ Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: tintColor }]}
                onPress={handleSave}
              >
                <Text style={styles.btnText}>✓ Use this</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </RecordingPermissionGate>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 16, padding: 16 },
  timer: { fontSize: 36, fontWeight: '700', letterSpacing: 2 },
  waveformPlaceholder: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: { width: 12, height: 12, borderRadius: 6 },
  controls: { width: '100%', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: '#2a1a40',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: '#f87171', fontSize: 13 },
});
