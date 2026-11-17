import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { isFounderPreviewEnabled } from '@/constants/founderPreview';

const FRAMES = ['polaroid', 'taped note', 'night sky', 'soft cloud'] as const;
const STICKERS = ['⭐', '☁️', '🌙', '💜', '🎧', '🪷'] as const;

const SAMPLE_MEMORIES = [
  {
    title: 'I handled today better than I thought',
    body: 'I took a minute before answering and it actually helped.',
    mood: 'quietly proud',
    song: 'the song I kept replaying',
    visibility: 'private',
    date: 'July 12',
  },
  {
    title: 'A soft moment',
    body: 'The rain was loud and everybody finally stopped talking for a minute.',
    mood: 'calm',
    song: 'rain on the window',
    visibility: 'private',
    date: 'July 9',
  },
] as const;

export default function ScrapbookPreviewRoute() {
  const [frame, setFrame] = useState<(typeof FRAMES)[number]>('polaroid');
  const [selectedStickers, setSelectedStickers] = useState<string[]>(['⭐', '💜']);
  const enabled = isFounderPreviewEnabled();

  const stickerLine = useMemo(() => selectedStickers.join(' '), [selectedStickers]);

  if (!enabled) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedTitle}>Scrapbook preview is development-only.</Text>
      </View>
    );
  }

  function toggleSticker(sticker: string) {
    setSelectedStickers(current => current.includes(sticker)
      ? current.filter(value => value !== sticker)
      : [...current, sticker].slice(-4));
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#f6edf7', '#ece3f4', '#d9d4ee']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Founder Preview</Text>
          </TouchableOpacity>
          <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>UI PROTOTYPE</Text></View>
        </View>

        <Text style={styles.kicker}>EMOTIONAL SCRAPBOOK</Text>
        <Text style={styles.title}>Your life, in pieces worth keeping.</Text>
        <Text style={styles.subtitle}>
          This founder-only prototype shows the intended memory-board experience. It does not save, upload, share, or expose private media yet.
        </Text>

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryTitle}>🔒 Private by default</Text>
          <Text style={styles.boundaryText}>
            Future sharing must be a separate teen-confirmed action for Crew, Circle, or Parent Window. No automatic parent access. No engagement ranking.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>TRY A FRAME</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
          {FRAMES.map(value => (
            <TouchableOpacity
              key={value}
              onPress={() => setFrame(value)}
              style={[styles.optionChip, frame === value && styles.optionChipActive]}
            >
              <Text style={[styles.optionText, frame === value && styles.optionTextActive]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>ADD STICKERS</Text>
        <View style={styles.stickerRow}>
          {STICKERS.map(sticker => {
            const selected = selectedStickers.includes(sticker);
            return (
              <TouchableOpacity
                key={sticker}
                onPress={() => toggleSticker(sticker)}
                style={[styles.stickerButton, selected && styles.stickerButtonSelected]}
              >
                <Text style={styles.sticker}>{sticker}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.board}>
          {SAMPLE_MEMORIES.map((memory, index) => (
            <View
              key={memory.title}
              style={[
                styles.memoryCard,
                index % 2 === 0 ? styles.rotateLeft : styles.rotateRight,
                frame === 'night sky' && styles.nightCard,
                frame === 'soft cloud' && styles.cloudCard,
                frame === 'taped note' && styles.noteCard,
              ]}
            >
              <View style={styles.tape} />
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoEmoji}>{index === 0 ? '🪞' : '🌧️'}</Text>
                <Text style={styles.photoText}>private photo or video</Text>
              </View>
              <Text style={[styles.memoryTitle, frame === 'night sky' && styles.nightText]}>{memory.title}</Text>
              <Text style={[styles.memoryBody, frame === 'night sky' && styles.nightBody]}>{memory.body}</Text>
              <Text style={styles.memoryMeta}>mood: {memory.mood}</Text>
              <Text style={styles.memoryMeta}>soundtrack: {memory.song}</Text>
              <View style={styles.memoryFooter}>
                <Text style={styles.privatePill}>🔒 {memory.visibility}</Text>
                <Text style={styles.date}>{memory.date}</Text>
              </View>
              <Text style={styles.cardStickers}>{stickerLine}</Text>
            </View>
          ))}
        </View>

        <View style={styles.notBuiltCard}>
          <Text style={styles.notBuiltTitle}>What still has to be built</Text>
          <Text style={styles.notBuiltText}>
            Durable scrapbook tables and repository, private media storage, edit/delete/archive, sharing consent, moderation, upload progress, offline queueing, and device tests. This screen is visual proof, not fake completion.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ece3f4' },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10051f', padding: 30 },
  lockedTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 80, maxWidth: 680, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  backButton: { paddingVertical: 8, paddingRight: 10 },
  backText: { color: '#5e3f73', fontSize: 12, fontWeight: '900' },
  previewBadge: { borderRadius: 999, backgroundColor: '#5b2777', paddingHorizontal: 10, paddingVertical: 5 },
  previewBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  kicker: { color: '#7d3c98', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#2f183b', fontSize: 30, lineHeight: 38, fontWeight: '900', marginTop: 7 },
  subtitle: { color: '#6f5b78', fontSize: 13, lineHeight: 20, marginTop: 9, marginBottom: 17 },
  boundaryCard: { borderRadius: 18, borderWidth: 1, borderColor: '#7d3c9833', backgroundColor: '#ffffffaa', padding: 15, marginBottom: 20 },
  boundaryTitle: { color: '#442453', fontSize: 13, fontWeight: '900' },
  boundaryText: { color: '#6f5b78', fontSize: 11, lineHeight: 17, marginTop: 5 },
  sectionLabel: { color: '#765b81', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 9, marginTop: 4 },
  optionRow: { gap: 8, paddingBottom: 16 },
  optionChip: { borderRadius: 999, borderWidth: 1, borderColor: '#7d3c9844', backgroundColor: '#ffffff88', paddingHorizontal: 13, paddingVertical: 8 },
  optionChipActive: { backgroundColor: '#5b2777', borderColor: '#5b2777' },
  optionText: { color: '#684d72', fontSize: 10, fontWeight: '800' },
  optionTextActive: { color: '#fff' },
  stickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  stickerButton: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff99', borderWidth: 1, borderColor: '#ffffff' },
  stickerButtonSelected: { borderColor: '#7d3c98', backgroundColor: '#ead4f2' },
  sticker: { fontSize: 21 },
  board: { gap: 23, paddingHorizontal: 8, paddingVertical: 8 },
  memoryCard: { borderRadius: 5, backgroundColor: '#fffdf8', padding: 15, paddingTop: 20, shadowColor: '#4f315d', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, overflow: 'visible' },
  rotateLeft: { transform: [{ rotate: '-1.2deg' }] },
  rotateRight: { transform: [{ rotate: '1.1deg' }] },
  nightCard: { backgroundColor: '#1d1732' },
  cloudCard: { backgroundColor: '#f8fbff', borderRadius: 24 },
  noteCard: { backgroundColor: '#fff7bf' },
  tape: { position: 'absolute', top: -8, alignSelf: 'center', width: 78, height: 21, backgroundColor: '#e5d6c4aa', transform: [{ rotate: '-2deg' }] },
  photoPlaceholder: { height: 140, borderRadius: 3, backgroundColor: '#ddd5e4', alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  photoEmoji: { fontSize: 34 },
  photoText: { color: '#786d7e', fontSize: 9, fontWeight: '800', marginTop: 6 },
  memoryTitle: { color: '#33223a', fontSize: 17, fontWeight: '900', lineHeight: 23 },
  memoryBody: { color: '#604f66', fontSize: 12, lineHeight: 19, marginTop: 6 },
  nightText: { color: '#f2eaff' },
  nightBody: { color: '#c6b8d9' },
  memoryMeta: { color: '#8c778f', fontSize: 9, marginTop: 6, fontStyle: 'italic' },
  memoryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  privatePill: { color: '#633779', fontSize: 9, fontWeight: '900' },
  date: { color: '#9b8aa1', fontSize: 9 },
  cardStickers: { position: 'absolute', right: 11, top: 148, fontSize: 15 },
  notBuiltCard: { borderRadius: 18, backgroundColor: '#3f2748', padding: 16, marginTop: 30 },
  notBuiltTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  notBuiltText: { color: '#d8c9df', fontSize: 11, lineHeight: 18, marginTop: 6 },
});
