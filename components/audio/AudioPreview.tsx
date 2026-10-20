import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import WaveformPlayer from './WaveformPlayer';

interface Props {
  uri: string;
  durationMs?: number;
  tintColor?: string;
  onDelete?: () => void;
}

/**
 * Compact audio preview row: play/pause + waveform + duration + optional delete.
 * Used in Pages journal entries, Circle posts, and Bridge rehearsal.
 */
export default function AudioPreview({ uri, durationMs, tintColor = '#8B5CF6', onDelete }: Props) {
  const player = useAudioPlayer();

  useEffect(() => {
    player.load(uri);
    return () => { player.unload(); };
  }, [uri]);

  const togglePlay = async () => {
    if (player.state === 'playing') {
      await player.pause();
    } else {
      await player.play();
    }
  };

  const displayDuration = durationMs ?? player.durationMs;
  const totalSec = Math.floor(displayDuration / 1000);
  const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const sec = (totalSec % 60).toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.playBtn, { backgroundColor: tintColor }]}
        onPress={togglePlay}
      >
        <Text style={styles.playIcon}>
          {player.state === 'playing' ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      <View style={styles.waveform}>
        <WaveformPlayer
          uri={uri}
          tintColor={tintColor}
          progress={player.progress}
          onSeek={(pct) => player.seek(pct * player.durationMs)}
        />
      </View>

      <Text style={styles.duration}>{`${min}:${sec}`}</Text>

      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1a0d2e',
    borderRadius: 12,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { fontSize: 14, color: '#fff' },
  waveform: { flex: 1 },
  duration: { fontSize: 12, color: '#aaa', minWidth: 36, textAlign: 'right' },
  deleteBtn: { padding: 4 },
  deleteIcon: { color: '#888', fontSize: 14 },
});
