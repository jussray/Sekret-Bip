// screens/BipCrewScreen.tsx
// Se'kret Bip — Bip Crew (invite-only accountability)
//
// Phase 2 build. NOT the same as Circle. Circle is anonymous broadcast
// ("drop a bip into the cloud"). Crew is your 2–6 chosen people — each with a
// soft commitment and a check-in cadence. No clout, no comments, no likes.
// Just: "I see you. I'm with you. we said we'd show up."
//
// Voice:
//   • Rylane: "loyal bros. small crew. lock in together."
//   • Raylene: "your soft people 💜 the ones who get it. invite-only."
//
// Local-only for now (no Supabase yet — that's task #21). Each member gets a
// generated invite code as a placeholder. Cadence drives a "due to check in"
// hint. Tapping "check in for them" lets you log a soft note on their behalf
// (or "they checked in on me") — same soft scrapbook energy.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Text, TextInput, TouchableOpacity, ScrollView, View,
  ImageBackground, Animated, Easing, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg, TimeOfDay } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';
import { syncCrewMember, deleteCrewMember, syncCrewCheckIn } from '@/utils/sync';
import { scheduleCrewReminder, cancelCrewReminder } from '@/utils/notifications';
import { SyncBadge, type SyncStatus } from '../components/SyncBadge';
import type { CrewMember, CrewCheckIn } from '@/types';

const MAX_CREW = 6;

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function makeInviteCode(): string {
  const chars = 'BIPCREW0123456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function daysSince(iso: string): number {
  if (!iso) return 9999;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return 9999;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

const EMOJI_PICKS = ['\u{1F49C}', '\u{1F319}', '☁\uFE0F', '\u{1F31F}', '\u{1F341}', '\u{1F35C}', '\u{1F38F}', '\u{1F4AB}'];

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  t: Record<string, any>;
  mood: string;
  selectedSekret: 'rylane' | 'raylene' | string;
  crewMembers: CrewMember[];
  setCrewMembers: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  crewCheckIns: CrewCheckIn[];
  setCrewCheckIns: React.Dispatch<React.SetStateAction<CrewCheckIn[]>>;
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
  syncStatus?: SyncStatus;
  withSyncWrap?: (fn: () => Promise<void>) => Promise<void>;
}

