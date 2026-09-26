// src/screens/CalmScreen.tsx
// Se'kret Calm — local mood check-in, tools, and a lightweight plan editor.
// This screen does not expose a sharing action or write directly to remote storage.

import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COMFORT_MESSAGES, IMAGES } from '@/constants/theme';
import type { Theme } from '@/types';

interface CalmScreenProps {
  t: Theme;
  mood: string | null;
  setMood: (mood: string) => void;
  setScreen: (screen: string) => void;
  BottomNav: React.ComponentType<any> | null;
  selectedSekret: string | null;
  onOpenBreathe: () => void;
}

interface CalmTool {
  id: string;
  emoji: string;
  label: string;
  sub: string;
  action: 'breathe' | 'screen';
  screen?: string;
}

interface PlanItem {
  id: string;
  label: string;
  time: string | null;
  done: boolean;
}

interface PlanPreset {
  id: string;
  emoji: string;
  label: string;
  sub: string;
  items: PlanItem[];
}

const CALM_MOODS = [
  { id: 'anxious', emoji: '😰', label: 'anxious' },
  { id: 'overwhelmed', emoji: '⛈️', label: 'overwhelmed' },
  { id: 'sad', emoji: '😔', label: 'sad' },
  { id: 'stressed', emoji: '😵‍💫', label: 'stressed' },
  { id: 'tired', emoji: '😴', label: 'tired' },
  { id: 'calm', emoji: '😊', label: 'calm' },
] as const;

const CALM_TOOLS: CalmTool[] = [
  { id: 'breathe', emoji: '💜', label: 'Breathe\nwith me', sub: '1–5 min', action: 'breathe' },
  { id: 'ground', emoji: '🌱', label: 'Ground\nYourself', sub: '3–7 min', action: 'screen', screen: 'comfort' },
  { id: 'release', emoji: '📝', label: 'Release\nIt Out', sub: 'write + let go', action: 'screen', screen: 'pages' },
  { id: 'sleep', emoji: '🌙', label: 'Sleep\nBetter', sub: 'settle your thoughts', action: 'screen', screen: 'cloud' },
  { id: 'sos', emoji: '⚡', label: 'Quick\nReset', sub: '30 sec', action: 'breathe' },
];

const CALM_PICKS = [
  { id: 'reset', emoji: '🫧', label: 'two-minute reset', dur: '2 min' },
  { id: 'wind-down', emoji: '🌙', label: '4-7-8 wind-down', dur: '4 min' },
  { id: 'ground', emoji: '🌱', label: 'slow grounding breath', dur: '3 min' },
  { id: 'exhale', emoji: '☁️', label: 'long-exhale pause', dur: '1 min' },
  { id: 'belly', emoji: '🌊', label: 'deep belly breath', dur: '5 min' },
];

const PLAN_PRESETS: PlanPreset[] = [
  {
    id: 'gentle',
    emoji: '💜',
    label: 'Gentle reset',
    sub: 'small and steady',
    items: [
      { id: 'gentle-1', label: 'Breathe for 2 minutes', time: 'now', done: false },
      { id: 'gentle-2', label: 'Name what feels heavy', time: null, done: false },
      { id: 'gentle-3', label: 'Choose one comfort tool', time: null, done: false },
      { id: 'gentle-4', label: 'Say one kind thing to yourself', time: null, done: false },
    ],
  },
  {
    id: 'heavy-day',
    emoji: '☁️',
    label: 'Heavy day',
    sub: 'less pressure, more care',
    items: [
      { id: 'heavy-1', label: 'Put both feet on the floor', time: 'now', done: false },
      { id: 'heavy-2', label: 'Take five slow breaths', time: null, done: false },
      { id: 'heavy-3', label: 'Write one honest sentence', time: null, done: false },
      { id: 'heavy-4', label: 'Pick the easiest next step', time: null, done: false },
    ],
  },
  {
    id: 'night',
    emoji: '🌙',
    label: 'Night landing',
    sub: 'soften the ending',
    items: [
      { id: 'night-1', label: 'Dim the room and unclench', time: 'tonight', done: false },
      { id: 'night-2', label: 'Try a long-exhale breath', time: null, done: false },
      { id: 'night-3', label: 'Release one thought to Pages', time: null, done: false },
      { id: 'night-4', label: 'Let enough be enough', time: null, done: false },
    ],
  },
];

