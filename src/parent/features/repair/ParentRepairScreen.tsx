// src/parent/features/repair/ParentRepairScreen.tsx
//
// Connection & Repair — helps parents track and build on positive moments
// with their teen. Not a conflict tracker. A relationship investment ledger.
//
// Features: weekly connection goal, daily repair rituals, win log, streak.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOP = Platform.OS === 'ios' ? 56 : 36;

const STORAGE_KEY_GOAL   = 'parent_repair_weekgoal';
const STORAGE_KEY_WINS   = 'parent_repair_wins';
const STORAGE_KEY_STREAK = 'parent_repair_streak_date';

// ── Ritual suggestions — small daily acts ────────────────────────────────────
const RITUALS = [
  { icon: '👋', label: 'Greeted without asking about school' },
  { icon: '🍕', label: 'Shared a meal without devices' },
  { icon: '📱', label: 'Texted just to check in (no agenda)' },
  { icon: '🎵', label: 'Asked about their music / show / game' },
  { icon: '🛏️', label: 'Said goodnight' },
  { icon: '😂', label: 'Laughed together about something' },
  { icon: '✋', label: 'Gave a hug or shoulder squeeze' },
  { icon: '💬', label: 'Listened for 5 minutes without problem-solving' },
  { icon: '✉️', label: 'Sent a text with no ask, just love' },
  { icon: '🚗', label: 'Drove somewhere together, just talking' },
  { icon: '👏', label: 'Acknowledged something they did right' },
  { icon: '🙏', label: 'Apologized for something specific' },
  { icon: '🛋️', label: 'Watched something they liked without judging it' },
  { icon: '❓', label: 'Asked a question I actually didn\'t know the answer to' },
  { icon: '💤', label: 'Let them sleep in without comment' },
];

// ── Weekly goals ─────────────────────────────────────────────────────────────
const GOAL_SUGGESTIONS = [
  "Ask one curious question every day this week",
  "No advice unless asked — listen only",
  "One shared activity, no phones",
  "Initiate three positive moments before any corrections",
  "Find one thing to genuinely compliment",
  "Apologize for something from last week",
  "Say 'I love you' out loud every day",
  "Greet them first every time they walk in — no questions",
  "Let them lead at least one conversation this week",
  "Notice something they're proud of and say it out loud",
  "Text them something funny or warm with no follow-up",
  "Ask about their friends by name — show you remember",
  "Give one piece of unsolicited encouragement (not tied to performance)",
  "Let something slide that isn't a safety issue",
  "Check in on yourself — you can't connect if you're running on empty",
];

// ── Repair phrases ────────────────────────────────────────────────────────────
const REPAIR_PHRASES = [
  { label: 'Own it',        text: '"I was too harsh. I am sorry."' },
  { label: 'Reset',         text: '"Can we start this conversation over?"' },
  { label: 'Affirm',        text: '"I love you even when we disagree."' },
  { label: 'Reach out',     text: '"I have been thinking about you."' },
  { label: 'No conditions', text: '"Nothing you did changes how I feel about you."' },
  { label: 'Soften',        text: '"I think I came in too hard. That wasn\'t fair to you."' },
  { label: 'Be specific',   text: '"I should not have said that the way I did. I\'m sorry."' },
  { label: 'No lecture',    text: '"I promise this isn\'t a lecture. I just want us to be okay."' },
  { label: 'Stay open',     text: '"You don\'t have to forgive me right now. I\'ll still be here."' },
  { label: 'Just check in', text: '"Hey. Are we okay? Can we be okay?"' },
  { label: 'Reconnect',     text: '"I miss you. Not the version of us that\'s arguing. Just... us."' },
  { label: 'Give space',    text: '"I know you need space. I\'m giving it. I\'m not going anywhere."' },
];

interface WinEntry { id: number; text: string; date: string; ritual?: string }

