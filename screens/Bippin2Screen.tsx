// screens/Bippin2Screen.tsx
// Phase 1 polish: time-of-day backdrop, mood-tinted glow, char-aware greeting,
// staggered entrance, breath loop on cloud + streak. Also fixes inverted
// gender-polarity: Suhana → Womanhood content, Sy → Manhood content
// (was swapped). No screens removed, no new features.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IMAGES, getRoomBg, TimeOfDay, Character } from '../constants/theme';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { MiniReactionSticker } from '../components/MiniReactionSticker';
import {
  Text, TouchableOpacity, ScrollView, View,
  Image, ImageBackground, Animated, StyleSheet, Platform, Easing, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sendParentNote, fetchLinkedTeenId, fetchParentEngagement, ParentEngagement } from '@/utils/sync';
import { usePoints, TIERS, tierFor, type Tier } from '@/features/activity/ledger';

const ART: Record<string, Record<string, any>> = {
  raylene: {
    hero:     IMAGES.rayleneFullbody,
    neutral:  IMAGES.rayleneNeutral,
    window:   IMAGES.rayleneWindow,
    thinking: IMAGES.rayleneThinking,
  },
  rylane: {
    hero:     IMAGES.rylaneFullbody,
    neutral:  IMAGES.rylaneNeutral,
    window:   IMAGES.rylaneWindow,
    thinking: IMAGES.rylaneThinking,
  },
  night: {
    hero:     IMAGES.nightFullbody,
    neutral:  IMAGES.nightNeutral,
    window:   IMAGES.nightWindow,
    thinking: IMAGES.nightThinking,
  },
};

// ─── Static data — Womanhood (Suhana) ─────────────────────────────────────────
const W_CHIPS = [
  { key: 'period',   emoji: '🩸', label: 'First Period\nSupport' },
  { key: 'cycle',    emoji: '🫶', label: 'Cycle\nWellness' },
  { key: 'mood',     emoji: '🌙', label: 'Mood + Body\nCheck-in' },
  { key: 'comfort',  emoji: '🌷', label: 'Comfort\nMode' },
  { key: 'sekret',   emoji: '🤍', label: "Ask\nSe'kret" },
  { key: 'journal',  emoji: '📝', label: 'Private\nJournal' },
];

const W_MOOD_CHIPS = [
  { label: 'happy',     emoji: '😊' },
  { label: 'calm',      emoji: '😌' },
  { label: 'tired',     emoji: '😴' },
  { label: 'scared',    emoji: '😨' },
  { label: 'emotional', emoji: '🥺' },
  { label: 'okay',      emoji: '🤍' },
];

const W_BIP_FLOW = [
  { icon: '👁️\u200d🗨️', step: 'notice',   sub: 'how you feel' },
  { icon: '📝', step: 'name it',   sub: 'be real' },
  { icon: '🫶', step: 'nourish',   sub: 'yourself' },
  { icon: '🫧', step: 'release',  sub: 'let it out' },
  { icon: '🕊️', step: 'grow',     sub: 'keep bippin' },
];

// ─── Static data — Manhood (Sy) ───────────────────────────────────────────
const M_CHIPS = [
  { key: 'puberty',    emoji: '🪱', label: 'Puberty\nGuide' },
  { key: 'body',       emoji: '🧠', label: 'Body\nChanges' },
  { key: 'confidence', emoji: '🕊️', label: 'Confidence\nBoost' },
  { key: 'hygiene',    emoji: '🌻', label: 'Hygiene +\nSelf-Care' },
  { key: 'mind',       emoji: '🧠', label: 'Mind\nCheck-in' },
  { key: 'journal',    emoji: '📝', label: 'Private\nJournal' },
];

const M_MOOD_CHIPS = [
  { label: 'happy',   emoji: '😊' },
  { label: 'calm',    emoji: '😌' },
  { label: 'stressed', emoji: '🤯' },
  { label: 'angry',   emoji: '😠' },
  { label: 'tired',   emoji: '😴' },
  { label: 'okay',    emoji: '🤍' },
];

const M_BIP_FLOW = [
  { icon: '👁️\u200d🗨️', step: 'notice',  sub: "what's up" },
  { icon: '📝', step: 'name it', sub: 'be honest' },
  { icon: '🪱', step: 'reset',   sub: 'refocus' },
  { icon: '🫧', step: 'release', sub: 'clear it out' },
  { icon: '🕒', step: 'grow',    sub: 'level up' },
];

interface Bippin2ScreenProps {
  t: Record<string, any>;
  mood: string;
  selectedSekret: string;
  setScreen: (screen: string) => void;
  onMilestone?: () => void;
  BottomNav: React.ReactNode;
  streakDays?: number;
  onOpenGuide?: (guide: 'womanhood' | 'manhood') => void;
  side: 'teen' | 'parent';
}

