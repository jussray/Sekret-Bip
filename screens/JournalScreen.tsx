// screens/JournalScreen.tsx
// Se'kret Bip — Write It Out (Se'kret Pages)
// Vision: Late-night diary and Oracle. The page holds the mirror; companions do not.
// The Oracle only speaks when saved history supports a specific pattern.
//
// Polish pass (2026-06-07):
//   - Journal-specific backdrop with time-of-day framing
//   - Real LinearGradient scrim (replaces flat overlay)
//   - Oracle copy remains separate from every companion voice
//   - Mood-tinted glow on input border + greeting card (Happy/Neutral/Sad/Angry/Tired)
//   - Selected mood tag also tints the glow
//   - Staggered card fade-ins (140ms apart)
//   - Time-of-day hero copy: "morning pages" → "afternoon download" → "evening unload" → "late-night thoughts"
//   - Page-memory status stays neutral and non-charactered
//   - Scrapbook-style sticky-note for the calendar hint
//   - Curly quotes throughout
//
// Previous fixes preserved:
//   A1/A2/A3, B1/B2/B3/B4/B7/B8, C1/C2/C3/C4, D2

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGES, getRoomBg, type TimeOfDay } from '../constants/theme';
import { MOOD_GLOW } from '../constants/moodGlow';
import { MiniReactionSticker } from '../components/MiniReactionSticker';
import type { JournalEntry, MoodEntry, VoiceNote } from '../types/bridge';
import { buildOracleInsight } from '../services/oracle';
import {
  Text, TouchableOpacity, ScrollView,
  TextInput, View, Image, StyleSheet, Alert, Animated, Easing,
  type DimensionValue, Platform,
} from 'react-native';

// ── DEBUG ──────────────────────────────────────────────────────────────────
const DEBUG_HOTSPOTS = false;

// ── HOTSPOTS ───────────────────────────────────────────────────────────────
type Hotspot = {
  top?: DimensionValue; bottom?: DimensionValue;
  left?: DimensionValue; right?: DimensionValue;
  width: DimensionValue; height: DimensionValue;
  label: string;
};
const HOTSPOTS: Record<'journal' | 'calendar', Hotspot> = {
  journal:  { bottom: '6%', left: '26%', width: '40%', height: '22%', label: 'Journal 📖' },
  calendar: { top: '6%', right: '2%', width: '44%', height: '40%', label: 'Calendar 📅' },
};

// ── TIME OF DAY ────────────────────────────────────────────────────────────
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5  && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

const TIME_HERO: Record<TimeOfDay, { sub: string; main: string; badge: string }> = {
  morning: { sub: 'morning pages',       main: 'Se’kret 📖', badge: '☀️ morning' },
  day:     { sub: 'afternoon pages',     main: 'Se’kret 📖', badge: '🌤️ day' },
  evening: { sub: 'evening pages',       main: 'Se’kret 📖', badge: '🌆 evening' },
  night:   { sub: 'late-night pages',    main: 'Se’kret 📖', badge: '🌙 night' },
};

// ── HELPERS ────────────────────────────────────────────────────────────────
const JOURNAL_TAGS = ['school', 'family', 'friends', 'pressure', 'grief', 'lonely', 'trying', 'peace'];

const STARTER_PROMPTS: Record<TimeOfDay, { emoji: string; text: string }[]> = {
  morning: [
    { emoji: '☀️', text: "What's one thing you want to feel by the end of today?" },
    { emoji: '🌱', text: "What would make today a good day for you?" },
    { emoji: '💜', text: "What are you carrying into the morning that you didn't put down last night?" },
  ],
  day: [
    { emoji: '💭', text: "What's been living in the back of your head all day?" },
    { emoji: '🫶', text: "How are you actually doing right now — be honest." },
    { emoji: '✨', text: "What's something small that went okay today?" },
  ],
  evening: [
    { emoji: '🌆', text: "What's one thing from today you're still holding onto?" },
    { emoji: '🍃', text: "What did you have to pretend was fine today?" },
    { emoji: '💜', text: "What do you wish you could say to someone right now?" },
  ],
  night: [
    { emoji: '🌙', text: "What's keeping you up that you haven't said out loud yet?" },
    { emoji: '🕯️', text: "What do you need right now that nobody's offered?" },
    { emoji: '🌧️', text: "What would you say if you knew nobody was judging you?" },
  ],
};

