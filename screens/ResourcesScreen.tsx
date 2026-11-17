// screens/ResourcesScreen.tsx
// Side-aware curated resources.
// Teen: calm, body/period, mental health, confidence — in-app only, no external links.
// Parent: talking to teens, puberty support, mental health guidance, parenting tools.

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, Easing, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';

interface Resource {
  id:       string;
  emoji:    string;
  title:    string;
  body:     string;
  tag:      string;
  action?:  string;
  route?:   string;
}

const TEEN_RESOURCES: Resource[] = [
  {
    id: 't1', emoji: '🌙', tag: 'Calm',
    title: 'When it feels like too much',
    body: 'Breathing slowly for 4 seconds in, 4 out, 4 hold can interrupt anxiety in under 2 minutes. Your nervous system responds to it every time.',
    action: 'try it in Calm', route: 'calm',
  },
  {
    id: 't2', emoji: '🩸', tag: 'Body',
    title: 'What nobody tells you about periods',
    body: 'Your cycle affects your energy, mood, and focus differently each week. Tracking it means you can plan around it instead of being surprised by it.',
    action: 'track my cycle', route: 'periodCalendar',
  },
  {
    id: 't3', emoji: '🧠', tag: 'Mental Health',
    title: 'The "I\'m fine" lie',
    body: 'Saying you\'re fine when you\'re not builds walls over time. You don\'t need to explain everything. But naming it once — even just to yourself — helps.',
    action: 'write it out', route: 'pages',
  },
  {
    id: 't4', emoji: '🕊️', tag: 'Confidence',
    title: 'Confidence is a skill, not a feeling',
    body: 'You won\'t always feel confident. But acting like you\'re working on it anyway — that\'s the thing that actually builds it. Small moves count.',
    route: undefined,
  },
  {
    id: 't5', emoji: '🫶', tag: 'Body',
    title: 'Your body is not behind',
    body: 'Puberty timelines vary by years between people the same age. Early, late, or right in the middle — none of these mean something is wrong with you.',
    route: undefined,
  },
  {
    id: 't6', emoji: '🤍', tag: 'Mental Health',
    title: 'When it\'s more than a bad day',
    body: 'If you feel low for more than two weeks, lose interest in things you liked, or want to disappear — that\'s worth telling someone. Start with Se\'kret.',
    action: 'talk to Se\'kret', route: 'sekret',
  },
  {
    id: 't7', emoji: '💤', tag: 'Body',
    title: 'Sleep and your brain are in a relationship',
    body: 'Under 8 hours of sleep doesn\'t just make you tired — it raises cortisol, makes emotions louder, and slows your ability to think clearly. Sleep is health.',
    route: undefined,
  },
  {
    id: 't8', emoji: '🌱', tag: 'Calm',
    title: 'Movement is medicine',
    body: 'Even a 10-minute walk shifts your mood chemistry. It\'s not about fitness — it\'s about giving your nervous system somewhere to go with all that energy.',
    action: 'go to Calm', route: 'calm',
  },
];

const PARENT_RESOURCES: Resource[] = [
  {
    id: 'p1', emoji: '🗣️', tag: 'Communication',
    title: 'How to start a conversation that actually lands',
    body: 'Lead with observation, not judgement. "I\'ve noticed you seem tired lately" opens more doors than "You\'ve been moody." Tone carries more than words.',
    route: undefined,
  },
  {
    id: 'p2', emoji: '🩸', tag: 'Puberty',
    title: 'Talking about periods with your teen',
    body: 'Normalise it early and casually. Leave products visible. Ask practical questions ("do you need anything?") before emotional ones. Lower the stakes every time.',
    route: undefined,
  },
  {
    id: 'p3', emoji: '🧠', tag: 'Mental Health',
    title: 'Signs your teen is struggling (and what to do)',
    body: 'Withdrawal from friends, losing interest in hobbies, significant sleep or appetite changes. These lasting more than 2 weeks are worth a gentle check-in — not interrogation.',
    route: undefined,
  },
  {
    id: 'p4', emoji: '📵', tag: 'Tech',
    title: 'The phone debate: what actually works',
    body: 'Complete bans often backfire. Shared family agreements — no phones at the table, chargers outside bedrooms — work better because they include you too.',
    route: undefined,
  },
  {
    id: 'p5', emoji: '🌿', tag: 'Your Wellbeing',
    title: 'You can\'t pour from an empty cup',
    body: 'Your mental health directly affects your teen\'s. Parents who model rest, boundaries, and asking for help give their teens permission to do the same.',
    route: undefined,
  },
  {
    id: 'p6', emoji: '🕊️', tag: 'Confidence',
    title: 'How to raise a confident teen without the pressure',
    body: 'Confidence comes from mastery and autonomy — not praise. Let them fail at small things. Let them solve problems before you step in. Be interested, not invested.',
    route: undefined,
  },
  {
    id: 'p7', emoji: '🌉', tag: 'Connection',
    title: 'Repair is always possible',
    body: 'If you said the wrong thing, a genuine "I got that wrong, I\'m sorry" is more powerful than pretending it didn\'t happen. Teens remember that you came back.',
    action: 'try Repair', route: 'repair',
  },
  {
    id: 'p8', emoji: '💬', tag: 'Communication',
    title: 'The power of saying less',
    body: 'Teens often stop talking not because they don\'t want to share — but because sharing leads to a lecture. Listen fully. Ask one question. Then be quiet.',
    route: undefined,
  },
];

