// app/(teen)/circle/weather.tsx
// SE'KRET CIRCLE — Emotional Weather
// Mood % voting, Safe Circle avatars, Circle Challenges, Pinned Post

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
  { key: 'heavy',   emoji: '🌧️', label: 'heavy',   color: '#7dd3fc', desc: 'Carrying a lot today' },
  { key: 'steady',  emoji: '☁️',  label: 'steady',  color: '#c4b5fd', desc: 'Holding on okay'      },
  { key: 'winning', emoji: '🌟', label: 'winning', color: '#fbbf24', desc: 'Feeling strong today'  },
  { key: 'fun',     emoji: '✨',  label: 'fun',     color: '#fb7185', desc: 'Light and easy'        },
] as const;

type WeatherMoodKey = (typeof WEATHER_MOODS)[number]['key'];

const CIRCLE_CHALLENGES = [
  { id: 1, title: 'one soft thing', desc: 'Share one soft thing about your day — no edits, just the real one.', accent: '#f08bc5' },
  { id: 2, title: 'reach out', desc: 'Text someone you haven\'t talked to in a while. just say hey.', accent: '#76a7ff' },
  { id: 3, title: 'morning weather', desc: 'What\'s the weather inside you this morning? drop a bip.', accent: '#8ed9e7' },
];

const SAFE_CIRCLE_AVATARS = [
  { emoji: '🌑', label: 'quiet one' },
  { emoji: '☁️', label: 'cloud person' },
  { emoji: '🌿', label: 'grounded' },
  { emoji: '🌙', label: 'night owl' },
  { emoji: '⭐', label: 'bright light' },
  { emoji: '💜', label: 'soft heart' },
  { emoji: '🌊', label: 'wave rider' },
  { emoji: '🍃', label: 'breeze' },
];

function calcWeatherPercents(votes: Record<WeatherMoodKey, number>): Record<WeatherMoodKey, number> {
  const total = Object.values(votes).reduce((s, v) => s + v, 0);
  if (total === 0) return { heavy: 0, steady: 0, winning: 0, fun: 0 };
  const out = {} as Record<WeatherMoodKey, number>;
  for (const mood of WEATHER_MOODS) {
    out[mood.key] = Math.round((votes[mood.key] / total) * 100);
  }
  return out;
}

const PINNED_BIP = {
  text: 'i don\'t need to have it figured out today. the circle holds me either way.',
  accent: '#c4b5fd',
};

export default function CircleWeatherRoute() {
  const { circlePosts } = useAppContext();
  const [myVote, setMyVote] = useState<WeatherMoodKey | null>(null);
  const [votes, setVotes] = useState<Record<WeatherMoodKey, number>>({
    heavy: 14, steady: 22, winning: 8, fun: 11,
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
      <LinearGradient colors={['#10091b', '#171024', '#090711']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.kicker}>SE'KRET CIRCLE</Text>
              <Text style={s.title}>Emotional Weather</Text>
              <Text style={s.subtitle}>what's the circle feeling right now?</Text>
            </View>
          </View>

          {/* Dominant mood banner */}
          <View style={[s.dominantBanner, { backgroundColor: `${dominantMood.color}15`, borderColor: `${dominantMood.color}40` }]}>
            <Text style={s.dominantEmoji}>{dominantMood.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.dominantLabel, { color: dominantMood.color }]}>the circle is mostly {dominantMood.label}</Text>
              <Text style={s.dominantDesc}>{dominantMood.desc} · {totalVotes} voices</Text>
            </View>
          </View>

          {/* Mood voting */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>how are you feeling?</Text>
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
              <Text style={[s.votePrompt, { color: '#a855f7' }]}>your voice is in the circle 💜</Text>
            )}
          </View>

          {/* Safe Circle avatars */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>who's in the circle right now</Text>
            <Text style={s.sectionSub}>everyone here, anonymously</Text>
            <View style={s.avatarGrid}>
              {SAFE_CIRCLE_AVATARS.map((av, i) => (
                <View key={i} style={s.avatarChip}>
                  <Text style={s.avatarEmoji}>{av.emoji}</Text>
                  <Text style={s.avatarLabel}>{av.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pinned bip */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>pinned in the circle</Text>
            <View style={[s.pinnedCard, { borderColor: `${PINNED_BIP.accent}40` }]}>
              <Text style={s.pinnedPin}>📌</Text>
              <Text style={[s.pinnedText, { color: PINNED_BIP.accent }]}>"{PINNED_BIP.text}"</Text>
              <Text style={s.pinnedMeta}>anonymous bip · pinned by Se'kret</Text>
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

          {/* Recent circle energy summary */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>recent energy</Text>
            <View style={s.energySummary}>
              <Text style={s.energyCount}>{circlePosts.length}</Text>
              <Text style={s.energyLabel}>bips this session</Text>
            </View>
            <Text style={s.energyCaption}>
              every bip that lands here is someone showing up. that matters. 💜
            </Text>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090711' },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  backBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  kicker: { color: '#a855f7', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#5a3a78', fontSize: 13, marginTop: 4 },

  dominantBanner: { marginHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  dominantEmoji: { fontSize: 32 },
  dominantLabel: { fontSize: 15, fontWeight: '800' },
  dominantDesc: { color: '#5a3a78', fontSize: 12, marginTop: 2 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: { color: '#5a3a78', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  sectionSub: { color: '#3d2258', fontSize: 11, marginBottom: 10, marginTop: -4 },

  moodVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: '#2e1250', padding: 12, marginBottom: 8 },
  moodVoteEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  moodVoteBarWrap: { flex: 1, gap: 4 },
  moodVoteBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  moodVoteBarFill: { height: 6, borderRadius: 3 },
  moodVoteLabel: { color: '#7c5a9e', fontSize: 11, fontWeight: '700' },
  moodVotePct: { fontSize: 13, fontWeight: '800', width: 36, textAlign: 'right' },
  moodVotedMark: { color: '#a855f7', fontSize: 14, fontWeight: '900' },
  votePrompt: { color: '#3d2258', fontSize: 12, textAlign: 'center', marginTop: 4 },

  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 999, borderWidth: 1, borderColor: '#2e1250', paddingHorizontal: 10, paddingVertical: 6 },
  avatarEmoji: { fontSize: 14 },
  avatarLabel: { color: '#5a3a78', fontSize: 11, fontWeight: '600' },

  pinnedCard: { backgroundColor: 'rgba(196,181,253,0.05)', borderRadius: 16, borderWidth: 1, padding: 14, position: 'relative' },
  pinnedPin: { position: 'absolute', top: 10, right: 12, fontSize: 14 },
  pinnedText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic', marginRight: 20, marginBottom: 8 },
  pinnedMeta: { color: '#3d2258', fontSize: 10 },

  challengeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 0, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  challengeAccentBar: { width: 3, alignSelf: 'stretch' },
  challengeTitle: { fontSize: 13, fontWeight: '900', marginBottom: 4, marginTop: 12, paddingHorizontal: 12 },
  challengeDesc: { color: '#7c5a9e', fontSize: 12, lineHeight: 18, paddingHorizontal: 12, paddingBottom: 12 },

  energySummary: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  energyCount: { color: '#a855f7', fontSize: 32, fontWeight: '900' },
  energyLabel: { color: '#5a3a78', fontSize: 13 },
  energyCaption: { color: '#3d2258', fontSize: 12, lineHeight: 18 },
});
