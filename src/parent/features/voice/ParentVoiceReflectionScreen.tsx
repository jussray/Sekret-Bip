// src/parent/features/voice/ParentVoiceReflectionScreen.tsx
//
// Parent Voice Reflection — a private space for parents to process out loud (via text).
// Not the same as teen VoiceBip (emotional release). This is adult reflection:
// What happened? What did I feel? What do I wish I had done differently?
//
// Voice-note-style: one prompt at a time, quick capture, private history.
// Prompts rotate through different lenses: observation, self, teen, next time, patterns.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOP = Platform.OS === 'ios' ? 56 : 36;
const STORAGE_KEY = 'parent_voice_reflections';

// ── Prompt sets by lens ───────────────────────────────────────────────────────
const PROMPT_SETS = {
  observe: [
    "What did I actually notice today — not interpret, just notice?",
    "What did my teen do or say that surprised me?",
    "What moment today felt like connection?",
    "What moment felt like distance?",
    "What do I actually know about what my teen's day was like today?",
    "When did I make an assumption instead of asking?",
    "What did their body language tell me that their words didn't?",
    "What was I doing when they needed my attention most?",
  ],
  self: [
    "What was I feeling when things got hard?",
    "What triggered me, and why might that be?",
    "Where did I show up the way I wanted to?",
    "Where did I show up in ways I regret?",
    "What am I carrying today that isn't actually about them?",
    "What fear is underneath my frustration right now?",
    "When today did I react instead of respond?",
    "What do I need that I haven't asked for?",
  ],
  teen: [
    "What might my teen have been feeling today?",
    "What do they need from me that I might not be giving?",
    "What are they good at that I rarely say out loud?",
    "What is hard for them right now that I can acknowledge?",
    "What did they say today that I dismissed too quickly?",
    "What are they proud of right now that I haven't noticed?",
    "What are they afraid of that they haven't told me?",
    "If I were their age right now, what would I need from my parent?",
  ],
  next: [
    "If I could rewind one moment today, what would I do differently?",
    "What is one thing I want to do tomorrow to stay connected?",
    "What is one thing I want to stop doing?",
    "What do I want them to know — even if I never say it out loud?",
    "What pattern do I want to break this week?",
    "What strength do I want to lean on more?",
    "What conversation have I been avoiding?",
    "What would 'good enough' look like tomorrow instead of perfect?",
  ],
  pattern: [
    "What is one dynamic between us that keeps repeating?",
    "When does our relationship feel the most stuck? What's usually happening?",
    "What do I always say that they always seem to shut down to?",
    "What pattern in me might be making connection harder?",
    "What cycles do we keep running? What would break them?",
    "When we're at our best, what's different?",
    "What am I modeling for them without realizing it?",
    "What do I keep promising to change that I haven't?",
  ],
};

type Lens = keyof typeof PROMPT_SETS;

const LENS_LABELS: Record<Lens, { icon: string; label: string }> = {
  observe: { icon: '👁️', label: 'Observe'   },
  self:    { icon: '🪞', label: 'Self'       },
  teen:    { icon: '💜', label: 'My Teen'    },
  next:    { icon: '🔄', label: 'Next Time'  },
  pattern: { icon: '🔁', label: 'Patterns'   },
};

interface ReflectionEntry {
  id:     number;
  prompt: string;
  text:   string;
  date:   string;
  lens:   Lens;
}