export function BipCrewScreen({
  t, mood, selectedSekret,
  crewMembers, setCrewMembers,
  crewCheckIns, setCrewCheckIns,
  setScreen, BottomNav,
  syncStatus, withSyncWrap,
}: Props) {
  const isRylane = selectedSekret === 'rylane';
  const tod = timeOfDay();
  const bg = getRoomBg(isRylane ? 'rylane' : 'raylene', tod);
  const glow = glowFor(mood);
  const accent = isRylane ? '#4DA3FF' : '#e879a3';
  const softAccent = isRylane ? '#b6dcff' : '#f5b8cf';
  const cardBg = isRylane ? 'rgba(10,20,40,0.82)' : 'rgba(40,15,40,0.82)';

  // ── Local form state ───────────────────────────────────────────────────────
  const [showInvite, setShowInvite] = useState(false);
  const [newName, setNewName]             = useState('');
  const [newCommit, setNewCommit]         = useState('');
  const [newEmoji, setNewEmoji]           = useState(isRylane ? '\u{1F31F}' : '\u{1F49C}');
  const [newCadence, setNewCadence]       = useState<'daily' | 'weekly' | 'whenever'>('weekly');
  const [checkInFor, setCheckInFor]       = useState<string | number | null>(null);
  const [checkInNote, setCheckInNote]     = useState('');

  // ── Animations ─────────────────────────────────────────────────────────────
  const heroAnim  = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const noteAnim  = useRef(new Animated.Value(0)).current;
  const breath    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(heroAnim,  { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card1Anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card2Anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card3Anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(noteAnim,  { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [breath, heroAnim, card1Anim, card2Anim, card3Anim, noteAnim]);

  const enter = (a: Animated.Value) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });
  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });

  // ── Actions ────────────────────────────────────────────────────────────────
  const addMember = () => {
    const name = newName.trim();
    const commit = newCommit.trim();
    if (!name || crewMembers.length >= MAX_CREW) return;
    const nextId = crewMembers.length ? Math.max(...crewMembers.map(m => Number(m.id))) + 1 : 1;
    const member: CrewMember = {
      id: nextId,
      name,
      relation: "",
      emoji: newEmoji || "\u{1F49C}",
      commitment: commit || (isRylane ? "we lock in for each other" : "we're here for each other"),
      cadence: newCadence,
      inviteCode: makeInviteCode(),
      addedAt: new Date().toISOString(),
    };
    setCrewMembers(prev => [...prev, member]);
    void scheduleCrewReminder(member);
    const sync = () => syncCrewMember(member);
    if (withSyncWrap) void withSyncWrap(async () => sync());
    else sync();
    setNewName('');
    setNewCommit('');
    setShowInvite(false);
  };

  const removeMember = (id: string | number) => {
    setCrewMembers(prev => prev.filter(m => String(m.id) !== String(id)));
    setCrewCheckIns(prev => prev.filter(c => String(c.memberId) !== String(id)));
    void cancelCrewReminder(id);
    const sync = () => deleteCrewMember(Number(id));
    if (withSyncWrap) void withSyncWrap(async () => sync());
    else sync();
  };

  const logCheckIn = (memberId: string | number) => {
    const note = checkInNote.trim();
    if (!note) return;
    const now = new Date();
    const nextId = crewCheckIns.length ? Math.max(...crewCheckIns.map(c => c.id)) + 1 : 1;
    const checkIn: CrewCheckIn = {
      id: nextId,
      memberId,
      note,
      mood,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setCrewCheckIns(prev => [checkIn, ...prev].slice(0, 200));
    const sync = () => syncCrewCheckIn(checkIn);
    if (withSyncWrap) void withSyncWrap(async () => sync());
    else sync();
    setCheckInNote('');
    setCheckInFor(null);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const lastCheckInFor = useMemo(() => {
    const m: Record<string | number, CrewCheckIn | undefined> = {};
    for (const c of crewCheckIns) {
      if (!m[c.memberId]) m[c.memberId] = c;
    }
    return m;
  }, [crewCheckIns]);

  const isOverdue = (mem: CrewMember): boolean => {
    if (mem.cadence === 'whenever') return false;
    const last = lastCheckInFor[mem.id];
    const since = last ? daysSince(`${last.date}`) : daysSince(mem.addedAt ?? '');
    return mem.cadence === 'daily' ? since >= 2 : since >= 8;
  };

  // ── Copy ───────────────────────────────────────────────────────────────────
  const heroTitle = isRylane ? 'bip crew' : 'bip crew \u{1F49C}';
  const heroSub = isRylane
    ? 'small. loyal. invite-only. no clout.'
    : 'your soft people. invite-only. no comments, no likes.';

  const emptyCopy = isRylane
    ? 'no crew yet. pick your 2–6. people you actually lock in with.'
    : 'no crew yet. pick your 2–6. the ones who actually get it \u{1F49C}';

  const stickyAffirmation = isRylane
    ? "“a real one shows up. that's the whole rule.”"
    : "“you don't need a crowd. you need 2–6 soft ones.”";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <Animated.View style={[styles.hero, enter(heroAnim)]}>
          <Animated.View
            style={[
              styles.pill,
              { borderColor: softAccent, backgroundColor: 'rgba(20,12,40,0.55)' },
              { opacity: breathOpacity, transform: [{ scale: breathScale }] },
            ]}
          >
            <Text style={[styles.pillText, { color: softAccent }]}>
              {isRylane ? '\u{1F9CD} rylane is here' : '☁\uFE0F raylene is here'}
            </Text>
          </Animated.View>

          <Text style={[styles.heroTitle, { textShadowColor: glow }]}>{heroTitle}</Text>
          <Text style={styles.heroSub}>{heroSub}</Text>
          <SyncBadge status={syncStatus ?? 'idle'} />
        </Animated.View>

        {/* Crew list */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card1Anim)]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.cardKicker, { color: softAccent }]}>your crew · {crewMembers.length}/{MAX_CREW}</Text>
            {crewMembers.length < MAX_CREW && (
              <TouchableOpacity onPress={() => setShowInvite(s => !s)}>
                <Text style={[styles.linkBtn, { color: accent }]}>
                  {showInvite ? 'close' : '+ invite someone'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {crewMembers.length === 0 && !showInvite && (
            <Text style={styles.empty}>{emptyCopy}</Text>
          )}

          {crewMembers.map(mem => {
            const last = lastCheckInFor[mem.id];
            const overdue = isOverdue(mem);
            return (
              <View key={mem.id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberEmoji}>{mem.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{mem.name}</Text>
                    <Text style={styles.memberCommit}>{mem.commitment}</Text>
                    <Text style={styles.memberMeta}>
                      cadence: {mem.cadence} · code: {mem.inviteCode}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMember(mem.id)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>remove</Text>
                  </TouchableOpacity>
                </View>

                {last ? (
                  <Text style={[styles.lastNote, overdue && { color: '#fbbf24' }]}>
                    last: “{last.note}” · {last.date}
                  </Text>
                ) : (
                  <Text style={[styles.lastNote, overdue && { color: '#fbbf24' }]}>
                    no check-ins yet
                  </Text>
                )}

                {overdue && (
                  <Text style={styles.overdueHint}>
                    {isRylane ? '\u2022 due for a check-in. nudge them.' : '\u2022 due for a check-in \u{1F49C} send love'}
                  </Text>
                )}

                {checkInFor === mem.id ? (
                  <View style={{ marginTop: 8 }}>
                    <TextInput
                      style={styles.input}
                      placeholder={isRylane ? "what'd they say? what'd you say?" : "soft note about today \u{1F49C}"}
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      value={checkInNote}
                      onChangeText={setCheckInNote}
                      multiline
                    />
                    <View style={styles.rowBetween}>
                      <TouchableOpacity onPress={() => { setCheckInFor(null); setCheckInNote(''); }}>
                        <Text style={[styles.linkBtn, { color: softAccent }]}>cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.miniCta, { backgroundColor: accent }]}
                        onPress={() => logCheckIn(mem.id)}
                      >
                        <Text style={styles.miniCtaText}>save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.miniCta, { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: softAccent, marginTop: 8 }]}
                    onPress={() => setCheckInFor(mem.id)}
                  >
                    <Text style={styles.miniCtaText}>
                      {isRylane ? 'log a check-in' : 'log a check-in \u{1F49C}'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </Animated.View>

        {/* Invite form */}
        {showInvite && (
          <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card2Anim)]}>
            <Text style={[styles.cardKicker, { color: softAccent }]}>invite someone soft</Text>

            <Text style={styles.label}>their name (or nickname)</Text>
            <TextInput
              style={styles.input}
              placeholder={isRylane ? 'big mike, m-dot, whatever' : 'soft name only \u{1F49C}'}
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.label}>their emoji</Text>
            <View style={styles.emojiRow}>
              {EMOJI_PICKS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setNewEmoji(e)}
                  style={[
                    styles.emojiBtn,
                    newEmoji === e && { borderColor: accent, backgroundColor: 'rgba(255,255,255,0.08)' },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>what we said we'd do for each other</Text>
            <TextInput
              style={styles.input}
              placeholder={isRylane ? '“text me when you spiral”' : '“we show up. softly.”'}
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={newCommit}
              onChangeText={setNewCommit}
              multiline
            />

            <Text style={styles.label}>cadence</Text>
            <View style={styles.cadRow}>
              {(['daily', 'weekly', 'whenever'] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewCadence(c)}
                  style={[
                    styles.cadBtn,
                    newCadence === c && { borderColor: accent, backgroundColor: 'rgba(255,255,255,0.08)' },
                  ]}
                >
                  <Text style={[styles.cadText, newCadence === c && { color: accent }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.cta, { backgroundColor: accent, opacity: newName.trim() ? 1 : 0.5 }]}
              onPress={addMember}
              disabled={!newName.trim()}
            >
              <Text style={styles.ctaText}>
                {isRylane ? 'add to crew →' : 'add to crew \u{1F49C}'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.cardSub}>
              {isRylane
                ? 'local only for now. when supabase lands, the code becomes a real invite.'
                : 'local only for now. when supabase lands the code becomes a real invite \u{1F49C}'}
            </Text>
          </Animated.View>
        )}

        {/* Recent activity */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card3Anim)]}>
          <Text style={[styles.cardKicker, { color: softAccent }]}>recent check-ins</Text>
          {crewCheckIns.length === 0 ? (
            <Text style={styles.empty}>
              {isRylane ? 'no check-ins yet. log one when it happens.' : 'no check-ins yet. soft proof builds slow \u{1F49C}'}
            </Text>
          ) : (
            <View style={{ marginTop: 6 }}>
              {crewCheckIns.slice(0, 8).map(c => {
                const mem = crewMembers.find(m => m.id === c.memberId);
                return (
                  <View key={c.id} style={styles.activityRow}>
                    <Text style={styles.activityEmoji}>{mem?.emoji || '\u{1F49C}'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityName}>{mem?.name || 'crew member'}</Text>
                      <Text style={styles.activityNote}>“{c.note}”</Text>
                      <Text style={styles.activityMeta}>{c.date} · {c.time}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Scrapbook sticky note */}
        <Animated.View style={[styles.sticky, enter(noteAnim)]}>
          <Text style={styles.stickyText}>{stickyAffirmation}</Text>
          <Text style={styles.stickySig}>{isRylane ? '— rylane' : '— raylene'}</Text>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
      {BottomNav}
    </ImageBackground>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg:     { flex: 1 },
  scroll: { padding: 20, paddingTop: 60, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  hero:      { alignItems: 'center', marginBottom: 22 },
  pill:      {
    borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12,
  },
  pillText:  { fontSize: 12, letterSpacing: 0.4 },
  heroTitle: {
    color: '#fff', fontSize: 28, fontWeight: '700',
    textAlign: 'center', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 },
    marginBottom: 8,
    ...(Platform.OS === 'web' ? ({ textShadow: '0 0 14px rgba(196,181,253,0.6)' } as any) : null),
  },
  heroSub:   { color: '#e9e4ff', fontSize: 14, textAlign: 'center', opacity: 0.9 },

  card: {
    borderRadius: 18, borderWidth: 1,
    padding: 18, marginBottom: 16,
  },
  cardKicker: { fontSize: 12, letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  cardSub:    { color: '#cfc6e8', fontSize: 12, lineHeight: 18, marginTop: 12, fontStyle: 'italic' },
  empty:      { color: '#cfc6e8', fontSize: 13, marginTop: 12, fontStyle: 'italic' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkBtn:    { fontSize: 13, fontWeight: '600' },
  label:      { color: '#cfc6e8', fontSize: 11, marginTop: 10, marginBottom: 4, letterSpacing: 0.4, textTransform: 'uppercase' },
  input:      {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, minHeight: 44,
  },

  emojiRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  emojiBtn:   { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },

  cadRow:     { flexDirection: 'row', gap: 8, marginTop: 4 },
  cadBtn:     { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cadText:    { color: '#e9e4ff', fontSize: 12, letterSpacing: 0.3 },

  memberCard: {
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  memberHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  memberEmoji:  { fontSize: 24, width: 32, textAlign: 'center' },
  memberName:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  memberCommit: { color: '#e9e4ff', fontSize: 13, marginTop: 2, fontStyle: 'italic' },
  memberMeta:   { color: '#9ea0c0', fontSize: 11, marginTop: 4 },
  removeBtn:    { padding: 4 },
  removeText:   { color: '#9ea0c0', fontSize: 11 },
  lastNote:     { color: '#cfc6e8', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  overdueHint:  { color: '#fbbf24', fontSize: 11, marginTop: 4 },

  miniCta:      { borderRadius: 10, paddingVertical: 8, alignItems: 'center', marginTop: 6 },
  miniCtaText:  { color: '#fff', fontWeight: '600', fontSize: 12 },

  cta:          { borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  ctaText:      { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },

  activityRow:   { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  activityEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  activityName:  { color: '#fff', fontSize: 13, fontWeight: '600' },
  activityNote:  { color: '#e9e4ff', fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  activityMeta:  { color: '#9ea0c0', fontSize: 11, marginTop: 2 },

  sticky: {
    backgroundColor: '#fff8e7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed',
    transform: [{ rotate: '-2deg' }],
    marginTop: 4,
    marginHorizontal: 8,
  },
  stickyText: { color: '#3b2a1a', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  stickySig:  { color: '#7a5a2a', fontSize: 12, marginTop: 6, textAlign: 'right' },
});
