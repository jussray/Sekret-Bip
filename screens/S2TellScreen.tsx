// screens/S2TellScreen.tsx
// Se'krets 2 Tell — emotional bridge tool for teens.
// Teen writes raw, Se'kret translates it to a softer version.
// Nothing sends to parent unless teen actively chooses.

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchSekretReply } from '../utils/api';
import type { OracleProfile } from '../services/oracleDiscovery';
import { createStyles } from '../constants/styles';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface S2TellEntry {
  id:        string;
  raw:       string;
  tone:      string;
  rewrite:   string;
  savedAt:   string;
  shared:    boolean;
}

interface S2TellScreenProps {
  t:               Record<string, any>;
  setScreen:       (screen: string) => void;
  BottomNav:       React.ReactNode;
  selectedSekret?: string;
  mood?:           string;
  privateProfile?: OracleProfile;
}

// ── Tone options ──────────────────────────────────────────────────────────────

const TONES = [
  { id: 'soft',        emoji: '🌙', label: 'Soft Start'          },
  { id: 'honest',      emoji: '💜', label: 'Honest'              },
  { id: 'boundary',    emoji: '🛡️', label: 'Boundary'            },
  { id: 'idontknow',   emoji: '☁️', label: "I Don't Know How"    },
] as const;

type ToneId = (typeof TONES)[number]['id'];

// ── Component ─────────────────────────────────────────────────────────────────