// ─── Parent milestone definitions ────────────────────────────────────────────
const PARENT_MILESTONES: Array<{
  id: string; emoji: string; label: string; sub: string;
  check: (e: ParentEngagement) => boolean;
}> = [
  { id: 'first_note',    emoji: '💜', label: 'First Warm Note',  sub: 'You reached out. That already matters.',       check: e => e.notesSent >= 1    },
  { id: 'tip_explorer',  emoji: '📖', label: 'Tip Explorer',     sub: 'Read 3 or more parent tips.',                  check: e => e.tipsRead >= 3     },
  { id: 'notes_five',    emoji: '✉️', label: 'Regular Voice',    sub: 'Sent 5 warm notes to your teen.',              check: e => e.notesSent >= 5    },
  { id: 'bridge_builder',emoji: '🌉', label: 'Bridge Builder',   sub: 'Connected through the Bridge.',                check: e => e.bridgeUsed        },
  { id: 'week_presence', emoji: '🌿', label: '7-Day Presence',   sub: 'Showed up for your teen 7 days running.',      check: e => e.daysActive >= 7   },
  { id: 'month_connected',emoji: '🤝', label: '30-Day Connected', sub: 'A full month of staying close.',              check: e => e.daysActive >= 30  },
];

const PARENT_TIPS = [
  { title: "Let them lead",          body: "Growth questions come when they feel safe -- not when pushed. Being available is enough." },
  { title: "Normalise the conversation", body: "One casual mention of puberty or emotions makes the next conversation easier. Lower the stakes." },
  { title: "Don't project",          body: "Your experience of adolescence isn't theirs. Ask more than you assume." },
  { title: "Celebrate consistency",  body: "Showing up to their growth journey, even imperfectly, matters more than perfect advice." },
];

const PARENT_STARTERS = [
  "I'm proud of who you're becoming.",
  "You don't have to figure it all out today.",
  "I'm here -- no pressure, no lecture.",
  "Growing up is hard. You're doing it anyway.",
  "I see you working on yourself. That matters.",
];

// ─── Compact mood history for progress card (top moods shown inline) ──────────
const BIP2_MOOD_HISTORY = [
  { label: 'calm',   emoji: '😌' },
  { label: 'happy',  emoji: '😊' },
  { label: 'tired',  emoji: '😴' },
  { label: 'okay',   emoji: '🤍' },
];

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
};

const greetingByTime = (time: TimeOfDay, charName: string, isRylane: boolean) => {
  const verb =
    time === 'morning' ? 'Good morning' :
    time === 'day'     ? 'Hey' :
    time === 'evening' ? 'Good evening' :
                         'Good night';
  if (isRylane) {
    return {
      title: `${verb}, ${charName} 🪱`,
      body:
        time === 'morning' ? "fresh start. small wins count today.\nlet's lock in."
      : time === 'day'     ? "mid-day check. you doing okay?\ntake a breath."
      : time === 'evening' ? "long day. you held it together.\nrespect."
                           : "late hours. keep building the best version of you.\nyou've got this.",
    };
  }
  return {
    title: `${verb}, ${charName} 🫶`,
    body:
      time === 'morning' ? "soft start. you don't have to do it all today.\njust be here 💜"
    : time === 'day'     ? "mid-day check-in. how's your body feeling?\nbe gentle 💜"
    : time === 'evening' ? "evening wind-down. you made it through.\nproud of you 💜"
                         : "your body is changing.\nthat's not something to fear or hide.",
  };
};

const moodGlow = (mood?: string): string => {
  const m = (mood || '').toLowerCase();
  if (m === 'happy') return '#fbbf24';
  if (m === 'sad' || m === 'anxious') return '#7dd3fc';
  if (m === 'angry' || m === 'overwhelmed' || m === 'stressed') return '#f472b6';
  if (m === 'tired') return '#6d28d9';
  if (m === 'calm') return '#c4b5fd';
  return '#c4b5fd';
};