// ── Props ──────────────────────────────────────────────────────────────────
interface JournalScreenProps {
  journalText:       string;
  setJournalText:    (text: string) => void;
  journalEntries:    JournalEntry[];
  saveJournalEntry:  () => void;
  mood:              string;
  t:                 Record<string, any>;
  setScreen:         (screen: string) => void;
  BottomNav:         React.ReactNode;
  moodHistory?:      MoodEntry[];
  voiceNotes?:       VoiceNote[];
  streakDays?:       number;
  selectedSekret?:   string;
}

export function JournalScreen({
  journalText, setJournalText, journalEntries, saveJournalEntry,
  mood, t,
  setScreen, BottomNav, moodHistory = [], voiceNotes = [], streakDays = 0,
  selectedSekret = 'soft',
}: JournalScreenProps) {

  const [showCheckIn,   setShowCheckIn]   = useState(false);
  const [checkInMood,   setCheckInMood]   = useState('');
  const [selectedTag,   setSelectedTag]   = useState('');
  const [promptIdx,     setPromptIdx]     = useState(0);

  const hour       = new Date().getHours();
  const timeOfDay  = getTimeOfDay(hour);
  const hero       = TIME_HERO[timeOfDay];
  const character: 'raylene' | 'rylane' = selectedSekret === 'rylane' ? 'rylane' : 'raylene';
  const roomArt    = getRoomBg(character, timeOfDay);
  const moodGlow   = MOOD_GLOW[mood] ?? MOOD_GLOW.Neutral;
  const tagGlow    = selectedTag ? '#a855f7' : moodGlow;

  // Staggered entrance ───────────────────────────────────────────────────────
  const cards = useRef([0, 0, 0, 0, 0].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(140, cards.map(v =>
      Animated.timing(v, {
        toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      })
    )).start();
  }, []);
  const cardAnim = (i: number) => ({
    opacity: cards[i],
    transform: [{ translateY: cards[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  });

  // Page-memory breath loop ───────────────────────────────────────────────────
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const breathStyle = {
    opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
    transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }],
  };

  const oracleInsight = useMemo(
    () => buildOracleInsight({ journalEntries, moodHistory, voiceNotes, streakDays }),
    [journalEntries, moodHistory, voiceNotes, streakDays],
  );

  const btn = () => [styles.btn, { backgroundColor: t.accent, shadowColor: moodGlow }] as any;

  const handleSave = () => {
    saveJournalEntry();
  };

  return (
    <View style={[styles.root, { backgroundColor: '#0d0914' }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Room with hotspots ─────────────────────────────────────── */}
        <View style={styles.roomWrap} pointerEvents="box-none">
          <Image source={roomArt} style={styles.roomImage} resizeMode="cover" blurRadius={1.5} />



          {/* Mood-tinted scrim — top */}
          <View
            style={[styles.moodScrim, { backgroundColor: moodGlow + '14' }]}
            pointerEvents="none"
          />

          {/* Real gradient bottom fade */}
          <LinearGradient
            colors={['transparent', 'rgba(13,9,20,0.55)', 'rgba(13,9,20,0.95)']}
            style={styles.roomGradient}
            pointerEvents="none"
          />

          <View style={styles.timeBadge} pointerEvents="none">
            <Text style={styles.timeBadgeText}>{hero.badge}</Text>
          </View>

          {/* Mini sticker — Raylene/Rylane journal companion */}
          <View style={{ position: 'absolute', top: 10, right: 10 }} pointerEvents="none">
            <MiniReactionSticker character={character} screenContext="journal" size={40} />
          </View>

          {/* Page-memory status — not a companion voice */}
          <Animated.View style={[styles.presencePill, breathStyle]} pointerEvents="none">
            <Text style={styles.presenceText}>
              the page remembers
            </Text>
          </Animated.View>

          <View style={styles.roomTitle} pointerEvents="none">
            <Text style={styles.roomTitleSub}>{hero.sub}</Text>
            <Text style={[styles.roomTitleMain, { textShadowColor: moodGlow + '99' }]}>
              {hero.main}
            </Text>
          </View>

          {/* HOTSPOT — Journal (already here) */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.hotspot, { bottom: HOTSPOTS.journal.bottom as any, left: HOTSPOTS.journal.left as any, width: HOTSPOTS.journal.width as any, height: HOTSPOTS.journal.height as any }, DEBUG_HOTSPOTS && styles.hotspotDebug]}
            onPress={() => {/* already on journal */}}
          >
            {DEBUG_HOTSPOTS && <Text style={styles.debugLabel}>{HOTSPOTS.journal.label}</Text>}
          </TouchableOpacity>

          {/* HOTSPOT — Calendar */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.hotspot, { top: HOTSPOTS.calendar.top as any, right: HOTSPOTS.calendar.right as any, width: HOTSPOTS.calendar.width as any, height: HOTSPOTS.calendar.height as any }, DEBUG_HOTSPOTS && styles.hotspotDebug]}
            onPress={() => setScreen('bippin2')}
          >
            {DEBUG_HOTSPOTS && <Text style={styles.debugLabel}>{HOTSPOTS.calendar.label}</Text>}
          </TouchableOpacity>

          {/* Scrapbook sticky-note hint */}
          {!DEBUG_HOTSPOTS && (
            <View style={[styles.stickyHint, { top: '6%', right: '4%' }]} pointerEvents="none">
              <Text style={styles.stickyHintText}>tap calendar → Bippin2 📅</Text>
            </View>
          )}
        </View>

        {/* ── Greeting card ─────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.floatCard,
            { borderColor: tagGlow, backgroundColor: 'rgba(13,9,20,0.88)', shadowColor: tagGlow },
            cardAnim(0),
          ]}
        >
          <Text style={styles.floatCardEmoji}>📖</Text>
          <Text style={[styles.floatCardText, { color: '#fff' }]}>Write it how it happened.</Text>
          <Text style={[styles.floatCardSub, { color: t.soft }]}>No lesson required. No polished version.</Text>
        </Animated.View>

        {/* ── Starter prompt ───────────────────────────────────────── */}
        {!journalText.trim() && (
          <Animated.View
            style={[
              styles.floatCard,
              { borderColor: moodGlow + '66', backgroundColor: 'rgba(20,12,35,0.82)', shadowColor: moodGlow },
              cardAnim(0),
            ]}
          >
            {(() => {
              const prompts = STARTER_PROMPTS[timeOfDay];
              const p = prompts[promptIdx % prompts.length];
              return (
                <>
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>{p.emoji}</Text>
                  <Text style={[styles.floatCardSub, { color: '#f5f0ff', fontSize: 14, fontWeight: '600', lineHeight: 22 }]}>
                    {p.text}
                  </Text>
                  <TouchableOpacity
                    style={[styles.promptCycleBtn, { borderColor: moodGlow + '66' }]}
                    onPress={() => setPromptIdx(i => i + 1)}
                  >
                    <Text style={[styles.promptCycleBtnText, { color: moodGlow }]}>different prompt</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Animated.View>
        )}

        {/* ── Journal input ─────────────────────────────────────────── */}
        <Animated.View style={cardAnim(1)}>
          <TextInput
            style={[
              styles.journalInput,
              {
                backgroundColor: 'rgba(13,9,20,0.88)',
                borderColor: tagGlow,
                color: '#fff',
                shadowColor: tagGlow,
              },
            ]}
            placeholder="Say it exactly how it felt…"
            placeholderTextColor="#4a3d6b"
            multiline
            value={journalText}
            onChangeText={setJournalText}
          />
        </Animated.View>

        {/* ── Media bip options ─────────────────────────────────────── */}
        <Animated.View style={[styles.mediaRow, cardAnim(2)]}>
          <TouchableOpacity
            style={[styles.mediaBtn, { borderColor: t.accent, backgroundColor: 'rgba(13,9,20,0.82)' }]}
            onPress={() => setScreen('voiceBip')}
          >
            <Text style={styles.mediaEmoji}>🎙️</Text>
            <Text style={[styles.mediaBtnLabel, { color: t.soft }]}>Voice Bip</Text>
            <Text style={styles.mediaBtnSub}>30–60 sec</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mediaBtn, { borderColor: t.accent, backgroundColor: 'rgba(13,9,20,0.82)' }]}
            onPress={() => Alert.alert('Video Bip', 'Video Bip is coming soon. 💜')}
          >
            <Text style={styles.mediaEmoji}>📹</Text>
            <Text style={[styles.mediaBtnLabel, { color: t.soft }]}>Video Bip</Text>
            <Text style={styles.mediaBtnSub}>30–60 sec</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mediaBtn, { borderColor: t.accent, backgroundColor: 'rgba(13,9,20,0.82)' }]}
            onPress={() => Alert.alert('Photo Scrap', 'Photo scraps are coming soon. 🖼️')}
          >
            <Text style={styles.mediaEmoji}>🖼️</Text>
            <Text style={[styles.mediaBtnLabel, { color: t.soft }]}>Photo</Text>
            <Text style={styles.mediaBtnSub}>optional</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── The Oracle only speaks when the history supports it ─── */}
        {oracleInsight ? (
          <Animated.View
            style={[
              styles.oracleCard,
              { borderColor: 'rgba(196,181,253,0.55)', shadowColor: '#c4b5fd' },
              cardAnim(3),
            ]}
          >
            <Text style={styles.oracleLabel}>📖 SE’KRET NOTICED</Text>
            {oracleInsight.lines.map((line) => (
              <Text key={line} style={styles.oracleLine}>{line}</Text>
            ))}
          </Animated.View>
        ) : null}

        {/* ── Mood tags ─────────────────────────────────────────────── */}
        <Animated.View style={cardAnim(4)}>
          <Text style={[styles.sectionTitle, { color: '#fff' }]}>Mood Tags</Text>
          <View style={styles.tagRow}>
            {JOURNAL_TAGS.map(tag => {
              const active = selectedTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: active ? t.accent : 'rgba(13,9,20,0.82)',
                      borderColor: active ? '#a855f7' : t.accent,
                    },
                  ]}
                  onPress={() => setSelectedTag(active ? '' : tag)}
                >
                  <Text style={[styles.tagText, { color: active ? '#fff' : t.soft }]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.savePrivateRow}>
            <Text style={styles.savePrivateText}>🔒 Save privately — only you can see this.</Text>
          </View>

          <TouchableOpacity style={btn()} onPress={handleSave}>
            <Text style={styles.btnText}>Save Page 💜</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Saved pages ───────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: '#fff' }]}>Saved Pages</Text>
        {journalEntries.length === 0 ? (
          <View style={[styles.floatCard, { borderColor: t.accent, backgroundColor: 'rgba(13,9,20,0.82)' }]}>
            <Text style={[styles.emptyText, { color: '#7c6899' }]}>No pages yet. Your truth has a place here.</Text>
          </View>
        ) : (
          journalEntries.map(e => (
            <View key={e.id} style={[styles.floatCard, { borderColor: t.accent, backgroundColor: 'rgba(13,9,20,0.85)' }]}>
              <Text style={[styles.entryDate, { color: '#7c6899' }]}>
                {e.date}{e.time ? ` · ${e.time}` : ''} · {e.mood}
              </Text>
              <Text style={[styles.entryText, { color: '#f5f0ff' }]}>“{e.text}”</Text>
            </View>
          ))
        )}

      </ScrollView>
      {BottomNav}
    </View>
  );
}