export function S2TellScreen({
  t, setScreen, BottomNav, selectedSekret, mood, privateProfile,
}: S2TellScreenProps) {
  const styles = createStyles(t as { background: string; card: string; accent: string; soft: string; [key: string]: string });

  // ── State ──────────────────────────────────────────────────────────────────
  const [s2tellRaw,     setS2tellRaw]     = useState('');
  const [s2tellTone,    setS2tellTone]    = useState<ToneId>('soft');
  const [s2tellRewrite, setS2tellRewrite] = useState('');
  const [s2tellSaved,   setS2tellSaved]   = useState(false);
  const [s2tellShared,  setS2tellShared]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [savedMsg,      setSavedMsg]      = useState('');
  const [sharedMsg,     setSharedMsg]     = useState('');

  // ── Animations ─────────────────────────────────────────────────────────────
  const fade1   = useRef(new Animated.Value(0)).current;
  const fade2   = useRef(new Animated.Value(0)).current;
  const fade3   = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const dur  = 400;
    Animated.stagger(120, [
      Animated.timing(fade1, { toValue: 1, duration: dur, easing: ease, useNativeDriver: true }),
      Animated.timing(fade2, { toValue: 1, duration: dur, easing: ease, useNativeDriver: true }),
      Animated.timing(fade3, { toValue: 1, duration: dur, easing: ease, useNativeDriver: true }),
    ]).start();
  }, []);

  const slide = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  });

  const showResultCard = () => {
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue:  1,
      duration: 420,
      easing:   Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const selectedTone = TONES.find(t => t.id === s2tellTone)!;

  const handleGenerate = async () => {
    if (!s2tellRaw.trim()) return;
    setLoading(true);
    setS2tellRewrite('');
    setS2tellSaved(false);
    setS2tellShared(false);
    setSavedMsg('');
    setSharedMsg('');
    try {
      const reply = await fetchSekretReply(
        s2tellRaw,
        's2tell',
        selectedTone.label,
        selectedSekret,
        undefined,
        privateProfile,
        'teen',
      );
      setS2tellRewrite(reply);
      showResultCard();
    } catch {
      setS2tellRewrite("Se'kret is listening. Try again in a moment. 💜");
      showResultCard();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!s2tellRewrite) return;

    const entry: S2TellEntry = {
      id:      Date.now().toString(),
      raw:     s2tellRaw,
      tone:    s2tellTone,
      rewrite: s2tellRewrite,
      savedAt: new Date().toISOString(),
      shared:  false,
    };

    try {
      // Save rewrite as the "current" saved item for quick access
      await AsyncStorage.setItem('s2tell_saved', s2tellRewrite);

      // Append to private Oracle history — never exposed to Circle or parent
      const raw = await AsyncStorage.getItem('s2tell_history');
      const history: S2TellEntry[] = raw ? JSON.parse(raw) : [];
      history.unshift(entry);
      await AsyncStorage.setItem('s2tell_history', JSON.stringify(history));
    } catch {
      // Storage failure — silent, state still updates for this session
    }

    setS2tellSaved(true);
    setSavedMsg('Saved privately. It\'s yours until you\'re ready.');
  };

  const handleShare = async () => {
    if (!s2tellRewrite) return;

    try {
      // Update most recent history entry to mark as intended-to-share
      const raw = await AsyncStorage.getItem('s2tell_history');
      const history: S2TellEntry[] = raw ? JSON.parse(raw) : [];
      // Mark the first unshared entry that matches this rewrite
      const idx = history.findIndex(e => e.rewrite === s2tellRewrite && !e.shared);
      if (idx !== -1) {
        history[idx] = { ...history[idx], shared: true };
        await AsyncStorage.setItem('s2tell_history', JSON.stringify(history));
      }

      // Lightweight signal — parent side only learns teen chose to share,
      // NOT the content. Parent reads parent_bridge_pending.
      await AsyncStorage.setItem('parent_bridge_pending', 'true');
    } catch {
      // Storage failure — silent, state still updates for this session
    }

    setS2tellShared(true);
    setSharedMsg('Saved. Nothing sends unless you choose. 💜');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <AmbientWeatherOverlay />
      <LinearGradient
        colors={[t.background, t.card + 'cc', t.background]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.container, localStyles.scroll]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── 1. Header ─────────────────────────────────────────────────────── */}
        <Animated.View style={slide(fade1)}>
          <Text style={[styles.logo, localStyles.title]}>Se'krets2Tell 💌</Text>
          <Text style={[styles.subtitle, localStyles.subtitle]}>
            Say it here first. You choose what gets shared.
          </Text>
        </Animated.View>

        {/* ── 2. Intro card ─────────────────────────────────────────────────── */}
        <Animated.View style={slide(fade2)}>
          <View style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.accent + '55', borderWidth: 1 },
          ]}>
            <Text style={localStyles.introText}>
              Write it raw. Messy is okay. Se'kret will help you find the words.
            </Text>
          </View>
        </Animated.View>

        {/* ── 3. TextInput ──────────────────────────────────────────────────── */}
        <Animated.View style={slide(fade3)}>
          <TextInput
            style={[styles.journalInput, { borderColor: t.accent + '88' }]}
            placeholder="What do you need to say..."
            placeholderTextColor={t.soft + '88'}
            value={s2tellRaw}
            onChangeText={setS2tellRaw}
            multiline
            textAlignVertical="top"
          />
        </Animated.View>

        {/* ── 4. Tone selector ──────────────────────────────────────────────── */}
        <Animated.View style={slide(fade3)}>
          <Text style={localStyles.sectionLabel}>How do you want it to land?</Text>
          <View style={localStyles.toneRow}>
            {TONES.map(tone => {
              const active = s2tellTone === tone.id;
              return (
                <TouchableOpacity
                  key={tone.id}
                  style={[
                    localStyles.toneBubble,
                    {
                      backgroundColor: active ? t.accent : t.card,
                      borderColor:     active ? t.accent : t.card,
                    },
                  ]}
                  onPress={() => setS2tellTone(tone.id)}
                  accessibilityRole="button"
                  accessibilityLabel={tone.label}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={localStyles.toneEmoji}>{tone.emoji}</Text>
                  <Text style={[
                    localStyles.toneLabel,
                    { color: active ? '#fff' : t.soft + 'cc' },
                  ]}>
                    {tone.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── 5. Generate button ────────────────────────────────────────────── */}
        <Animated.View style={slide(fade3)}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: s2tellRaw.trim() ? t.accent : t.card,
                opacity:         s2tellRaw.trim() ? 1 : 0.5,
                marginTop:       8,
              },
            ]}
            onPress={handleGenerate}
            disabled={!s2tellRaw.trim() || loading}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>
              {loading ? 'Se\'kret is thinking… 💜' : 'Help me say it 💜'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── 6. Rewrite result card ────────────────────────────────────────── */}
        {!!s2tellRewrite && (
          <Animated.View style={[
            {
              opacity: cardAnim,
              transform: [{
                translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
              }],
            },
          ]}>
            <View style={[
              styles.card,
              localStyles.resultCard,
              { backgroundColor: t.card, borderColor: t.accent + '88' },
            ]}>
              <Text style={localStyles.resultLabel}>
                Se'kret heard you. Here's a softer way to say it 💜
              </Text>
              <Text style={localStyles.rewriteText}>{s2tellRewrite}</Text>
            </View>

            {/* ── 7. Save button ─────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: s2tellSaved ? t.card : t.accent },
              ]}
              onPress={handleSave}
              disabled={s2tellSaved}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>
                {s2tellSaved ? 'Saved 💜' : 'Save for me 💜'}
              </Text>
            </TouchableOpacity>
            {!!savedMsg && (
              <Text style={localStyles.feedbackMsg}>{savedMsg}</Text>
            )}

            {/* ── 8. Share button ────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: 'transparent',
                  borderWidth:     1,
                  borderColor:     s2tellShared ? t.soft + '55' : t.accent + 'aa',
                  marginTop:       4,
                },
              ]}
              onPress={handleShare}
              disabled={s2tellShared}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: s2tellShared ? t.soft + '88' : t.soft }]}>
                {s2tellShared ? 'Marked to share 💌' : 'Share when I\'m ready 💌'}
              </Text>
            </TouchableOpacity>
            {!!sharedMsg && (
              <Text style={localStyles.feedbackMsg}>{sharedMsg}</Text>
            )}
          </Animated.View>
        )}

        {/* ── 9. Privacy note ───────────────────────────────────────────────── */}
        <View style={localStyles.privacyNote}>
          <Text style={[localStyles.privacyText, { color: t.soft + '77' }]}>
            Nothing sends unless you choose. Your words stay yours. 🔒
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {BottomNav}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
  },
  title: {
    fontSize:     26,
    fontWeight:   'bold',
    color:        '#fff',
    textAlign:    'center',
    marginBottom: 6,
    marginTop:    Platform.OS === 'ios' ? 10 : 0,
  },
  subtitle: {
    fontSize:     14,
    color:        '#CBD5E1',
    textAlign:    'center',
    marginBottom: 18,
  },
  introText: {
    color:      '#CBD5E1',
    fontSize:   14,
    lineHeight: 22,
    textAlign:  'center',
  },
  sectionLabel: {
    color:        '#CBD5E1',
    fontSize:     14,
    fontWeight:   '600',
    marginBottom: 10,
    marginTop:    4,
  },
  toneRow: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            8,
    marginBottom:   16,
  },
  toneBubble: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical:   8,
    paddingHorizontal: 14,
    borderRadius:   20,
    borderWidth:    1,
    gap:            6,
  },
  toneEmoji: {
    fontSize: 16,
  },
  toneLabel: {
    fontSize:   13,
    fontWeight: '500',
  },
  resultCard: {
    borderWidth:  1,
    marginTop:    4,
    marginBottom: 14,
  },
  resultLabel: {
    color:        '#CBD5E1',
    fontSize:     13,
    marginBottom: 10,
    fontStyle:    'italic',
  },
  rewriteText: {
    color:      '#fff',
    fontSize:   15,
    lineHeight: 24,
    fontWeight: '500',
  },
  feedbackMsg: {
    color:        '#CBD5E1',
    fontSize:     13,
    textAlign:    'center',
    marginBottom: 8,
    fontStyle:    'italic',
  },
  privacyNote: {
    marginTop:    24,
    alignItems:   'center',
    paddingHorizontal: 16,
  },
  privacyText: {
    fontSize:   13,
    textAlign:  'center',
    lineHeight: 20,
  },
});