const ALL_TEEN_TAGS  = ['All', 'Calm', 'Body', 'Mental Health', 'Confidence'];
const ALL_PARENT_TAGS = ['All', 'Communication', 'Puberty', 'Mental Health', 'Connection', 'Your Wellbeing', 'Tech'];

interface ResourcesScreenProps {
  side: 'teen' | 'parent';
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
}

export function ResourcesScreen({ side, setScreen, BottomNav }: ResourcesScreenProps) {
  const [activeTag, setActiveTag] = useState('All');

  const fade1  = useRef(new Animated.Value(0)).current;
  const fade2  = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const s = (v: Animated.Value, d: number) =>
      Animated.timing(v, { toValue: 1, duration: 420, delay: d, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.parallel([s(fade1, 0), s(fade2, 200)]).start();

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fade1, fade2, breath]);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const slide = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  const accent   = side === 'parent' ? '#a78bfa' : '#c084fc';
  const soft     = side === 'parent' ? '#ede9fe' : '#f3e8ff';
  const resources = side === 'parent' ? PARENT_RESOURCES : TEEN_RESOURCES;
  const tags      = side === 'parent' ? ALL_PARENT_TAGS  : ALL_TEEN_TAGS;

  const filtered = activeTag === 'All' ? resources : resources.filter(r => r.tag === activeTag);

  const tagColor: Record<string, string> = {
    Calm: '#818cf8', Body: '#f0abfc', 'Mental Health': '#7dd3fc',
    Confidence: '#fcd34d', Communication: '#86efac', Puberty: '#f0abfc',
    Connection: '#a78bfa', 'Your Wellbeing': '#6ee7b7', Tech: '#94a3b8',
  };

  return (
    <View style={st.root}>
      <AmbientWeatherOverlay />
      <LinearGradient colors={['#100826', '#1a0d3a']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View style={slide(fade1)}>
          <Text style={[st.title, { color: accent }]}>
            {side === 'parent' ? 'Resources 📚' : 'Resources 📚'}
          </Text>
          <Text style={[st.sub, { color: soft }]}>
            {side === 'parent'
              ? 'practical, honest support for parenting through adolescence.'
              : 'real information for what you\'re actually going through.'}
          </Text>
        </Animated.View>

        {/* Tag filter */}
        <Animated.View style={slide(fade1)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
            {tags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[st.tagChip, {
                  backgroundColor: activeTag === tag ? accent : 'rgba(40,20,70,0.7)',
                  borderColor: activeTag === tag ? accent : accent + '44',
                }]}
                onPress={() => setActiveTag(tag)}
              >
                <Text style={[st.tagText, { color: activeTag === tag ? '#1e0f3a' : soft + 'cc' }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Resource cards */}
        <Animated.View style={slide(fade2)}>
          {filtered.map((r, i) => (
            <View key={r.id} style={[st.card, { borderColor: (tagColor[r.tag] ?? accent) + '44' }]}>
              <View style={st.cardHeader}>
                <Animated.Text style={[st.cardEmoji, i === 0 && { transform: [{ scale: breathScale }] }]}>
                  {r.emoji}
                </Animated.Text>
                <View style={[st.tagPill, { backgroundColor: (tagColor[r.tag] ?? accent) + '22' }]}>
                  <Text style={[st.tagPillText, { color: tagColor[r.tag] ?? accent }]}>{r.tag}</Text>
                </View>
              </View>
              <Text style={[st.cardTitle, { color: '#fff' }]}>{r.title}</Text>
              <Text style={[st.cardBody, { color: soft + 'dd' }]}>{r.body}</Text>
              {r.action && r.route && (
                <TouchableOpacity
                  style={[st.actionBtn, { borderColor: (tagColor[r.tag] ?? accent) + '88' }]}
                  onPress={() => setScreen(r.route!)}
                >
                  <Text style={[st.actionBtnText, { color: tagColor[r.tag] ?? accent }]}>{r.action} →</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </Animated.View>

        <TouchableOpacity style={[st.ghostBtn, { borderColor: accent + '44' }]} onPress={() => setScreen('home')}>
          <Text style={[st.ghostBtnText, { color: soft + 'aa' }]}>{'<- back'}</Text>
        </TouchableOpacity>

      </ScrollView>

      {BottomNav}
    </View>
  );
}

const st = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#100826' },
  scroll:        { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  title:         { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  sub:           { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  tagChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  tagText:       { fontSize: 12, fontWeight: '700' },
  card:          { backgroundColor: 'rgba(40,20,70,0.78)', borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 14 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardEmoji:     { fontSize: 28 },
  tagPill:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagPillText:   { fontSize: 11, fontWeight: '700' },
  cardTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 8, lineHeight: 22 },
  cardBody:      { fontSize: 13, lineHeight: 21, marginBottom: 10 },
  actionBtn:     { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 7 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  ghostBtn:      { borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', marginTop: 8 },
  ghostBtnText:  { fontSize: 14, fontWeight: '600' },
});
