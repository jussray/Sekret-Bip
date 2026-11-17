import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '@/context/AppContext';

const EMOJI_LIBRARY = [
  { id: 'happy', emoji: '😊', label: 'happy' },
  { id: 'really-happy', emoji: '😄', label: 'really happy' },
  { id: 'excited', emoji: '🤩', label: 'excited' },
  { id: 'celebrating', emoji: '🥳', label: 'celebrating' },
  { id: 'proud', emoji: '🥹', label: 'proud' },
  { id: 'loved', emoji: '🥰', label: 'loved' },
  { id: 'crushing', emoji: '😍', label: 'crushing' },
  { id: 'playful', emoji: '😜', label: 'playful' },
  { id: 'silly', emoji: '🤪', label: 'silly' },
  { id: 'unbothered', emoji: '💅', label: 'unbothered' },
  { id: 'confident', emoji: '😎', label: 'confident' },
  { id: 'motivated', emoji: '🔥', label: 'motivated' },
  { id: 'good', emoji: '✨', label: 'good' },
  { id: 'hopeful', emoji: '🌈', label: 'hopeful' },
  { id: 'grateful', emoji: '🙏', label: 'grateful' },
  { id: 'connected', emoji: '🫶', label: 'connected' },
  { id: 'calm', emoji: '😌', label: 'calm' },
  { id: 'relieved', emoji: '😮‍💨', label: 'relieved' },
  { id: 'okay', emoji: '🙂', label: 'okay' },
  { id: 'neutral', emoji: '😐', label: 'neutral' },
  { id: 'thoughtful', emoji: '🤔', label: 'thoughtful' },
  { id: 'curious', emoji: '👀', label: 'curious' },
  { id: 'confused', emoji: '😵‍💫', label: 'confused' },
  { id: 'awkward', emoji: '🫠', label: 'awkward' },
  { id: 'numb', emoji: '😶', label: 'numb' },
  { id: 'bored', emoji: '🥱', label: 'bored' },
  { id: 'tired', emoji: '😴', label: 'tired' },
  { id: 'drained', emoji: '😩', label: 'drained' },
  { id: 'overwhelmed', emoji: '🤯', label: 'overwhelmed' },
  { id: 'anxious', emoji: '😰', label: 'anxious' },
  { id: 'worried', emoji: '😟', label: 'worried' },
  { id: 'sad', emoji: '😔', label: 'sad' },
  { id: 'crying', emoji: '😭', label: 'crying' },
  { id: 'hurt', emoji: '💔', label: 'hurt' },
  { id: 'lonely', emoji: '🥺', label: 'lonely' },
  { id: 'alone', emoji: '🫥', label: 'alone' },
  { id: 'disappointed', emoji: '😞', label: 'disappointed' },
  { id: 'frustrated', emoji: '😤', label: 'frustrated' },
  { id: 'mad', emoji: '😡', label: 'mad' },
  { id: 'annoyed', emoji: '🙄', label: 'annoyed' },
  { id: 'grossed-out', emoji: '🤢', label: 'grossed out' },
  { id: 'shocked', emoji: '😳', label: 'shocked' },
  { id: 'scared', emoji: '😨', label: 'scared' },
  { id: 'suspicious', emoji: '🤨', label: 'suspicious' },
  { id: 'secretive', emoji: '🤫', label: 'secretive' },
  { id: 'sleepy', emoji: '🌙', label: 'sleepy' },
  { id: 'heavy', emoji: '🌧️', label: 'heavy' },
  { id: 'peaceful', emoji: '☁️', label: 'peaceful' },
  { id: 'glowing', emoji: '🌟', label: 'glowing' },
  { id: 'healing', emoji: '🌱', label: 'healing' },
  { id: 'winning', emoji: '🏆', label: 'winning' },
  { id: 'locked-in', emoji: '🎯', label: 'locked in' },
  { id: 'music', emoji: '🎧', label: 'in my music' },
  { id: 'writing', emoji: '✍️', label: 'writing it out' },
  { id: 'quiet', emoji: '🕯️', label: 'quiet' },
  { id: 'chaotic', emoji: '🌪️', label: 'chaotic' },
] as const;

export function GlobalMoodButton() {
  const { mood, selectMood } = useAppContext();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => EMOJI_LIBRARY.find(item => item.id === mood), [mood]);

  function choose(id: string) {
    selectMood(id);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open emoji mood library"
        onPress={() => setOpen(true)}
        style={styles.floatingButton}
        activeOpacity={0.9}
      >
        <Text style={styles.floatingEmoji}>{selected?.emoji ?? '💭'}</Text>
        <Text style={styles.floatingText}>Mood</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.kicker}>MOOD</Text>
                <Text style={styles.title}>Pick your emoji</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sub}>No explaining. Just tap the emoji that feels right.</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.emojiGrid}>
              {EMOJI_LIBRARY.map(item => {
                const active = mood === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => choose(item.id)}
                    style={[styles.emojiButton, active && styles.emojiButtonActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    left: 14,
    zIndex: 1000,
    elevation: 20,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(18,11,29,0.94)',
  },
  floatingEmoji: { fontSize: 18 },
  floatingText: { color: '#f2ebf5', fontSize: 10, fontWeight: '900' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4,2,8,0.66)' },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#130d1d',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 26,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { color: '#c4b5fd', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#d8cfde', fontSize: 23 },
  sub: { color: '#978d9e', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 14 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 10 },
  emojiButton: {
    width: '14.8%',
    aspectRatio: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonActive: {
    borderColor: '#c4b5fd',
    backgroundColor: 'rgba(196,181,253,0.18)',
    transform: [{ scale: 1.06 }],
  },
  emoji: { fontSize: 28 },
});
