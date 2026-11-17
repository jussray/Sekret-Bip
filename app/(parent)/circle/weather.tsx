// app/(parent)/circle/weather.tsx
// Parent Circle — Emotional Weather
// Mood % voting, Front Porch presence, Circle Challenges, Pinned Post

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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';

const WEATHER_MOODS = [
  { key: 'heavy',    emoji: '🌧️', label: 'heavy',    color: '#7dd3fc', desc: 'Carrying a lot today'   },
  { key: 'steady',   emoji: '☁️',  label: 'steady',   color: '#c4b5fd', desc: 'Holding on okay'       },
  { key: 'grateful', emoji: '🌱', label: 'grateful', color: '#34d399', desc: 'Feeling the love today' },
  { key: 'hopeful',  emoji: '☀️', label: 'hopeful',  color: '#fbbf24', desc: 'Things are looking up'  },
] as const;

type WeatherMoodKey = (typeof WEATHER_MOODS)[number]['key'];

const CIRCLE_CHALLENGES = [
  { id: 1, title: 'one honest thing', desc: 'Share one honest thing about this week of parenting — no polish.', accent: '#d97706' },
  { id: 2, title: 'the repair moment', desc: 'Do one small repair with your teen this week. no agenda, just presence.', accent: '#059669' },
  { id: 3, title: 'rest counts', desc: 'Rest today without the guilt. you can\'t pour from empty. let the circle hold this.', accent: '#7dd3fc' },
];

const FRONT_PORCH_SEATS = [
  { emoji: '☕', label: 'here' },
  { emoji: '🌿', label: 'listening' },
  { emoji: '🕯️', label: 'with you' },
  { emoji: '📖', label: 'present' },
  { emoji: '🌉', label: 'bridging' },
  { emoji: '🏡', label: 'home base' },
  { emoji: '🌱', label: 'growing' },
  { emoji: '🤍', label: 'no judgment' },
];

const WARM = '#d97706';
const WARM_SOFT = '#fbbf24';

function calcWeatherPercents(votes: Record<WeatherMoodKey, number>): Record<WeatherMoodKey, number> {
  const total = Object.values(votes).reduce((s, v) => s + v, 0);
  if (total === 0) return { heavy: 0, steady: 0, grateful: 0, hopeful: 0 };
  const out = {} as Record<WeatherMoodKey, number>;
  for (const mood of WEATHER_MOODS) {
    out[mood.key] = Math.round((votes[mood.key] / total) * 100);
  }
  return out;
}

const PINNED_POST = {
  text: 'parenting is not a performance. it\'s a practice. the circle holds you either way.',
  tag: 'circle culture',
};

