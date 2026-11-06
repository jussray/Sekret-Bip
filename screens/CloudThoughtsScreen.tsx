// screens/CloudThoughtsScreen.tsx
// Se'kret Bip — Cloud Thoughts
// The quiet space. Say what you've been carrying.
// Not therapy. Not clinical. Just the cloud.
//
// Fixes applied (audit 2026-06-03):
//   A4 — back target prop added (backTarget, defaults to 'home')
//   C5 — mode buttons now change the active prompt set and API context

import React, { useState, useEffect, useRef } from 'react';
import { IMAGES, getRoomBg } from '../constants/theme';
import { fetchSekretReply } from '../utils/api';
import type { OracleProfile, OracleSide } from '../services/oracleDiscovery';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  View,
  Image,
  StyleSheet,
  Platform,
  ImageBackground,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function glowFor(mood?: string): string {
  const m = (mood || '').toLowerCase();
  if (m.includes('happy'))       return '#fbbf24';
  if (m.includes('sad') || m.includes('anx'))    return '#7dd3fc';
  if (m.includes('angry') || m.includes('over') || m.includes('stress')) return '#f472b6';
  if (m.includes('tired'))       return '#6d28d9';
  if (m.includes('calm'))        return '#c4b5fd';
  return '#c4b5fd';
}

function timeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

const CLOUD_HP = IMAGES.cloudHeadphones;
const CLOUD    = IMAGES.cloud;

// ── Prompt sets — each mode has its own rotation ────────────────────────────

const PROMPT_SETS: Record<string, { emoji: string; text: string }[]> = {
  cloud: [
    { emoji: '☁️', text: "What's been sitting in your chest lately?" },
    { emoji: '🌙', text: "What thought keeps coming back at night?" },
    { emoji: '💜', text: "What do you wish someone would just ask you?" },
    { emoji: '🫶', text: "What have you been carrying by yourself?" },
    { emoji: '✨', text: "What would you say if nobody was judging?" },
    { emoji: '🕯️', text: "What do you need right now that you haven't asked for?" },
    { emoji: '🌧️', text: "What's one thing that felt heavy this week?" },
    { emoji: '💫', text: "What are you proud of that nobody else noticed?" },
  ],
  braindump: [
    { emoji: '🧠', text: "Let it all out. No filter, no judgment." },
    { emoji: '💥', text: "What's been loud in your head?" },
    { emoji: '🌀', text: "Say the thing you keep pushing down." },
    { emoji: '🔊', text: "What would you say if you didn't have to be calm about it?" },
  ],
  night: [
    { emoji: '🌙', text: "What are you thinking about that you can't turn off?" },
    { emoji: '🌃', text: "What would feel better if you said it out loud?" },
    { emoji: '😶‍🌫️', text: "What are you too tired to pretend is fine?" },
    { emoji: '🕯️', text: "What do late nights make you feel?" },
  ],
  reflection: [
    { emoji: '💭', text: "What did this week actually feel like?" },
    { emoji: '🪞', text: "What moment from lately keeps replaying?" },
    { emoji: '🌱', text: "What did you handle quietly that nobody saw?" },
    { emoji: '📖', text: "What would your honest journal entry say today?" },
  ],
  checkin: [
    { emoji: '🫶', text: "How are you actually doing right now?" },
    { emoji: '💚', text: "What's one thing your body is telling you today?" },
    { emoji: '☀️', text: "What's something you're grateful you got through?" },
    { emoji: '🌊', text: "On a scale of heavy to okay — where are you?" },
  ],
};

type ModeKey = 'cloud' | 'braindump' | 'night' | 'reflection' | 'checkin';

