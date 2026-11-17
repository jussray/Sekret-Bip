import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { loadSekretMemory, summarizeSekretMemory } from '../services/sekretMemory';
import type { SekretMemory } from '../services/sekretMemory';
import type { MemorySummary } from '../types/sekretCompanion';

export function MemoriesScreen() {
  const { entries, voiceNotes } = useAppContext();
  const [memory, setMemory]   = useState<SekretMemory | null>(null);
  const [summary, setSummary] = useState<MemorySummary | null>(null);

  useEffect(() => {
    loadSekretMemory().then(mem => {
      setMemory(mem);
      setSummary(summarizeSekretMemory(mem));
    }).catch(() => null);
  }, []);

  const moments   = entries.filter(e => e.sekretReply || e.imageUri || e.text);
  const bips      = (voiceNotes ?? []).slice(0, 20);
  const wins      = memory?.winHistory?.slice(-15).reverse() ?? [];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#10091b', '#171024', '#090711']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.kicker}>YOUR BIP STORY</Text>
            <Text style={styles.title}>Memories</Text>
          </View>
          <Text style={styles.badge}>private</Text>
        </View>

        {/* Stats row */}
        {summary ? (
          <View style={styles.statsRow}>
            {[
              { num: summary.streakDays,     label: 'day streak' },
              { num: summary.journalsWritten, label: 'pages'      },
              { num: summary.voiceBips,       label: 'voice bips' },
              { num: summary.proudMoodCount ?? 0, label: 'wins'   },
            ].map(({ num, label }) => (
              <View key={label} style={styles.statPill}>
                <Text style={styles.statNum}>{num}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Mood + topics insight card */}
        {summary?.favoriteMood ? (
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>MOST FELT</Text>
            <Text style={styles.insightValue}>{summary.favoriteMood}</Text>
            {summary.commonTopics.length > 0 ? (
              <View style={styles.topicRow}>
                {summary.commonTopics.slice(0, 5).map(t => (
                  <View key={t} style={styles.topicChip}>
                    <Text style={styles.topicText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {summary.recentGrowth ? (
              <Text style={styles.growthNote}>🌱 {summary.recentGrowth}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Se'kret Moments */}
        <Text style={styles.sectionTitle}>Se'kret Moments</Text>
        {moments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Your Se'kret moments will appear here as you journal with your companions.
            </Text>
          </View>
        ) : (
          moments.slice(0, 25).map(entry => (
            <View key={String(entry.id)} style={styles.momentCard}>
              <Text style={styles.momentMeta}>{entry.date} · {entry.time}</Text>
              {entry.imageUri ? (
                entry.mediaType === 'video' ? (
                  <View style={styles.videoThumb}>
                    <Text style={styles.videoIcon}>📹</Text>
                    <Text style={styles.videoLabel}>Video Bip</Text>
                  </View>
                ) : (
                  <Image source={{ uri: entry.imageUri }} style={styles.momentMedia} />
                )
              ) : null}
              {entry.text ? <Text style={styles.momentText}>{entry.text}</Text> : null}
              {entry.sekretReply ? (
                <View style={styles.replyBlock}>
                  <Text style={styles.replyChar}>{entry.source ?? "Se'kret"}</Text>
                  <Text style={styles.replyText}>{entry.sekretReply}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}

        {/* Voice Bips */}
        {bips.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Voice Bips</Text>
            {bips.map(note => (
              <View key={String(note.id)} style={styles.voiceCard}>
                <Text style={styles.videoIcon}>{note.type === 'video' ? '📹' : '🎙️'}</Text>
                <View style={styles.voiceInfo}>
                  <Text style={styles.voiceTitle}>{note.title}</Text>
                  <Text style={styles.voiceMeta}>{note.date} · {note.duration}</Text>
                </View>
              </View>
            ))}
          </>
        ) : null}

        {/* Wins & Growth */}
        {wins.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Wins & Growth 🌱</Text>
            <View style={styles.winsWrap}>
              {wins.map((win, i) => (
                <View key={i} style={styles.winChip}>
                  <Text style={styles.winText}>⭐ {win.mood}</Text>
                  <Text style={styles.winDate}>{win.date?.slice(0, 10) ?? ''}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#090711' },
  scroll:      { paddingTop: Platform.OS === 'ios' ? 58 : 34, paddingHorizontal: 16, paddingBottom: 120 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn:     { paddingVertical: 4, paddingRight: 8 },
  backText:    { color: '#9a90a5', fontSize: 13 },
  kicker:      { color: '#9a78c8', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title:       { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  badge:       { color: '#b8afc1', fontSize: 9, borderWidth: 1, borderColor: '#ffffff20', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statsRow:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statPill:    { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 12, alignItems: 'center' },
  statNum:     { color: '#fff', fontSize: 20, fontWeight: '900' },
  statLabel:   { color: '#9a90a5', fontSize: 9, fontWeight: '700', marginTop: 2 },
  insightCard: { borderRadius: 20, borderWidth: 1, borderColor: '#9a78c844', backgroundColor: 'rgba(30,15,50,0.9)', padding: 16, marginBottom: 20 },
  insightLabel: { color: '#9a78c8', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  insightValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  topicRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  topicChip:   { borderRadius: 999, borderWidth: 1, borderColor: '#ffffff18', paddingHorizontal: 10, paddingVertical: 4 },
  topicText:   { color: '#cfc5d5', fontSize: 11 },
  growthNote:  { color: '#b4e9b0', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#efe8f3', fontSize: 14, fontWeight: '900', marginTop: 24, marginBottom: 10 },
  emptyCard:   { borderRadius: 18, borderWidth: 1, borderColor: '#ffffff10', backgroundColor: 'rgba(255,255,255,0.03)', padding: 20, alignItems: 'center' },
  emptyText:   { color: '#8e8495', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  momentCard:  { borderRadius: 18, borderWidth: 1, borderColor: '#ffffff10', backgroundColor: 'rgba(255,255,255,0.04)', padding: 15, marginBottom: 10 },
  momentMeta:  { color: '#8e8495', fontSize: 9, marginBottom: 8 },
  momentMedia: { width: '100%', height: 130, borderRadius: 10, resizeMode: 'cover', marginBottom: 8 },
  videoThumb:  { width: '100%', height: 70, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  videoIcon:   { fontSize: 18 },
  videoLabel:  { color: '#a99fb2', fontSize: 12, fontWeight: '700' },
  momentText:  { color: '#eee7f1', fontSize: 14, lineHeight: 22 },
  replyBlock:  { borderLeftWidth: 2, borderLeftColor: '#9a78c866', paddingLeft: 11, marginTop: 12 },
  replyChar:   { color: '#9a78c8', fontSize: 9, fontWeight: '900', marginBottom: 4, textTransform: 'capitalize' },
  replyText:   { color: '#cfc5d5', fontSize: 12, lineHeight: 19 },
  voiceCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: '#ffffff10', backgroundColor: 'rgba(255,255,255,0.04)', padding: 13, marginBottom: 8 },
  voiceInfo:   { flex: 1 },
  voiceTitle:  { color: '#eee7f1', fontSize: 13, fontWeight: '700' },
  voiceMeta:   { color: '#8e8495', fontSize: 10, marginTop: 2 },
  winsWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  winChip:     { borderRadius: 12, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8 },
  winText:     { color: '#eee7f1', fontSize: 12, fontWeight: '700' },
  winDate:     { color: '#7e7489', fontSize: 9, marginTop: 2 },
});