const SEKRET_SAYS = [
  "Rest counts, too.\nYou do not have to earn a softer moment.",
  "You made it through today.\nThat matters more than you know.",
  "You are allowed to take up space\nwhile you figure things out.",
  "Heavy days do not define you.\nYou are still here.",
  "Slow down.\nTonight does not need every answer.",
];

function clonePlan(items: PlanItem[]): PlanItem[] {
  return items.map(item => ({ ...item }));
}

function getSekretAvatar(selectedSekret: string | null): number {
  switch (selectedSekret) {
    case 'rylane':
      return IMAGES.rylaneNeutral;
    case 'cloud':
      return IMAGES.cloud;
    case 'night':
      return IMAGES.nightRelaxed ?? IMAGES.nightNeutral;
    default:
      return IMAGES.rayleneNeutral;
  }
}

function getSekretName(selectedSekret: string | null): string {
  switch (selectedSekret) {
    case 'rylane':
      return 'Sy';
    case 'cloud':
      return 'Cloud';
    case 'night':
      return 'Night';
    default:
      return 'Suhana';
  }
}

function getTodayMessage(mood: string | null): string {
  switch (mood) {
    case 'anxious':
    case 'overwhelmed':
      return "take a breath. you do not have to carry it all at once.";
    case 'sad':
      return "it is okay to feel this. you can move gently.";
    case 'stressed':
      return "let's slow things down together.";
    case 'tired':
      return "rest is allowed. you have done enough for this moment.";
    case 'calm':
      return "you are doing good. let's protect that calm. 💜";
    default:
      return 'check in without judging the answer.';
  }
}