const MODES: { key: ModeKey; emoji: string; label: string; sub: string }[] = [
  { key: 'braindump',  emoji: '🧠', label: 'brain dump',     sub: 'just let it all out'    },
  { key: 'night',      emoji: '🌙', label: 'night thoughts', sub: 'for when it gets loud'  },
  { key: 'reflection', emoji: '💭', label: 'reflection',     sub: 'look back softly'       },
  { key: 'checkin',    emoji: '🫶', label: 'check-in',       sub: 'how are you really'     },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface CloudThoughtsScreenProps {
  t:             Record<string, any>;
  mood:          string;
  setScreen:     (screen: string) => void;
  BottomNav:     React.ReactNode;
  backTarget?:   string;         // Fix A4: defaults to 'home'
  selectedSekret?: string;       // 'soft' | 'rylane' | 'cloud' | 'night'
  privateProfile?: OracleProfile;
  profileSide?: OracleSide;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CloudThoughtsScreen({
  t,
  mood,
  setScreen,
  BottomNav,
  backTarget = 'home',
  selectedSekret,
  privateProfile,
  profileSide = 'teen',
}: CloudThoughtsScreenProps) {

  // Character-aware display name
  const characterName = selectedSekret === 'rylane' ? 'Rylane' : "Se'kret";

  const [input,      setInput]      = useState('');
  const [reply,      setReply]      = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [promptIdx,  setPromptIdx]  = useState(0);
  const [sent,       setSent]       = useState(false);
  const [activeMode, setActiveMode] = useState<ModeKey>('cloud');   // Fix C5

  const hour    = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;

  // Mood glow + character-aware backdrop
  const glow     = glowFor(mood);
  const charKey  = selectedSekret === 'rylane' ? 'rylane' : 'raylene';
  const bgSource = getRoomBg(charKey, timeOfDay());

  // Breath loop on hero cloud
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2100, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(breath, { toValue: 0, duration: 2100, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, []);
  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  // Fix C5: prompts rotate within the active mode's set
  const currentPrompts = PROMPT_SETS[activeMode];
  const currentPrompt  = currentPrompts[promptIdx % currentPrompts.length];

  const sendThought = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setSent(true);
    setIsThinking(true);
    try {
      // Fix C5: pass activeMode as context so the API can tune its tone
      const r = await fetchSekretReply(text, activeMode, mood, selectedSekret, undefined, privateProfile, profileSide);
      setReply(r);
    } catch {
      setReply('Cloud is quiet right now. Try again soon.');
    } finally {
      setIsThinking(false);
    }
  };

  // Fix C5: switching modes resets to that mode's first prompt and clears reply
  const handleModeSwitch = (key: ModeKey) => {
    if (key === activeMode) return;
    setActiveMode(key);
    setPromptIdx(0);
    setInput('');
    setReply('');
    setSent(false);
  };

  return (
    <ImageBackground source={bgSource} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(13,9,20,0.72)', 'rgba(30,18,55,0.82)', 'rgba(13,9,20,0.95)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setScreen(backTarget)}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={[styles.backText, { color: '#7c6899' }]}>← back</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <View style={styles.heroWrap}>
          <View pointerEvents="none" style={styles.envCloudLayer}>
            <Animated.Image
              source={CLOUD}
              style={[styles.envCloud, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}
              resizeMode="contain"
            />
            <Animated.Image
              source={CLOUD_HP}
              style={[styles.envCloudSmall, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.heroSub, { color: glow }]}>
            {isNight ? 'late night thoughts 🌙' : 'cloud thoughts ☁️'}
          </Text>
          <Text style={[styles.heroTitle, { color: glow }]}>Cloud Thoughts</Text>
          <Text style={[styles.heroMini, { color: '#cbb5ff' }]}>
            This is just for you. Say it here.
          </Text>
        </View>

        {/* ── Mode row — Fix C5: each button switches prompt set + context ── */}
        <View style={styles.modeRow}>
          {MODES.map(mode => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeBtn,
                {
                  borderColor:     activeMode === mode.key ? t.accent : 'rgba(124,58,237,0.3)',
                  backgroundColor: activeMode === mode.key
                    ? 'rgba(217,70,239,0.14)'
                    : 'rgba(13,9,20,0.82)',
                },
              ]}
              onPress={() => handleModeSwitch(mode.key)}
              accessibilityRole="button"
              accessibilityLabel={mode.label}
            >
              <Text style={styles.modeEmoji}>{mode.emoji}</Text>
              <Text style={[styles.modeLabel, { color: t.soft }]}>{mode.label}</Text>
              <Text style={styles.modeSub}>{mode.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Reflection prompt ── */}
        <View style={[styles.promptCard, { borderColor: glow + '88', backgroundColor: 'rgba(30,18,55,0.82)', shadowColor: glow }]}>
          <Text style={styles.promptEmoji}>{currentPrompt.emoji}</Text>
          <Text style={[styles.promptText, { color: '#f5f0ff' }]}>{currentPrompt.text}</Text>
          <TouchableOpacity
            style={[styles.promptBtn, { borderColor: t.accent }]}
            onPress={() => setPromptIdx(i => (i + 1) % currentPrompts.length)}
            accessibilityRole="button"
            accessibilityLabel="Different prompt"
          >
            <Text style={[styles.promptBtnText, { color: t.soft }]}>different prompt</Text>
          </TouchableOpacity>
        </View>

        {/* ── Input ── */}
        <View style={[styles.inputCard, { borderColor: glow + '88', backgroundColor: 'rgba(30,18,55,0.82)', shadowColor: glow }]}>
          <TextInput
            style={[styles.input, { color: '#f5f0ff' }]}
            placeholder="let it out softly..."
            placeholderTextColor="#4a3d6b"
            multiline
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() ? t.accent : 'rgba(124,58,237,0.2)' }]}
            onPress={sendThought}
            disabled={!input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send to the clouds"
          >
            <Text style={styles.sendBtnText}>send to the clouds ☁️</Text>
          </TouchableOpacity>
        </View>

        {/* ── Thinking ── */}
        {isThinking && (
          <View style={[styles.replyCard, { borderColor: 'rgba(168,85,247,0.3)', backgroundColor: 'rgba(13,9,20,0.9)' }]}>
            <Image source={CLOUD} style={styles.replyCloud} resizeMode="contain" />
            <Text style={[styles.thinkingText, { color: t.soft }]}>
              {characterName} is sitting with that... ☁️
            </Text>
          </View>
        )}

        {/* ── Reply ── */}
        {reply && !isThinking && (
          <View style={[styles.replyCard, { borderColor: 'rgba(168,85,247,0.3)', backgroundColor: 'rgba(13,9,20,0.92)' }]}>
            <Image source={CLOUD_HP} style={styles.replyCloud} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyLabel, { color: '#a855f7' }]}>{characterName} says 💜</Text>
              <Text style={[styles.replyText, { color: t.soft }]}>{reply}</Text>
            </View>
          </View>
        )}

        {/* ── Privacy note ── */}
        <View style={[styles.noteStrip, { borderColor: 'rgba(168,85,247,0.2)' }]}>
          <Text style={styles.noteText}>
            Everything you send here stays between you and Se'kret. 🔒
          </Text>
        </View>

      </ScrollView>
      {BottomNav}
    </ImageBackground>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { paddingBottom: 100, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  header:        { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: 16, marginBottom: 8 },
  backBtn:       { alignSelf: 'flex-start' },
  backText:      { fontSize: 14 },
  heroWrap:      { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  heroCloud:     { width: 80, height: 80, marginBottom: 12 },
  envCloudLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  envCloud: {
    width: 260, height: 260,
    position: 'absolute',
    top: -24,
    right: -40,
  },
  envCloudSmall: {
    width: 140, height: 140,
    position: 'absolute',
    bottom: -8,
    left: -18,
  },
  heroSub:       { fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  heroTitle:     { fontSize: 30, fontWeight: '900', fontStyle: 'italic', marginBottom: 6 },
  heroMini:      { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Mode row — Fix C5: row comes before prompt so mode is chosen first
  modeRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
    marginHorizontal: 16,
    marginBottom:  14,
  },
  modeBtn: {
    width:        '47%',
    borderRadius: 16,
    borderWidth:  1,
    padding:      14,
    alignItems:   'center',
  },
  modeEmoji:  { fontSize: 24, marginBottom: 6 },
  modeLabel:  { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  modeSub:    { fontSize: 10, color: '#7c6899', textAlign: 'center' },

  promptCard:    { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, borderWidth: 1, padding: 20, alignItems: 'center', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  promptEmoji:   { fontSize: 32, marginBottom: 10 },
  promptText:    { fontSize: 17, fontWeight: '700', textAlign: 'center', lineHeight: 26, marginBottom: 16 },
  promptBtn:     { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 },
  promptBtnText: { fontSize: 12, fontWeight: '600' },

  inputCard:     { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, borderWidth: 1, padding: 16, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  input:         { minHeight: 100, fontSize: 14, lineHeight: 22, textAlignVertical: 'top', marginBottom: 12 },
  sendBtn:       { borderRadius: 16, padding: 14, alignItems: 'center' },
  sendBtnText:   { color: '#fff', fontSize: 14, fontWeight: '700' },

  replyCard:     { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  replyCloud:    { width: 36, height: 36, marginTop: 2 },
  replyLabel:    { fontSize: 10, fontWeight: '700', marginBottom: 6 },
  replyText:     { fontSize: 14, lineHeight: 22 },
  thinkingText:  { fontSize: 13, fontStyle: 'italic', flex: 1 },

  noteStrip:     { marginHorizontal: 16, marginBottom: 20, borderWidth: 1, borderRadius: 14, padding: 14 },
  noteText:      { color: '#7c6899', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