const WEB_MAX = Platform.OS === 'web' ? { maxWidth: 520, width: '100%' as const, alignSelf: 'center' as const } : {};

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#0d0914' },
  scroll:         { paddingBottom: 100, ...WEB_MAX },
  roomWrap:       { position: 'relative', width: '100%', height: Platform.OS === 'web' ? 180 : 240, marginBottom: 16, overflow: 'hidden' },
  roomImage:      { width: '100%', height: '100%' },
  moodScrim:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  roomGradient:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  timeBadge:      { position: 'absolute', top: 10, left: 12, backgroundColor: 'rgba(13,9,20,0.65)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  timeBadgeText:  { color: '#c4b5fd', fontSize: 11, fontWeight: '600' },
  presencePill:   {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderColor: 'rgba(168,85,247,0.45)', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  presenceText:   { color: '#e9d5ff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  roomTitle:      { position: 'absolute', bottom: 16, left: 18, right: 18 },
  roomTitleSub:   { fontSize: 10, color: '#a855f7', letterSpacing: 1.4, marginBottom: 4, textTransform: 'uppercase' },
  roomTitleMain:  { fontSize: 24, color: '#f5f0ff', fontWeight: '900', fontStyle: 'italic', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  hotspot:        { position: 'absolute' },
  hotspotDebug:   { borderWidth: 2, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.18)' },
  debugLabel:     { color: '#f472b6', fontSize: 9, fontWeight: '900', padding: 2 },
  stickyHint:     {
    position: 'absolute',
    backgroundColor: '#fff8e7',
    borderColor: '#a855f7', borderWidth: 1, borderStyle: 'dashed',
    borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5,
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 1, height: 2 },
  },
  stickyHintText: { color: '#3d2563', fontSize: 10, fontWeight: '700', fontStyle: 'italic' },
  sectionTitle:   { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 14, marginHorizontal: 16 },
  floatCard:      {
    marginHorizontal: 16, marginBottom: Platform.OS === 'web' ? 8 : 12, borderRadius: 18, borderWidth: 1, padding: 16,
    shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  floatCardEmoji:    { fontSize: 28, marginBottom: 6 },
  promptCycleBtn:    { marginTop: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  promptCycleBtnText:{ fontSize: 12, fontWeight: '600' },
  oracleCard:     {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18, borderWidth: 1, padding: 18,
    backgroundColor: 'rgba(20,14,34,0.96)', shadowOpacity: 0.35, shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  oracleLabel:    { color: '#c4b5fd', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  oracleLine:     { color: '#f5f0ff', fontSize: 15, lineHeight: 23, marginBottom: 4, fontWeight: '600' },
  floatCardText:  { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  floatCardSub:   { fontSize: 13, lineHeight: 19 },
  journalInput:   {
    marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 18,
    minHeight: 130, textAlignVertical: 'top', borderWidth: 1, fontSize: 14, lineHeight: 22,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  mediaRow:       { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 14 },
  mediaBtn:       { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
  mediaEmoji:     { fontSize: 20, marginBottom: 4 },
  mediaBtnLabel:  { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  mediaBtnSub:    { fontSize: 10, color: '#7c6899', marginTop: 2 },
  tagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 10 },
  tag:            { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  tagText:        { fontSize: 12, fontWeight: '600' },
  savePrivateRow: { marginHorizontal: 16, marginBottom: 10 },
  savePrivateText:{ fontSize: 11, color: '#7c6899', textAlign: 'center', fontStyle: 'italic' },
  btn:            {
    marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 18, alignItems: 'center',
    shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  btnText:        { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  entryDate:      { fontSize: 11, marginBottom: 6 },
  entryText:      { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  emptyText:      { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },

});