export function CalmScreen({
  mood,
  setMood,
  setScreen,
  BottomNav,
  selectedSekret,
  onOpenBreathe,
}: CalmScreenProps) {
  const defaultPreset = PLAN_PRESETS[0];
  const [planItems, setPlanItems] = useState<PlanItem[]>(() => clonePlan(defaultPreset.items));
  const [activePreset, setActivePreset] = useState(defaultPreset.id);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);

  const todayMsg = getTodayMessage(mood);
  const avatar = getSekretAvatar(selectedSekret);
  const sekretName = getSekretName(selectedSekret);
  const sekretSays = useMemo(
    () => SEKRET_SAYS[Math.floor(Math.random() * SEKRET_SAYS.length)],
    [],
  );
  const comfortMsg = useMemo(
    () => COMFORT_MESSAGES[Math.floor(Math.random() * COMFORT_MESSAGES.length)],
    [],
  );
  const selectedMood = CALM_MOODS.find(item => item.id === mood);
  const completedCount = planItems.filter(item => item.done).length;

  function togglePlan(id: string) {
    setPlanItems(items => items.map(item => (
      item.id === id ? { ...item, done: !item.done } : item
    )));
  }

  function choosePreset(preset: PlanPreset) {
    setActivePreset(preset.id);
    setPlanItems(clonePlan(preset.items));
  }

  function handleTool(tool: CalmTool) {
    if (tool.action === 'breathe') {
      onOpenBreathe();
      return;
    }
    if (tool.screen) setScreen(tool.screen);
  }

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#0d0518', '#120825', '#0d0518']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          <View style={s.heroBanner}>
            <LinearGradient
              colors={['#1a0535', '#2a0a50', '#1a0535']}
              style={StyleSheet.absoluteFill}
            />
            <Image source={avatar} style={s.heroAvatar} resizeMode="contain" />
            <View style={s.heroText}>
              <Text style={s.heroKicker}>SE&apos;KRET CALM  💜</Text>
              <Text style={s.heroTitle}>your calm.</Text>
              <Text style={s.heroTitle}>your reset.</Text>
              <Text style={s.heroTitle}>your space.</Text>
            </View>
            <View style={s.personalChip} accessibilityLabel="Personal calm space">
              <Text style={s.personalText}>✦ personal space</Text>
            </View>
          </View>

          <View style={s.greetRow}>
            <View style={s.greetCopy}>
              <Text style={s.greetName}>Take a deep breath. 💜</Text>
              <Text style={s.greetSub}>{todayMsg}</Text>
            </View>
            <TouchableOpacity
              style={s.checkInBtn}
              onPress={() => setScreen('history')}
              accessibilityRole="button"
              accessibilityLabel="Open check-in history"
            >
              <Text style={s.checkInBtnText}>check-in  ›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>How are you feeling right now?</Text>
            <View
              testID="calm-mood-status"
              style={[s.statusChip, selectedMood && s.statusChipActive]}
              accessibilityLabel={
                selectedMood ? `Selected mood: ${selectedMood.label}` : 'No mood selected'
              }
            >
              <Text style={[s.statusText, selectedMood && s.statusTextActive]}>
                {selectedMood ? `${selectedMood.emoji} ${selectedMood.label}` : 'tap one'}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.moodRail}
          >
            {CALM_MOODS.map(item => {
              const selected = mood === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  testID={`calm-mood-${item.id}`}
                  style={[s.moodChip, selected && s.moodChipActive]}
                  onPress={() => setMood(item.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`I feel ${item.label}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={s.moodEmoji}>{item.emoji}</Text>
                  <Text style={[s.moodLabel, selected && s.moodLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Calm Tools  ✦</Text>
            <TouchableOpacity
              onPress={() => setScreen('discover')}
              accessibilityRole="button"
              accessibilityLabel="See all calm tools"
            >
              <Text style={s.seeAll}>see all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.toolsRail}
          >
            {CALM_TOOLS.map(tool => (
              <TouchableOpacity
                key={tool.id}
                style={s.toolCard}
                onPress={() => handleTool(tool)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${tool.label.replace('\n', ' ')}. ${tool.sub}`}
              >
                <LinearGradient
                  colors={['rgba(168,85,247,0.18)', 'rgba(109,40,217,0.08)']}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={s.toolEmoji}>{tool.emoji}</Text>
                <Text style={s.toolLabel}>{tool.label}</Text>
                <Text style={s.toolSub}>{tool.sub}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.sectionRow}>
            <View>
              <Text style={s.sectionTitle}>Today&apos;s Calm Plan  💜</Text>
              <Text style={s.planProgress}>
                {completedCount} of {planItems.length} gentle steps complete
              </Text>
            </View>
            <TouchableOpacity
              testID="calm-edit-plan"
              onPress={() => setPlanEditorOpen(open => !open)}
              accessibilityRole="button"
              accessibilityLabel={planEditorOpen ? 'Close calm plan editor' : 'Edit calm plan'}
              accessibilityState={{ expanded: planEditorOpen }}
            >
              <Text style={s.seeAll}>{planEditorOpen ? 'done ✓' : 'edit plan ✎'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.sectionSub}>small steps. no pressure to finish everything.</Text>

          {planEditorOpen ? (
            <View
              testID="calm-plan-editor"
              style={s.planEditor}
              accessibilityLabel="Choose a calm plan"
            >
              <Text style={s.editorTitle}>pick the plan that fits this moment</Text>
              <Text style={s.editorSub}>your choice stays in this screen right now.</Text>
              <View style={s.presetGrid}>
                {PLAN_PRESETS.map(preset => {
                  const selected = activePreset === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      testID={`calm-plan-preset-${preset.id}`}
                      style={[s.presetCard, selected && s.presetCardActive]}
                      onPress={() => choosePreset(preset)}
                      accessibilityRole="button"
                      accessibilityLabel={`${preset.label}. ${preset.sub}`}
                      accessibilityState={{ selected }}
                    >
                      <Text style={s.presetEmoji}>{preset.emoji}</Text>
                      <Text style={[s.presetLabel, selected && s.presetLabelActive]}>
                        {preset.label}
                      </Text>
                      <Text style={s.presetSub}>{preset.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={s.closeEditorBtn}
                onPress={() => setPlanEditorOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Use this calm plan"
              >
                <Text style={s.closeEditorText}>use this plan 💜</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={s.planWrap}>
            <View style={s.planList}>
              {planItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  testID={`calm-plan-item-${item.id}`}
                  style={s.planRow}
                  onPress={() => togglePlan(item.id)}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: item.done }}
                >
                  <View style={[s.checkbox, item.done && s.checkboxDone]}>
                    {item.done ? <Text style={s.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={[s.planLabel, item.done && s.planLabelDone]}>
                    {item.label}
                  </Text>
                  <Text style={s.planTime}>{item.time ?? '—'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.planNote}>
              <Text style={s.planNoteText}>
                enough{'\n'}can be{'\n'}small today.
              </Text>
              <Text style={s.planNoteHeart}>💜</Text>
            </View>
          </View>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Breathing Picks for You  ✦</Text>
            <TouchableOpacity
              onPress={onOpenBreathe}
              accessibilityRole="button"
              accessibilityLabel="Open all breathing patterns"
            >
              <Text style={s.seeAll}>see all</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.sectionSub}>each pick opens the breathing space</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.picksRail}
          >
            {CALM_PICKS.map(pick => (
              <TouchableOpacity
                key={pick.id}
                style={s.pickCard}
                onPress={onOpenBreathe}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${pick.label}, ${pick.dur}`}
              >
                <LinearGradient
                  colors={['#1a0535', '#2d0a50']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.pickPlay}>
                  <Text style={s.pickPlayIcon}>›</Text>
                </View>
                <Text style={s.pickEmoji}>{pick.emoji}</Text>
                <Text style={s.pickLabel}>{pick.label}</Text>
                <Text style={s.pickDur}>{pick.dur}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.sekretCard}>
            <LinearGradient
              colors={['rgba(168,85,247,0.14)', 'rgba(109,40,217,0.06)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.sekretHeader}>
              <Image source={avatar} style={s.sekretAvatar} resizeMode="contain" />
              <Text style={s.sekretName}>{sekretName} says  💜</Text>
            </View>
            <Text style={s.sekretMsg}>{sekretSays}</Text>
            <View style={s.sekretHeart} accessibilityElementsHidden>
              <Text style={s.sekretHeartText}>💜</Text>
            </View>
          </View>

          <View style={s.comfortStrip}>
            <Text style={s.comfortEmoji}>{comfortMsg.emoji}</Text>
            <Text style={s.comfortText}>{comfortMsg.text}</Text>
          </View>

          <View style={{ height: BottomNav ? 80 : 40 }} />
        </ScrollView>
      </SafeAreaView>

      {BottomNav ? <BottomNav active="calm" setScreen={setScreen} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0518' },
  safe: { flex: 1 },
  scroll: { paddingBottom: 24 },
  heroBanner: {
    height: 220,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
  },
  heroAvatar: { width: 140, height: 200, marginRight: 12, marginBottom: -16 },
  heroText: { flex: 1, justifyContent: 'center' },
  heroKicker: { color: '#c084fc', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 26 },
  personalChip: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  personalText: { color: '#c4b5fd', fontSize: 11, fontWeight: '700' },
  greetRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, gap: 12 },
  greetCopy: { flex: 1 },
  greetName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  greetSub: { color: '#9270ad', fontSize: 13, marginTop: 4, lineHeight: 18 },
  checkInBtn: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  checkInBtnText: { color: '#c4b5fd', fontSize: 13, fontWeight: '700' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 8,
    gap: 12,
  },
  sectionTitle: { color: '#a855f7', fontSize: 16, fontWeight: '800' },
  sectionSub: { color: '#806096', fontSize: 12, marginHorizontal: 16, marginBottom: 10 },
  seeAll: { color: '#b895cf', fontSize: 12, fontWeight: '800', paddingVertical: 10 },
  statusChip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.18)',
  },
  statusChipActive: { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: '#a855f7' },
  statusText: { color: '#806096', fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: '#ead7ff' },
  moodRail: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  moodChip: {
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    width: 74,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.18)',
    gap: 6,
  },
  moodChipActive: { backgroundColor: 'rgba(168,85,247,0.22)', borderColor: '#a855f7' },
  moodEmoji: { fontSize: 28 },
  moodLabel: { color: '#806096', fontSize: 11, fontWeight: '700' },
  moodLabelActive: { color: '#e9d5ff' },
  toolsRail: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  toolCard: {
    minHeight: 118,
    width: 100,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
    gap: 6,
  },
  toolEmoji: { fontSize: 26 },
  toolLabel: { color: '#e9d5ff', fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 15 },
  toolSub: { color: '#9270ad', fontSize: 10, textAlign: 'center' },
  planProgress: { color: '#806096', fontSize: 11, marginTop: 3 },
  planEditor: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.22)',
  },
  editorTitle: { color: '#ead7ff', fontSize: 14, fontWeight: '800' },
  editorSub: { color: '#9270ad', fontSize: 11, marginTop: 3, marginBottom: 12 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetCard: {
    width: '31%',
    minWidth: 92,
    flexGrow: 1,
    minHeight: 106,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(13,5,24,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.18)',
  },
  presetCardActive: { backgroundColor: 'rgba(168,85,247,0.22)', borderColor: '#a855f7' },
  presetEmoji: { fontSize: 20, marginBottom: 6 },
  presetLabel: { color: '#c4b5fd', fontSize: 12, fontWeight: '800' },
  presetLabelActive: { color: '#fff' },
  presetSub: { color: '#9270ad', fontSize: 10, lineHeight: 14, marginTop: 3 },
  closeEditorBtn: {
    minHeight: 44,
    marginTop: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
  },
  closeEditorText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  planWrap: { marginHorizontal: 16, marginBottom: 4, flexDirection: 'row', gap: 12 },
  planList: { flex: 1, gap: 8 },
  planRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(168,85,247,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '900' },
  planLabel: { flex: 1, color: '#d3b8e5', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  planLabelDone: { color: '#806096', textDecorationLine: 'line-through' },
  planTime: { color: '#806096', fontSize: 11 },
  planNote: {
    width: 104,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.18)',
    justifyContent: 'space-between',
  },
  planNoteText: { color: '#c4b5fd', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  planNoteHeart: { fontSize: 16, alignSelf: 'flex-end', marginTop: 8 },
  picksRail: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  pickCard: {
    width: 116,
    minHeight: 132,
    borderRadius: 18,
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  pickPlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(168,85,247,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickPlayIcon: { color: '#fff', fontSize: 18, lineHeight: 20 },
  pickEmoji: { fontSize: 22, marginBottom: 4 },
  pickLabel: { color: '#e9d5ff', fontSize: 11, fontWeight: '700', lineHeight: 15 },
  pickDur: { color: '#a581bd', fontSize: 10, marginTop: 2 },
  sekretCard: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  sekretHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sekretAvatar: { width: 36, height: 36, borderRadius: 18 },
  sekretName: { color: '#a855f7', fontSize: 15, fontWeight: '900' },
  sekretMsg: { color: '#e9d5ff', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  sekretHeart: { alignSelf: 'flex-end', marginTop: 12 },
  sekretHeartText: { fontSize: 20 },
  comfortStrip: {
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(168,85,247,0.06)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.15)',
  },
  comfortEmoji: { fontSize: 22 },
  comfortText: { flex: 1, color: '#9270ad', fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
});