export default function ParentCircleWeatherRoute() {
  const { parentCirclePosts } = useAppContext();
  const [myVote, setMyVote] = useState<WeatherMoodKey | null>(null);
  const [votes, setVotes] = useState<Record<WeatherMoodKey, number>>({
    heavy: 18, steady: 24, grateful: 12, hopeful: 9,
  });

  const percents = useMemo(() => calcWeatherPercents(votes), [votes]);

  const dominantMood = useMemo(() => {
    let best: WeatherMoodKey = 'steady';
    let bestCount = -1;
    for (const mood of WEATHER_MOODS) {
      if (votes[mood.key] > bestCount) {
        bestCount = votes[mood.key];
        best = mood.key;
      }
    }
    return WEATHER_MOODS.find(m => m.key === best)!;
  }, [votes]);

  function castVote(key: WeatherMoodKey) {
    if (myVote === key) return;
    setVotes(prev => {
      const next = { ...prev, [key]: prev[key] + 1 };
      if (myVote) next[myVote] = Math.max(0, next[myVote] - 1);
      return next;
    });
    setMyVote(key);
  }

  const totalVotes = Object.values(votes).reduce((s, v) => s + v, 0);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1a0e06', '#0f1a0e', '#0c0c18']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.kicker}>PARENT CIRCLE</Text>
              <Text style={s.title}>Emotional Weather</Text>
              <Text style={s.subtitle}>what's the front porch feeling right now?</Text>
            </View>
          </View>

          {/* Dominant mood banner */}
          <View style={[s.dominantBanner, { backgroundColor: `${dominantMood.color}15`, borderColor: `${dominantMood.color}40` }]}>
            <Text style={s.dominantEmoji}>{dominantMood.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.dominantLabel, { color: dominantMood.color }]}>the circle is mostly {dominantMood.label}</Text>
              <Text style={s.dominantDesc}>{dominantMood.desc} · {totalVotes} parents</Text>
            </View>
          </View>

          {/* Mood voting */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>how are you feeling today?</Text>
            {WEATHER_MOODS.map(mood => {
              const pct = percents[mood.key];
              const voted = myVote === mood.key;
              return (
                <TouchableOpacity
                  key={mood.key}
                  style={[s.moodVoteRow, voted && { borderColor: `${mood.color}60` }]}
                  onPress={() => castVote(mood.key)}
                  activeOpacity={0.75}
                >
                  <Text style={s.moodVoteEmoji}>{mood.emoji}</Text>
                  <View style={s.moodVoteBarWrap}>
                    <View style={s.moodVoteBarTrack}>
                      <View
                        style={[
                          s.moodVoteBarFill,
                          { width: `${pct}%` as any, backgroundColor: mood.color },
                        ]}
                      />
                    </View>
                    <Text style={[s.moodVoteLabel, voted && { color: mood.color }]}>{mood.label}</Text>
                  </View>
                  <Text style={[s.moodVotePct, { color: mood.color }]}>{pct}%</Text>
                  {voted ? <Text style={s.moodVotedMark}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
            {!myVote ? (
              <Text style={s.votePrompt}>tap to cast your weather</Text>
            ) : (
              <Text style={[s.votePrompt, { color: WARM }]}>your voice is in the circle ☕</Text>
            )}
          </View>

          {/* Front porch presence */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>who's on the porch right now</Text>
            <Text style={s.sectionSub}>everyone here, anonymously</Text>
            <View style={s.porchGrid}>
              {FRONT_PORCH_SEATS.map((seat, i) => (
                <View key={i} style={s.porchChip}>
                  <Text style={s.porchEmoji}>{seat.emoji}</Text>
                  <Text style={s.porchLabel}>{seat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pinned post */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>pinned in the circle</Text>
            <View style={s.pinnedCard}>
              <Text style={s.pinnedPin}>📌</Text>
              <View style={s.tagBadge}>
                <Text style={s.tagBadgeText}>{PINNED_POST.tag}</Text>
              </View>
              <Text style={s.pinnedText}>"{PINNED_POST.text}"</Text>
              <Text style={s.pinnedMeta}>anonymous parent · pinned by the circle</Text>
            </View>
          </View>

          {/* Circle Challenges */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>circle challenges</Text>
            <Text style={s.sectionSub}>gentle nudges for the week</Text>
            {CIRCLE_CHALLENGES.map(ch => (
              <View key={ch.id} style={[s.challengeCard, { borderColor: `${ch.accent}30` }]}>
                <View style={[s.challengeAccentBar, { backgroundColor: ch.accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.challengeTitle, { color: ch.accent }]}>{ch.title}</Text>
                  <Text style={s.challengeDesc}>{ch.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Activity summary */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>circle energy this session</Text>
            <View style={s.energySummary}>
              <Text style={s.energyCount}>{parentCirclePosts.length || 6}</Text>
              <Text style={s.energyLabel}>posts this session</Text>
            </View>
            <Text style={s.energyCaption}>
              every honest post here is a parent showing up for the community. that matters. ☕
            </Text>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a1a14' },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  backBtnText: { color: '#f5f0e8', fontSize: 22, lineHeight: 26 },
  kicker: { color: WARM, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#f5f0e8', fontSize: 26, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#6b7a5e', fontSize: 13, marginTop: 4 },

  dominantBanner: { marginHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  dominantEmoji: { fontSize: 32 },
  dominantLabel: { fontSize: 15, fontWeight: '800' },
  dominantDesc: { color: '#6b7a5e', fontSize: 12, marginTop: 2 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: { color: '#6b7a5e', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  sectionSub: { color: '#3a4a35', fontSize: 11, marginBottom: 10, marginTop: -4 },

  moodVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(20,30,18,0.7)', borderRadius: 14, borderWidth: 1, borderColor: '#3a4a35', padding: 12, marginBottom: 8 },
  moodVoteEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  moodVoteBarWrap: { flex: 1, gap: 4 },
  moodVoteBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  moodVoteBarFill: { height: 6, borderRadius: 3 },
  moodVoteLabel: { color: '#8fa885', fontSize: 11, fontWeight: '700' },
  moodVotePct: { fontSize: 13, fontWeight: '800', width: 36, textAlign: 'right' },
  moodVotedMark: { color: WARM, fontSize: 14, fontWeight: '900' },
  votePrompt: { color: '#3a4a35', fontSize: 12, textAlign: 'center', marginTop: 4 },

  porchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  porchChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(20,30,18,0.7)', borderRadius: 999, borderWidth: 1, borderColor: '#3a4a35', paddingHorizontal: 10, paddingVertical: 6 },
  porchEmoji: { fontSize: 14 },
  porchLabel: { color: '#6b7a5e', fontSize: 11, fontWeight: '600' },

  pinnedCard: { backgroundColor: 'rgba(20,30,18,0.85)', borderRadius: 16, borderWidth: 1, borderColor: `${WARM}40`, padding: 14, position: 'relative' },
  pinnedPin: { position: 'absolute', top: 10, right: 12, fontSize: 14 },
  tagBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: `${WARM}55`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10, backgroundColor: `${WARM}18` },
  tagBadgeText: { color: WARM_SOFT, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  pinnedText: { color: '#d4e8cc', fontSize: 14, lineHeight: 22, fontStyle: 'italic', marginRight: 20, marginBottom: 8 },
  pinnedMeta: { color: '#6b7a5e', fontSize: 10 },

  challengeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 0, backgroundColor: 'rgba(20,30,18,0.7)', borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  challengeAccentBar: { width: 3, alignSelf: 'stretch' },
  challengeTitle: { fontSize: 13, fontWeight: '900', marginBottom: 4, marginTop: 12, paddingHorizontal: 12 },
  challengeDesc: { color: '#8fa885', fontSize: 12, lineHeight: 18, paddingHorizontal: 12, paddingBottom: 12 },

  energySummary: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  energyCount: { color: WARM, fontSize: 32, fontWeight: '900' },
  energyLabel: { color: '#6b7a5e', fontSize: 13 },
  energyCaption: { color: '#3a4a35', fontSize: 12, lineHeight: 18 },
});