export function Bippin2Screen({
  t, mood, selectedSekret, setScreen, onMilestone, BottomNav, streakDays = 0, onOpenGuide,
  side,
}: Bippin2ScreenProps) {

  // ── Parent-side state (only active when side === 'parent') ─────────────────
  const [parentTab,   setParentTab]   = useState<'journey' | 'tips' | 'note'>('journey');
  const [noteMsg,     setNoteMsg]     = useState('');
  const [noteSent,    setNoteSent]    = useState(false);
  const [noteSending, setNoteSending] = useState(false);
  const [teenId,      setTeenId]      = useState<string | null>(null);
  const [engagement,  setEngagement]  = useState<ParentEngagement>({
    notesSent: 0, tipsRead: 0, daysActive: 0, bridgeUsed: false,
  });

  const isRylane      = selectedSekret === 'rylane';
  const isNight       = selectedSekret === 'night';
  const isManhoodChar = isRylane || isNight;
  const charName      = isRylane ? 'Sy' : isNight ? 'Night' : 'Suhana';
  const charEmoji     = isRylane ? '🪱' : isNight ? '🌙' : '🫶';
  const artKey        = isNight ? 'night' : (isRylane ? 'rylane' : 'raylene');
  const art           = ART[artKey];
  const charKey: Character = isNight ? 'night' : (isRylane ? 'rylane' : 'raylene');

  const time = useMemo(() => getTimeOfDay(), []);
  const bg   = useMemo(() => getRoomBg(charKey, time), [charKey, time]);

  // Manhood chars (Sy/Night): cool electric blue. Suhana: warm purple.
  const idAccent   = isManhoodChar ? '#4DA3FF' : t.accent;
  const idSoft     = isManhoodChar ? '#B6DCFF' : t.soft;
  const glow       = useMemo(() => moodGlow(mood), [mood]);

  // ─── Bip Points ledger (live, teen-only) ──────────────────────────────────
  const ledger     = usePoints();
  const bipTier: Tier   = ledger.isLoaded ? ledger.tier : tierFor(0);
  const bipTierIdx      = TIERS.findIndex(t2 => t2.key === bipTier.key);
  const bipNextTier     = TIERS[bipTierIdx + 1];
  const bipTotal        = ledger.isLoaded ? ledger.total : 0;
  const bipProgress     = bipNextTier
    ? Math.min(1, Math.max(0, (bipTotal - bipTier.min) / (bipNextTier.min - bipTier.min)))
    : 1;

  // ─── Animations ───────────────────────────────────────────────────────────
  const fadeIn   = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const breath   = useRef(new Animated.Value(0)).current;
  const card1    = useRef(new Animated.Value(0)).current;
  const card2    = useRef(new Animated.Value(0)).current;
  const card3    = useRef(new Animated.Value(0)).current;
  const card4    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 550, useNativeDriver: true }).start();

    const stagger = (val: Animated.Value, delay: number) =>
      Animated.timing(val, {
        toValue: 1, duration: 380, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
    Animated.parallel([
      stagger(card1, 80),
      stagger(card2, 220),
      stagger(card3, 360),
      stagger(card4, 500),
    ]).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 2600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2600, useNativeDriver: true }),
      ])
    );
    glowLoop.start();

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    breathLoop.start();

    return () => { glowLoop.stop(); breathLoop.stop(); };
  }, [fadeIn, glowAnim, breath, card1, card2, card3, card4]);

  useEffect(() => {
    if (side !== 'parent') return;
    fetchLinkedTeenId().then(id => { if (id) setTeenId(id); });
    fetchParentEngagement().then(data => { if (data) setEngagement(data); });
  }, [side]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.18, 0.42] });
  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const cardStyle = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  });

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energyLevel] = useState(72);
  const [sleepHours] = useState('6h 42m');

  const handleNote = async () => {
    const text = noteMsg.trim();
    if (!text) return;
    if (!teenId) {
      Alert.alert('Not linked', 'Link to your teen in Settings first.');
      return;
    }
    setNoteSending(true);
    try {
      const ok = await sendParentNote(teenId, text);
      if (ok) {
        setNoteSent(true);
        setNoteMsg('');
        setEngagement(prev => ({ ...prev, notesSent: prev.notesSent + 1 }));
      } else {
        Alert.alert('Could not send', 'Try again in a moment.');
      }
    } catch {
      Alert.alert('Could not send', 'Check your connection.');
    } finally {
      setNoteSending(false);
    }
  };

  // ── Parent view ─────────────────────────────────────────────────────────────
  if (side === 'parent') {
    const achieved = PARENT_MILESTONES.filter(m => m.check(engagement)).length;
    const pAccent  = '#a78bfa';
    const pSoft    = '#ede9fe';
    const pGreen   = '#6ee7b7';
    const pAmber   = '#fcd34d';
    const pDeep    = '#1e0f3a';

    return (
      <View style={styles.root}>
        <AmbientWeatherOverlay />
        <LinearGradient colors={['#100826', '#1a0d3a']} style={StyleSheet.absoluteFill} />

        <Animated.ScrollView
          style={{ opacity: fadeIn }}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backChip} onPress={() => setScreen('home')}>
              <Text style={styles.backChipText}>🏡 room</Text>
            </TouchableOpacity>
            <View style={[styles.privateBadge, { backgroundColor: 'rgba(20,12,40,0.7)', borderColor: pAccent + '66' }]}>
              <Text style={styles.privateBadgeText}>your space</Text>
            </View>
          </View>

          <Text style={[styles.screenTitle, { color: pAccent }]}>Bippin 2{'\n'}Parent 🌿</Text>
          <Text style={[styles.screenSub, { color: pSoft }]}>your journey in Bip. all yours.</Text>

          {/* Stats row */}
          <Animated.View style={[{ flexDirection: 'row', gap: 10, marginBottom: 20 }, cardStyle(card1)]}>
            {[
              { num: engagement.notesSent, label: 'notes sent',   color: pAccent },
              { num: engagement.daysActive, label: 'days active', color: pGreen  },
              { num: `${achieved}/${PARENT_MILESTONES.length}`, label: 'milestones', color: pAmber },
            ].map(s => (
              <View key={s.label} style={[pSt.statCard, { borderColor: s.color + '55' }]}>
                <Animated.Text style={[pSt.statNum, { color: s.color, transform: [{ scale: breathScale }] }]}>
                  {s.num}
                </Animated.Text>
                <Text style={[pSt.statLabel, { color: pSoft }]}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Tabs */}
          <Animated.View style={[{ flexDirection: 'row', gap: 8, marginBottom: 18 }, cardStyle(card2)]}>
            {(['journey', 'tips', 'note'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[pSt.tabBtn, parentTab === tab && { backgroundColor: pAccent + '33', borderColor: pAccent }]}
                onPress={() => setParentTab(tab)}
              >
                <Text style={[pSt.tabLabel, { color: parentTab === tab ? pAccent : pSoft + '88' }]}>
                  {tab === 'journey' ? 'Journey' : tab === 'tips' ? 'Tips' : 'Send Note'}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* Journey tab */}
          {parentTab === 'journey' && (
            <Animated.View style={cardStyle(card3)}>
              <Text style={[pSt.sectionNote, { color: pSoft + 'aa' }]}>
                Milestones you earn by being present in Bip.
              </Text>
              {PARENT_MILESTONES.map(m => {
                const done = m.check(engagement);
                return (
                  <View key={m.id} style={[pSt.milestoneCard, { borderColor: done ? pAccent + '88' : pSoft + '22', opacity: done ? 1 : 0.45 }]}>
                    <Animated.Text style={[{ fontSize: 26 }, done && { transform: [{ scale: breathScale }] }]}>
                      {m.emoji}
                    </Animated.Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[pSt.milestoneLabel, { color: done ? '#fff' : pSoft + '88' }]}>{m.label}</Text>
                      <Text style={[pSt.milestoneSub, { color: pSoft + '77' }]}>{m.sub}</Text>
                    </View>
                    {done && <Text style={[{ fontSize: 11, fontWeight: '700' }, { color: pGreen }]}>done</Text>}
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* Tips tab */}
          {parentTab === 'tips' && (
            <Animated.View style={cardStyle(card3)}>
              {PARENT_TIPS.map(tip => (
                <View key={tip.title} style={[pSt.tipCard, { borderColor: pAccent + '44' }]}>
                  <Text style={[pSt.tipTitle, { color: pAccent }]}>{tip.title}</Text>
                  <Text style={[pSt.tipBody, { color: pSoft }]}>{tip.body}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Send note tab */}
          {parentTab === 'note' && (
            <Animated.View style={cardStyle(card3)}>
              <View style={[pSt.noteInfo, { borderColor: pAccent + '44' }]}>
                <Text style={[pSt.noteInfoText, { color: pSoft }]}>
                  One-way warmth. Your teen sees it in their Bip space. You can't read their journal -- this is yours to give.
                </Text>
              </View>
              <Text style={[styles.cardLabel, { color: pSoft, marginBottom: 10 }]}>need a starting point?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {PARENT_STARTERS.map(s => (
                  <TouchableOpacity key={s} style={[pSt.starterChip, { borderColor: pAccent + '55' }]} onPress={() => setNoteMsg(s)}>
                    <Text style={[pSt.starterText, { color: pSoft }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {!noteSent ? (
                <>
                  <View style={[pSt.inputWrap, { borderColor: pAccent + '88' }]}>
                    <Text style={[pSt.inputPh, { color: noteMsg ? '#fff' : pSoft + '66' }]}>
                      {noteMsg || 'Write something warm...'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.accentBtn, { backgroundColor: noteMsg.trim() ? pAccent : 'rgba(60,30,80,0.5)', shadowColor: pAccent }]}
                    onPress={handleNote}
                    disabled={!noteMsg.trim() || noteSending}
                  >
                    <Text style={[styles.accentBtnText, { color: noteMsg.trim() ? pDeep : pSoft + '66' }]}>
                      {noteSending ? 'sending...' : 'send with love 💜'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[pSt.sentCard, { borderColor: pAccent + '55' }]}>
                  <Animated.Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 10, transform: [{ scale: breathScale }] }}>
                    {'💜'}
                  </Animated.Text>
                  <Text style={[pSt.sentTitle, { color: '#fff' }]}>Sent.</Text>
                  <Text style={[pSt.sentSub, { color: pSoft }]}>Your teen will see it as a warm note.</Text>
                  <TouchableOpacity style={[styles.accentBtn, { backgroundColor: pAccent, marginTop: 16 }]} onPress={() => setNoteSent(false)}>
                    <Text style={[styles.accentBtnText, { color: pDeep }]}>send another</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}

          <TouchableOpacity style={styles.ghostBtn} onPress={() => setScreen('home')}>
            <Text style={styles.ghostBtnText}>{'<- back to room'}</Text>
          </TouchableOpacity>

          <View style={{ height: 36 }} />
        </Animated.ScrollView>

        {BottomNav}
      </View>
    );
  }

  const handleChip = (key: string) => {
    const routes: Record<string, string> = {
      period:    'periodCalendar',
      cycle:     'periodCalendar',
      mood:      'calm',
      comfort:   'comfort',
      sekret:    'sekret',
      journal:   'pages',
      puberty:   'sekret',
      body:      'sekret',
      confidence:'bippin2',
      hygiene:   'sekret',
      mind:      'calm',
    };
    const route = routes[key];
    if (route) setScreen(route);
  };

  const scrapCard = (extra?: object) => [
    styles.scrapCard,
    { backgroundColor: 'rgba(30,18,55,0.78)', borderColor: glow + '88', shadowColor: glow },
    extra,
  ] as any;

  const accentBtn = (extra?: object) => [
    styles.accentBtn,
    { backgroundColor: idAccent, shadowColor: idAccent },
    extra,
  ] as any;

  const greeting = greetingByTime(time, charName, isManhoodChar);

  const streakLabel = isManhoodChar ? 'focus streak'     : 'connection streak';
  const streakSub   = isManhoodChar ? 'consistency builds confidence.' : "you're showing up for you.";
  const streakNote  = isManhoodChar ? 'respect, fr.' : 'proud of you 💜';

  const chips       = isManhoodChar ? M_CHIPS       : W_CHIPS;
  const moodChips   = isManhoodChar ? M_MOOD_CHIPS : W_MOOD_CHIPS;
  const bipFlow     = isManhoodChar ? M_BIP_FLOW   : W_BIP_FLOW;

  const cloudSpeech = isManhoodChar
    ? "yo. i'm here. what's on ya mind rn?"
    : "hey. whatever you're feeling right now ✨ it's valid 💜";

  return (
    <View style={styles.root}>
      <AmbientWeatherOverlay />
      <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.9)']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.bgGlow, { backgroundColor: glow, opacity: glowOpacity }]} />

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backChip} onPress={() => setScreen('home')}>
            <Text style={styles.backChipText}>🛡 room</Text>
          </TouchableOpacity>
          <View style={[styles.privateBadge, { backgroundColor: 'rgba(20,12,40,0.7)', borderColor: glow + '66' }]}>
            <Text style={styles.privateBadgeText}>🔒 private</Text>
          </View>
        </View>
        <Text style={[styles.screenTitle, { color: idAccent }]}>
          {isManhoodChar ? 'Bippin 2\nManhood 🪱' : 'Bippin 2\nWomanhood 🫶'}
        </Text>
        <Text style={[styles.screenSub, { color: idSoft }]}>
          {isManhoodChar ? 'growing into yourself. ⚡' : 'growing at your own pace. 💜'}
        </Text>

        {/* Phase 2: deep link to dedicated content layer */}
        <TouchableOpacity
          style={{ alignSelf: 'center', backgroundColor: idAccent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, marginBottom: 16, shadowColor: idAccent, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }}
          onPress={() => onOpenGuide ? onOpenGuide(isManhoodChar ? 'manhood' : 'womanhood') : setScreen(isManhoodChar ? 'manhood' : 'womanhood')}
        >
          <Text style={{ color: '#0a0420', fontWeight: '800', fontSize: 13 }}>
            {isManhoodChar ? 'open the manhood guide →' : 'open the womanhood guide →'}
          </Text>
        </TouchableOpacity>

        <Animated.View style={cardStyle(card1)}>
          <View style={styles.heroSection}>
            <Image source={art.hero} style={styles.heroArt} resizeMode="contain" />
            <View style={styles.heroRight}>
              <View style={scrapCard(styles.greetCard)}>
                <Text style={[styles.greetTitle, { color: idSoft }]}>{greeting.title}</Text>
                <Text style={styles.greetBody}>{greeting.body}</Text>
              </View>
              <Animated.View style={[styles.streakCard, { backgroundColor: 'rgba(20,12,40,0.78)', borderColor: glow + '88' }, { transform: [{ scale: breathScale }] }]}>
                <Text style={[styles.streakLabel, { color: idAccent }]}>{streakLabel}</Text>
                <View style={styles.streakRow}>
                  <Text style={styles.streakFlame}>{isManhoodChar ? (isRylane ? '🪱' : '🌙') : '🫀'}</Text>
                  <Text style={[styles.streakDays, { color: '#fff' }]}>{streakDays} days</Text>
                </View>
                <Text style={styles.streakSub}>{streakSub}</Text>
                <Text style={styles.streakNote}>{streakNote}</Text>
              </Animated.View>
            </View>
          </View>

          <View style={styles.cloudRow}>
            <Animated.Text style={[styles.cloudMascot, { transform: [{ scale: breathScale }] }]}>
              {isRylane ? '☁️' : '☁️'}
            </Animated.Text>
            <View style={[styles.cloudBubble, { backgroundColor: 'rgba(30,18,55,0.85)', borderColor: glow + '66' }]}>
              <Text style={styles.cloudText}>{cloudSpeech}</Text>
            </View>
            {/* Cloud mini sticker — Bippin BRB companion */}
            <MiniReactionSticker character="cloud" screenContext="bippinBRB" size={36} />
          </View>
        </Animated.View>

        <Animated.View style={cardStyle(card2)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {chips.map(chip => (
              <TouchableOpacity
                key={chip.key}
                style={[styles.featureChip, { backgroundColor: 'rgba(20,12,40,0.75)', borderColor: glow + '66' }]}
                onPress={() => handleChip(chip.key)}
              >
                <Text style={styles.chipEmoji}>{chip.emoji}</Text>
                <Text style={[styles.chipLabel, { color: idSoft }]}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* WOMANHOOD CARDS (Suhana only — no boy avatars here). */}
        <Animated.View style={cardStyle(card3)}>
          {!isManhoodChar && (
            <>
              <View style={scrapCard()}>
                <Text style={[styles.cardLabel, { color: idAccent }]}>first period support 🩸</Text>
                <View style={styles.periodCardInner}>
                  <View style={styles.periodCardText}>
                    <Text style={styles.cardBodyText}>it's okay to feel scared.</Text>
                    <Text style={styles.cardBodyText}>you're not alone, ever.</Text>
                    <TouchableOpacity
                      style={[styles.learnBtn, { borderColor: idAccent }]}
                      onPress={() => setScreen('periodCalendar')}
                    >
                      <Text style={[styles.learnBtnText, { color: idAccent }]}>learn more</Text>
                    </TouchableOpacity>
                  </View>
                  <Image source={art.thinking} style={styles.periodArt} resizeMode="contain" />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={[scrapCard(), styles.halfCard]}>
                  <Text style={[styles.cardLabel, { color: idAccent }]}>comfort tip 🌷</Text>
                  <Text style={styles.cardBodyText}>
                    warmth for cramps. water. rest. be gentle with yourself.
                  </Text>
                  <TouchableOpacity onPress={() => setScreen('comfort')}>
                    <Text style={[styles.linkText, { color: idAccent }]}>more tips 💬</Text>
                  </TouchableOpacity>
                </View>
                <View style={[scrapCard(), styles.halfCard]}>
                  <Text style={[styles.cardLabel, { color: idAccent }]}>cycle calendar 🗓️</Text>
                  <Text style={styles.cardBodyText}>
                    track your cycle. private. yours.
                  </Text>
                  <TouchableOpacity
                    style={accentBtn({ marginTop: 10 })}
                    onPress={() => setScreen('periodCalendar')}
                  >
                    <Text style={styles.accentBtnText}>view calendar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={scrapCard()}>
                <Text style={[styles.cardLabel, { color: idAccent }]}>mood + body check-in {charEmoji}</Text>
                <Text style={styles.cardBodyText}>how are you feeling right now?</Text>
                <View style={styles.moodRow}>
                  {moodChips.map(chip => {
                    const active = selectedMood === chip.label;
                    return (
                      <TouchableOpacity
                        key={chip.label}
                        style={[
                          styles.moodChip,
                          {
                            backgroundColor: active ? idAccent : 'rgba(20,12,40,0.6)',
                            borderColor: active ? idAccent : glow + '55',
                          },
                        ]}
                        onPress={() => setSelectedMood(active ? null : chip.label)}
                      >
                        <Text style={styles.moodEmoji}>{chip.emoji}</Text>
                        <Text style={[styles.moodLabel, { color: active ? '#fff' : idSoft }]}>
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedMood && (
                  <Text style={[styles.moodAck, { color: idSoft }]}>
                    {charEmoji} {charName} sees you. that's valid.
                  </Text>
                )}
              </View>
            </>
          )}

          {/* MANHOOD CARDS (Sy or Night). */}
          {isManhoodChar && (
            <>
              <View style={styles.threeColRow}>
                <View style={[scrapCard(), styles.thirdCard]}>
                  <Text style={[styles.cardLabel, { color: idAccent }]}>energy check 🪱</Text>
                  <Text style={styles.cardBodySmall}>how you feel rn?</Text>
                  <View style={styles.batteryOuter}>
                    <View style={[styles.batteryInner, { width: `${energyLevel}%`, backgroundColor: idAccent }]} />
                  </View>
                  <Text style={[styles.batteryLabel, { color: idSoft }]}>{energyLevel}% energy</Text>
                  <TouchableOpacity
                    style={[styles.learnBtn, { borderColor: idAccent, marginTop: 8 }]}
                    onPress={() => setScreen('calm')}
                  >
                    <Text style={[styles.learnBtnText, { color: idAccent }]}>check in</Text>
                  </TouchableOpacity>
                </View>

                <View style={[scrapCard(), styles.thirdCard]}>
                  <Text style={[styles.cardLabel, { color: idAccent }]}>sleep 😴</Text>
                  <Text style={styles.cardBodySmall}>how'd you sleep?</Text>
                  <Text style={styles.sleepBig}>😴</Text>
                  <Text style={styles.sleepTime}>{sleepHours}</Text>
                  <Text style={styles.cardBodySmall}>last night</Text>
                  <TouchableOpacity onPress={() => {}}>
                    <Text style={[styles.linkText, { color: idAccent }]}>track sleep 💤</Text>
                  </TouchableOpacity>
                </View>

                <View style={[scrapCard(), styles.thirdCard]}>
                  <Text style={[styles.cardLabel, { color: idAccent }]}>quick tip 🪞</Text>
                  <Text style={styles.cardBodySmall}>
                    small habits. big future. stay focused, stay you.
                  </Text>
                  <TouchableOpacity onPress={() => setScreen('calm')}>
                    <Text style={[styles.linkText, { color: idAccent }]}>more tips 💬</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={scrapCard()}>
                <View style={styles.goalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardLabel, { color: idAccent }]}>goal tracker 🏆</Text>
                    <Text style={styles.cardBodyText}>
                      track goals. level up. every day.
                    </Text>
                    <TouchableOpacity
                      style={accentBtn({ marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 18 })}
                      onPress={() => { onMilestone?.(); }}
                    >
                      <Text style={styles.accentBtnText}>view goals</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.goalTrophy}>🏆</Text>
                </View>
              </View>

              <View style={scrapCard()}>
                <Text style={[styles.cardLabel, { color: idAccent }]}>mood check {charEmoji}</Text>
                <Text style={styles.cardBodyText}>how are you feeling rn?</Text>
                <View style={styles.moodRow}>
                  {moodChips.map(chip => {
                    const active = selectedMood === chip.label;
                    return (
                      <TouchableOpacity
                        key={chip.label}
                        style={[
                          styles.moodChip,
                          {
                            backgroundColor: active ? idAccent : 'rgba(20,12,40,0.6)',
                            borderColor: active ? idAccent : glow + '55',
                          },
                        ]}
                        onPress={() => setSelectedMood(active ? null : chip.label)}
                      >
                        <Text style={styles.moodEmoji}>{chip.emoji}</Text>
                        <Text style={[styles.moodLabel, { color: active ? '#fff' : idSoft }]}>
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedMood && (
                  <Text style={[styles.moodAck, { color: idSoft }]}>
                    {charEmoji} {charName} got you. that's valid.
                  </Text>
                )}
              </View>
            </>
          )}
        </Animated.View>

        <Animated.View style={cardStyle(card4)}>
          {/* ── Bip Progress + Insights ──────────────────────────────────────── */}
          <View style={scrapCard()}>
            <Text style={[styles.cardLabel, { color: idAccent }]}>bip progress ✨</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <Animated.Text style={[{ fontSize: 30 }, { transform: [{ scale: breathScale }] }]}>
                {bipTier.emoji}
              </Animated.Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>{bipTotal}</Text>
                <Text style={{ color: bipTier.color, fontSize: 13, fontWeight: '800' }}>{bipTier.label}</Text>
              </View>
              <View style={{ backgroundColor: idAccent + '22', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: idAccent, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>pts</Text>
              </View>
            </View>
            <View style={{ height: 8, width: '100%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: 6 }}>
              <View style={{ height: '100%', width: `${bipProgress * 100}%` as any, backgroundColor: bipTier.color, borderRadius: 999 }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.52)', fontSize: 11, fontWeight: '600', marginBottom: 14 }}>
              {bipNextTier ? `${Math.max(0, bipNextTier.min - bipTotal)} until ${bipNextTier.label}` : 'you filled the whole sky ✨'}
            </Text>
            <Text style={[styles.cardBodySmall, { marginBottom: 8 }]}>your recent moods</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {BIP2_MOOD_HISTORY.map(m => (
                <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(20,12,40,0.65)', borderWidth: 1, borderColor: idAccent + '44', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 14 }}>{m.emoji}</Text>
                  <Text style={{ color: idSoft, fontSize: 11, fontWeight: '600' }}>{m.label}</Text>
                </View>
              ))}
            </View>

            {ledger.isLoaded && ledger.breakdown.some(row => row.count > 0) && (
              <>
                <Text style={[styles.cardBodySmall, { marginTop: 14, marginBottom: 8 }]}>where your points came from</Text>
                <View style={{ gap: 6 }}>
                  {ledger.breakdown.filter(row => row.count > 0).map(row => (
                    <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14 }}>{row.emoji}</Text>
                      <Text style={{ flex: 1, color: idSoft, fontSize: 12, fontWeight: '600' }}>{row.label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{row.count}×</Text>
                      <Text style={{ color: idAccent, fontSize: 12, fontWeight: '800', minWidth: 34, textAlign: 'right' }}>{row.pts}pt</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={scrapCard()}>
            <Text style={[styles.cardLabel, { color: idAccent }]}>
              BIP FLOW {isManhoodChar ? (isRylane ? '🪱' : '🌙') : '🫶'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flowScroll}
            >
              {bipFlow.map((item, i) => (
                <React.Fragment key={item.step}>
                  <View style={styles.flowStep}>
                    <View style={[styles.flowIconWrap, { backgroundColor: idAccent + '22', borderColor: idAccent + '66' }]}>
                      <Text style={styles.flowIcon}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.flowStepLabel, { color: '#fff' }]}>{item.step}</Text>
                    <Text style={[styles.flowStepSub, { color: idSoft }]}>{item.sub}</Text>
                  </View>
                  {i < bipFlow.length - 1 && (
                    <Text style={[styles.flowArrow, { color: idAccent }]}>➜</Text>
                  )}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>

          <View style={[scrapCard(), styles.quoteCard]}>
            <Image source={art.neutral} style={styles.quoteArt} resizeMode="contain" />
            <Text style={[styles.quoteText, { color: idSoft }]}>
              {isManhoodChar
                ? `"you don't gotta have it all figured out. just keep going. that's enough."`
                : `"you are allowed to be both a work in progress and a whole person right now."`}
            </Text>
            <Text style={[styles.quoteSig, { color: idAccent }]}>— {charName}</Text>
          </View>

          <View style={styles.stickyNote}>
            <Text style={styles.stickyText}>
              {isManhoodChar
                ? `”grow at your pace. no race. respect.”`
                : `”soft is strong. you're growing right on time.”`
              }
            </Text>
          </View>

          <TouchableOpacity
            style={accentBtn()}
            onPress={() => { onMilestone?.(); setScreen('sekret'); }}
          >
            <Text style={styles.accentBtnText}>
              {`talk to ${charName} ${charEmoji}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => setScreen('pages')}
          >
            <Text style={styles.ghostBtnText}>🔒 open private journal</Text>
          </TouchableOpacity>

          <View style={{ height: 36 }} />
        </Animated.View>
      </Animated.ScrollView>

      {BottomNav}
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#0e0820' },
  bgGlow:       {
    position: 'absolute', top: -100, alignSelf: 'center',
    width: 360, height: 360, borderRadius: 180,
  },
  container:    { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 58 : 38, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  backChip:      { backgroundColor: 'rgba(20,12,40,0.75)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  backChipText:   { color: '#cbb6f7', fontSize: 13, fontWeight: '600' },
  privateBadge:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  privateBadgeText:{ color: '#cbb6f7', fontSize: 12, fontWeight: '600' },
  screenTitle:    { fontSize: 32, fontWeight: 'bold', letterSpacing: 0.3, marginBottom: 4 },
  screenSub:      { fontSize: 14, marginBottom: 22, fontStyle: 'italic' },

  heroSection:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  heroArt:        { width: 120, height: 180, borderRadius: 18 },
  heroRight:      { flex: 1, gap: 10 },
  greetCard:      { marginBottom: 0 },
  greetTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  greetBody:      { color: '#e9defc', fontSize: 13, lineHeight: 20 },
  streakCard:     { padding: 12, borderRadius: 18, borderWidth: 1, shadowOpacity: 0.4, shadowRadius: 10 },
  streakLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  streakRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  streakFlame:    { fontSize: 20 },
  streakDays:     { fontSize: 22, fontWeight: 'bold' },
  streakSub:      { color: '#cbb6f7', fontSize: 11, marginBottom: 2 },
  streakNote:     { fontSize: 11, fontStyle: 'italic', color: '#fff' },

  cloudRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  cloudMascot:    { fontSize: 30 },
  cloudBubble:    { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, borderBottomLeftRadius: 4 },
  cloudText:      { color: '#e9defc', fontSize: 13, lineHeight: 19 },

  chipsScroll:    { paddingBottom: 4, gap: 10, marginBottom: 18 },
  featureChip:    {
    width: 84, padding: 10, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', gap: 4,
  },
  chipEmoji:      { fontSize: 22 },
  chipLabel:      { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  scrapCard:      {
    padding: 16, borderRadius: 22, marginBottom: 14, borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.32, shadowRadius: 10, elevation: 4,
  },
  cardLabel:      { fontSize: 15, fontWeight: '700', marginBottom: 8, letterSpacing: 0.2 },
  cardBodyText:   { color: '#e9defc', fontSize: 14, lineHeight: 21, marginBottom: 4 },
  cardBodySmall:  { color: '#cbb6f7', fontSize: 12, lineHeight: 18, marginBottom: 4 },
  linkText:       { fontSize: 13, fontWeight: '600', marginTop: 6 },
  learnBtn:       { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  learnBtnText:   { fontSize: 13, fontWeight: '600' },

  twoColRow:      { flexDirection: 'row', gap: 12, marginBottom: 14 },
  halfCard:       { flex: 1, marginBottom: 0 },
  threeColRow:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  thirdCard:      { flex: 1, marginBottom: 0, padding: 12 },

  periodCardInner:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  periodCardText: { flex: 1 },
  periodArt:      { width: 70, height: 80 },

  batteryOuter:   { height: 10, backgroundColor: 'rgba(20,12,40,0.8)', borderRadius: 6, marginVertical: 6, overflow: 'hidden' },
  batteryInner:   { height: '100%', borderRadius: 6 },
  batteryLabel:   { fontSize: 12, fontWeight: '700' },

  sleepBig:       { fontSize: 28, textAlign: 'center', marginVertical: 4 },
  sleepTime:      { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#fff' },

  goalRow:        { flexDirection: 'row', alignItems: 'center' },
  goalTrophy:     { fontSize: 52, marginLeft: 8 },

  moodRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  moodChip:       {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  moodEmoji:      { fontSize: 16 },
  moodLabel:      { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  moodAck:        { fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

  flowScroll:     { alignItems: 'center', gap: 6, paddingVertical: 8 },
  flowStep:       { alignItems: 'center', width: 72 },
  flowIconWrap:   { width: 48, height: 48, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  flowIcon:       { fontSize: 22 },
  flowStepLabel:  { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  flowStepSub:    { fontSize: 10, textAlign: 'center', marginTop: 2 },
  flowArrow:      { fontSize: 18, marginTop: -6, paddingHorizontal: 2 },

  quoteCard:      { alignItems: 'center', paddingVertical: 20 },
  quoteArt:       { width: 80, height: 80, marginBottom: 12 },
  quoteText:      { fontSize: 15, fontStyle: 'italic', textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  quoteSig:       { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },

  stickyNote:     { backgroundColor: '#fff8e7', borderColor: '#7c3aed', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 10, marginBottom: 14, transform: [{ rotate: '-2deg' }] },
  stickyText:     { color: '#3a2461', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },

  accentBtn:      {
    padding: 15, borderRadius: 18, alignItems: 'center', marginBottom: 12,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  accentBtnText:  { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  ghostBtn:       { backgroundColor: 'rgba(20,12,40,0.75)', padding: 13, borderRadius: 16, alignItems: 'center', marginBottom: 8 },
  ghostBtnText:   { color: '#cbb6f7', fontWeight: '600', fontSize: 14 },
});

const pSt = StyleSheet.create({
  statCard:      { flex: 1, backgroundColor: 'rgba(40,20,70,0.82)', borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  statNum:       { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  statLabel:     { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  tabBtn:        { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  tabLabel:      { fontSize: 12, fontWeight: '700' },
  sectionNote:   { fontSize: 12, marginBottom: 14, fontStyle: 'italic' },
  milestoneCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(40,20,70,0.75)', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  milestoneLabel:{ fontSize: 14, fontWeight: '700', marginBottom: 2 },
  milestoneSub:  { fontSize: 12, lineHeight: 17 },
  tipCard:       { backgroundColor: 'rgba(40,20,70,0.75)', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  tipTitle:      { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  tipBody:       { fontSize: 13, lineHeight: 21 },
  noteInfo:      { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  noteInfoText:  { fontSize: 13, lineHeight: 20 },
  starterChip:   { backgroundColor: 'rgba(40,20,70,0.8)', borderWidth: 1, borderRadius: 14, padding: 10, marginRight: 8, maxWidth: 220 },
  starterText:   { fontSize: 12, lineHeight: 18 },
  inputWrap:     { backgroundColor: 'rgba(40,20,70,0.8)', borderWidth: 1, borderRadius: 18, padding: 16, minHeight: 110, marginBottom: 10 },
  inputPh:       { fontSize: 14, lineHeight: 22 },
  sentCard:      { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 12 },
  sentTitle:     { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  sentSub:       { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