interface ParentRepairScreenProps {
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

export function ParentRepairScreen({ setScreen, BottomNav }: ParentRepairScreenProps) {
  const [weekGoal, setWeekGoal]       = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft]     = useState('');
  const [wins, setWins]               = useState<WinEntry[]>([]);
  const [winDraft, setWinDraft]       = useState('');
  const [streak, setStreak]           = useState(0);
  const [goalSuggIdx, setGoalSuggIdx] = useState(0);
  const [phraseIdx, setPhraseIdx]     = useState(0);

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadData();
  }, []);

  async function loadData() {
    try {
      const [goal, winsJson, streakDate] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_GOAL),
        AsyncStorage.getItem(STORAGE_KEY_WINS),
        AsyncStorage.getItem(STORAGE_KEY_STREAK),
      ]);
      if (goal) setWeekGoal(goal);
      if (winsJson) setWins(JSON.parse(winsJson));
      if (streakDate) {
        const days = Math.floor((Date.now() - Number(streakDate)) / 86400000);
        setStreak(Math.max(0, 7 - days));
      }
    } catch {}
  }

  async function saveGoal() {
    if (!goalDraft.trim()) return;
    setWeekGoal(goalDraft.trim());
    setEditingGoal(false);
    await AsyncStorage.setItem(STORAGE_KEY_GOAL, goalDraft.trim()).catch(() => {});
    await AsyncStorage.setItem(STORAGE_KEY_STREAK, String(Date.now())).catch(() => {});
    setStreak(7);
  }

  async function logWin(ritual?: string) {
    const text = ritual ?? winDraft.trim();
    if (!text) return;
    const entry: WinEntry = {
      id: Date.now(),
      text,
      date: new Date().toLocaleDateString(),
      ritual,
    };
    const updated = [entry, ...wins].slice(0, 30);
    setWins(updated);
    setWinDraft('');
    await AsyncStorage.setItem(STORAGE_KEY_WINS, JSON.stringify(updated)).catch(() => {});
  }

  const recentWins = wins.slice(0, 5);

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
            <Text style={s.title}>Connection + Repair</Text>
            <Text style={s.sub}>small moments. lasting bond.</Text>
          </View>
          {streak > 0 && (
            <View style={s.streakPill}>
              <Text style={s.streakText}>🔥 {streak}d</Text>
            </View>
          )}
        </View>

        {/* ── Weekly goal ── */}
        <View style={s.sectionCard}>
          <Text style={s.sectionLabel}>This week I will…</Text>
          {editingGoal ? (
            <View>
              <TextInput
                style={s.goalInput}
                value={goalDraft}
                onChangeText={setGoalDraft}
                placeholder="Set your connection goal…"
                placeholderTextColor="#475569"
                multiline
                autoFocus
              />
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => setGoalSuggIdx(i => (i + 1) % GOAL_SUGGESTIONS.length)}
              >
                <Text style={s.ghostBtnText}>Suggest one for me</Text>
              </TouchableOpacity>
              <View style={s.suggRow}>
                <Text style={s.suggText}>{GOAL_SUGGESTIONS[goalSuggIdx]}</Text>
                <TouchableOpacity onPress={() => setGoalDraft(GOAL_SUGGESTIONS[goalSuggIdx])}>
                  <Text style={s.useBtn}>use this</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={s.saveBtn} onPress={saveGoal}>
                <Text style={s.saveBtnText}>Save goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setGoalDraft(weekGoal); setEditingGoal(true); }}>
              {weekGoal ? (
                <Text style={s.goalText}>{weekGoal}</Text>
              ) : (
                <View style={s.goalEmpty}>
                  <Text style={s.goalEmptyText}>Tap to set a goal for this week</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Daily rituals ── */}
        <Text style={s.heading}>Log a connection moment</Text>
        <Text style={s.headingSub}>tap the thing you did today</Text>
        <View style={s.ritualsGrid}>
          {RITUALS.map(r => (
            <TouchableOpacity
              key={r.label}
              style={s.ritualChip}
              onPress={() => logWin(r.label)}
              activeOpacity={0.75}
            >
              <Text style={s.ritualIcon}>{r.icon}</Text>
              <Text style={s.ritualLabel}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Custom win ── */}
        <View style={s.customRow}>
          <TextInput
            style={s.customInput}
            value={winDraft}
            onChangeText={setWinDraft}
            placeholder="or write your own…"
            placeholderTextColor="#475569"
          />
          <TouchableOpacity style={s.logBtn} onPress={() => logWin()}>
            <Text style={s.logBtnText}>Log</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent wins ── */}
        {recentWins.length > 0 && (
          <>
            <Text style={s.heading}>Recent moments</Text>
            {recentWins.map(w => (
              <View key={w.id} style={s.winRow}>
                <Text style={s.winDot}>•</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.winText}>{w.text}</Text>
                  <Text style={s.winDate}>{w.date}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Repair phrases ── */}
        <Text style={s.heading}>If you need to repair</Text>
        <View style={s.phraseCard}>
          <Text style={s.phraseLabel}>{REPAIR_PHRASES[phraseIdx].label}</Text>
          <Text style={s.phraseText}>{REPAIR_PHRASES[phraseIdx].text}</Text>
          <TouchableOpacity style={s.phraseNext} onPress={() => setPhraseIdx(i => (i + 1) % REPAIR_PHRASES.length)}>
            <Text style={s.phraseNextText}>Next phrase ({phraseIdx + 1}/{REPAIR_PHRASES.length})</Text>
          </TouchableOpacity>
        </View>

        {/* ── Calm shortcut ── */}
        <TouchableOpacity style={s.calmLink} onPress={() => setScreen('calm')} activeOpacity={0.8}>
          <Text style={s.calmLinkEmoji}>🌬️</Text>
          <Text style={s.calmLinkText}>Calm Before Replying</Text>
          <Text style={s.calmLinkArrow}>›</Text>
        </TouchableOpacity>

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
  back:   { color: '#c4b5fd', fontSize: 22, fontWeight: '300' },
  title:  { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub:    { color: '#94A3B8', fontSize: 12, marginTop: 2 },

  streakPill: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  streakText: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },

  sectionCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 16, padding: 16,
  },
  sectionLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },

  goalText:      { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 24 },
  goalEmpty:     { borderWidth: 1, borderColor: '#334155', borderRadius: 10, borderStyle: 'dashed', padding: 12, alignItems: 'center' },
  goalEmptyText: { color: '#475569', fontSize: 14 },

  goalInput: {
    color: '#fff', fontSize: 15, lineHeight: 22,
    borderWidth: 1, borderColor: '#334155', borderRadius: 10,
    padding: 12, marginBottom: 10, minHeight: 60,
  },
  suggRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  suggText: { color: '#94A3B8', fontSize: 13, flex: 1, fontStyle: 'italic' },
  useBtn:   { color: '#c084fc', fontSize: 12, fontWeight: '700' },
  saveBtn:  { backgroundColor: 'rgba(192,132,252,0.18)', borderWidth: 1, borderColor: '#c084fc', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  saveBtnText: { color: '#e9d5ff', fontSize: 14, fontWeight: '700' },

  heading:    { color: '#fff', fontSize: 16, fontWeight: '700', marginHorizontal: 20, marginTop: 20, marginBottom: 4 },
  headingSub: { color: '#64748B', fontSize: 12, marginHorizontal: 20, marginBottom: 12 },

  ritualsGrid: { paddingHorizontal: 20, gap: 8 },
  ritualChip:  {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  ritualIcon:  { fontSize: 20 },
  ritualLabel: { color: '#CBD5E1', fontSize: 13 },

  customRow:   { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 10 },
  customInput: {
    flex: 1, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: '#334155', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  logBtn:     { backgroundColor: 'rgba(192,132,252,0.18)', borderWidth: 1, borderColor: '#c084fc', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  logBtnText: { color: '#e9d5ff', fontSize: 13, fontWeight: '700' },

  winRow:  { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 8 },
  winDot:  { color: '#c084fc', fontSize: 16, lineHeight: 22 },
  winText: { color: '#CBD5E1', fontSize: 13, lineHeight: 20 },
  winDate: { color: '#475569', fontSize: 11, marginTop: 2 },

  phraseCard: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 16, padding: 18,
  },
  phraseLabel:    { color: '#c084fc', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  phraseText:     { color: '#fff', fontSize: 16, fontStyle: 'italic', lineHeight: 26, marginBottom: 14 },
  phraseNext:     { alignSelf: 'flex-end' },
  phraseNextText: { color: '#64748B', fontSize: 12 },

  calmLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  calmLinkEmoji: { fontSize: 22 },
  calmLinkText:  { color: '#e9d5ff', fontSize: 14, fontWeight: '600', flex: 1 },
  calmLinkArrow: { color: '#64748B', fontSize: 18 },

  primaryBtn:   { alignItems: 'center', paddingVertical: 6 },
  ghostBtnText: { color: '#64748B', fontSize: 12 },
});