interface ParentVoiceReflectionScreenProps {
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

export function ParentVoiceReflectionScreen({ setScreen, BottomNav }: ParentVoiceReflectionScreenProps) {
  const [lens, setLens]               = useState<Lens>('observe');
  const [promptIdx, setPromptIdx]     = useState(0);
  const [draft, setDraft]             = useState('');
  const [entries, setEntries]         = useState<ReflectionEntry[]>([]);
  const [saved, setSaved]             = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fadeIn    = useRef(new Animated.Value(0)).current;
  const savedAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setEntries(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const currentPrompt = PROMPT_SETS[lens][promptIdx % PROMPT_SETS[lens].length];

  function nextPrompt() {
    setPromptIdx(i => (i + 1) % PROMPT_SETS[lens].length);
    setDraft('');
    setSaved(false);
  }

  function switchLens(l: Lens) {
    setLens(l);
    setPromptIdx(0);
    setDraft('');
    setSaved(false);
  }

  async function saveEntry() {
    if (!draft.trim()) return;
    const entry: ReflectionEntry = {
      id:     Date.now(),
      prompt: currentPrompt,
      text:   draft.trim(),
      date:   new Date().toLocaleDateString(),
      lens,
    };
    const updated = [entry, ...entries].slice(0, 50);
    setEntries(updated);
    setDraft('');
    setSaved(true);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    savedAnim.setValue(1);
    Animated.timing(savedAnim, { toValue: 0, duration: 2000, delay: 800, useNativeDriver: true }).start();
    setTimeout(() => setSaved(false), 3000);
  }

  const recentEntries = entries.slice(0, showHistory ? 20 : 3);

  return (
    <View style={s.root}>
      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeIn }}
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => setScreen('home')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.back}>{'<'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Voice Reflection</Text>
            <Text style={s.sub}>private. yours. no one reads this.</Text>
          </View>
          <View style={s.lockBadge}>
            <Text style={s.lockText}>🔒</Text>
          </View>
        </View>

        {/* ── Lens tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.lensScroll} contentContainerStyle={s.lensTabs}>
          {(Object.keys(LENS_LABELS) as Lens[]).map(l => (
            <TouchableOpacity
              key={l}
              style={[s.lensTab, lens === l && s.lensTabActive]}
              onPress={() => switchLens(l)}
            >
              <Text style={s.lensIcon}>{LENS_LABELS[l].icon}</Text>
              <Text style={[s.lensLabel, lens === l && s.lensLabelActive]}>{LENS_LABELS[l].label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Current prompt ── */}
        <View style={s.promptCard}>
          <Text style={s.promptText}>{currentPrompt}</Text>
          <TouchableOpacity onPress={nextPrompt} style={s.skipBtn}>
            <Text style={s.skipText}>Different question ({(promptIdx % PROMPT_SETS[lens].length) + 1}/{PROMPT_SETS[lens].length})</Text>
          </TouchableOpacity>
        </View>

        {/* ── Text input ── */}
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Speak your mind here. This is just for you."
          placeholderTextColor="#475569"
          multiline
          textAlignVertical="top"
        />

        {/* ── Save row ── */}
        <View style={s.saveRow}>
          {saved && (
            <Animated.Text style={[s.savedLabel, { opacity: savedAnim }]}>saved</Animated.Text>
          )}
          <TouchableOpacity style={s.saveBtn} onPress={saveEntry}>
            <Text style={s.saveBtnText}>Save reflection</Text>
          </TouchableOpacity>
        </View>

        {/* ── History ── */}
        {entries.length > 0 && (
          <>
            <TouchableOpacity
              style={s.historyToggle}
              onPress={() => setShowHistory(h => !h)}
            >
              <Text style={s.historyToggleText}>
                {showHistory ? 'Hide' : 'Show'} previous reflections ({entries.length})
              </Text>
            </TouchableOpacity>

            {recentEntries.map(e => (
              <View key={e.id} style={s.historyCard}>
                <View style={s.historyMeta}>
                  <Text style={s.historyLens}>{LENS_LABELS[e.lens]?.icon} {LENS_LABELS[e.lens]?.label}</Text>
                  <Text style={s.historyDate}>{e.date}</Text>
                </View>
                <Text style={s.historyPrompt}>{e.prompt}</Text>
                <Text style={s.historyText}>{e.text}</Text>
              </View>
            ))}
          </>
        )}

      </Animated.ScrollView>
      {BottomNav}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#06030f' },
  scroll: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: TOP, paddingHorizontal: 20, paddingBottom: 16,
  },
  back:      { color: '#c4b5fd', fontSize: 22, fontWeight: '300' },
  title:     { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub:       { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  lockBadge: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 6 },
  lockText:  { fontSize: 16 },

  lensScroll: { marginBottom: 16 },
  lensTabs:   { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
  lensTab:    {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#374151', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  lensTabActive:   { backgroundColor: 'rgba(192,132,252,0.18)', borderColor: '#c084fc' },
  lensIcon:        { fontSize: 16 },
  lensLabel:       { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  lensLabelActive: { color: '#e9d5ff' },

  promptCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 16, padding: 18,
  },
  promptText: { color: '#fff', fontSize: 17, fontWeight: '600', lineHeight: 28, marginBottom: 10 },
  skipBtn:    { alignSelf: 'flex-end' },
  skipText:   { color: '#64748B', fontSize: 12 },

  input: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 16, padding: 16,
    color: '#fff', fontSize: 15, lineHeight: 24, minHeight: 140,
  },

  saveRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginHorizontal: 20, marginBottom: 24 },
  savedLabel: { color: '#a3e635', fontSize: 12, fontWeight: '600' },
  saveBtn:    {
    backgroundColor: 'rgba(192,132,252,0.18)',
    borderWidth: 1, borderColor: '#c084fc',
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10,
  },
  saveBtnText: { color: '#e9d5ff', fontSize: 14, fontWeight: '700' },

  historyToggle:     { marginHorizontal: 20, marginBottom: 12, alignItems: 'center' },
  historyToggleText: { color: '#64748B', fontSize: 12 },

  historyCard: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 14, padding: 14,
  },
  historyMeta:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyLens:   { color: '#c084fc', fontSize: 11, fontWeight: '700' },
  historyDate:   { color: '#475569', fontSize: 11 },
  historyPrompt: { color: '#475569', fontSize: 11, fontStyle: 'italic', marginBottom: 6, lineHeight: 16 },
  historyText:   { color: '#CBD5E1', fontSize: 13, lineHeight: 20 },
});
