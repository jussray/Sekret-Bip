// screens/SettingsScreen.tsx
// Se'kret Bip — Vibe Lab
// Choosing the emotional atmosphere of your room.

import React, { useState, useCallback } from 'react';
import {
  Text, TextInput, TouchableOpacity, ScrollView, ImageBackground,
  View, Image, StyleSheet, Platform, Dimensions, Alert, Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMAGES } from '../constants/theme';
import type { SleepWindow } from '../hooks/useSleepGuard';
import { createParentLink, redeemParentLink } from '@/utils/sync';
import { reportProblem } from '@/services/userReports';

const { width: W } = Dimensions.get('window');

// ── Vibe config — ties each theme key to room assets + color identity ────────

const VIBE_CONFIG: Record<string, {
  name: string; tagline: string; emoji: string;
  previewBg: any; glow: string; gtop: string; gbot: string;
}> = {
  raylene: {
    name: "Suhana's Room",  tagline: 'lavender · fairy lights · cozy bedroom',
    emoji: '💜', previewBg: IMAGES.bgRayleneRoomEvening,
    glow: '#e879f9', gtop: 'rgba(80,0,80,0.55)',  gbot: 'rgba(20,0,45,0.90)',
  },
  rylane: {
    name: "Sy's Space",  tagline: 'midnight blue · city lights · chill night',
    emoji: '⚡', previewBg: IMAGES.bgRylaneRoomNight,
    glow: '#4DA3FF', gtop: 'rgba(0,20,70,0.55)',  gbot: 'rgba(0,8,30,0.90)',
  },
  cloud: {
    name: "Cloud's World",   tagline: 'dreamy · lavender mist · floating calm',
    emoji: '☁️', previewBg: IMAGES.bgRayleneRoomDay,
    glow: '#a78bfa', gtop: 'rgba(40,20,80,0.45)', gbot: 'rgba(10,5,30,0.88)',
  },
  night: {
    name: 'Late Night',      tagline: 'deep violet · moonlight · just you and the stars',
    emoji: '🌙', previewBg: IMAGES.bgRayleneRoomDeepNight,
    glow: '#c4b5fd', gtop: 'rgba(20,10,50,0.45)', gbot: 'rgba(5,3,16,0.92)',
  },
  rain: {
    name: 'Rain Room',       tagline: 'window rain · muted blue · reflective mood',
    emoji: '🌧️', previewBg: IMAGES.bgRayleneRoomRain,
    glow: '#60a5fa', gtop: 'rgba(10,30,60,0.50)', gbot: 'rgba(5,14,28,0.90)',
  },
  sunset: {
    name: 'Sunset Vibe',     tagline: 'purple-orange sky · warm evening room',
    emoji: '🌅', previewBg: IMAGES.bgRylaneRoomEvening,
    glow: '#fb7185', gtop: 'rgba(80,20,40,0.50)', gbot: 'rgba(25,8,18,0.90)',
  },
};

// ── Companion profiles ───────────────────────────────────────────────────────

const SEKRET_PROFILES: Record<string, {
  name: string; emoji: string; title: string; tagline: string; avatar: any; accent: string;
}> = {
  soft:   {
    name: 'Suhana', emoji: '💜', title: 'Big Sis',
    tagline: 'warm, protective, emotionally real',
    avatar: IMAGES.rayleneNeutral, accent: '#e879f9',
  },
  rylane: {
    name: 'Sy',  emoji: '⚡', title: 'Loyal Bro',
    tagline: 'street smart, down to earth, no cap',
    avatar: IMAGES.rylaneNeutral, accent: '#4DA3FF',
  },
};

// ── Mode buttons ─────────────────────────────────────────────────────────────

const SEKRET_MODES: Record<string, { emoji: string; label: string }> = {
  soft:     { emoji: '🌙', label: 'Soft' },
  realTalk: { emoji: '🧠', label: 'Real Talk' },
  distract: { emoji: '😂', label: 'Distract' },
  listen:   { emoji: '☁️', label: 'Just Listen' },
  push:     { emoji: '🔥', label: 'Push Me' },
};

// ── Props ────────────────────────────────────────────────────────────────────

interface SettingsScreenProps {
  t:                  Record<string, any>;
  theme:              string;
  setTheme:           (theme: string) => void;
  selectedSekret:     string;
  setSelectedSekret:  (key: string) => void;
  sekretMode:         string;
  setSekretMode:      (mode: string) => void;
  userSide:           string;
  setUserSide:        (side: string) => void;
  parentRoomStyle?:   string;
  setParentRoomStyle?:(style: string) => void;
  setScreen:          (screen: string) => void;
  BottomNav:          React.ReactNode;
  mood?:              string;
  sleepWindow?:       SleepWindow | null;
  setSleepWindow?:    (w: SleepWindow | null) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SettingsScreen({
  t, theme, setTheme,
  selectedSekret, setSelectedSekret,
  sekretMode, setSekretMode,
  userSide, setUserSide,
  parentRoomStyle, setParentRoomStyle,
  setScreen, BottomNav,
  sleepWindow, setSleepWindow,
}: SettingsScreenProps) {

  const [inviteCode,    setInviteCode]    = useState('');
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [codeInput,     setCodeInput]     = useState('');
  const [redeemStatus,  setRedeemStatus]  = useState<'idle' | 'ok' | 'not_found' | 'error'>('idle');
  const [isRedeeming,   setIsRedeeming]   = useState(false);

  const [reportNote,    setReportNote]    = useState('');
  const [reportStatus,  setReportStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [reportMessage, setReportMessage] = useState('');

  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true);
    const code = await createParentLink();
    setIsGenerating(false);
    if (code) setInviteCode(code);
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    Alert.alert('Copied!', `Share this code with your parent:\n\n${inviteCode}`);
  }, [inviteCode]);

  const handleRedeemCode = useCallback(async () => {
    if (!codeInput.trim()) return;
    setIsRedeeming(true);
    setRedeemStatus('idle');
    const result = await redeemParentLink(codeInput.trim());
    setIsRedeeming(false);
    setRedeemStatus(result);
    if (result === 'ok') setCodeInput('');
  }, [codeInput]);

  const handleSubmitReport = useCallback(async () => {
    if (!reportNote.trim() || reportStatus === 'sending') return;
    setReportStatus('sending');
    const result = await reportProblem(reportNote, 'Settings');
    if (result.reported) {
      setReportStatus('sent');
      setReportMessage(result.message === 'already reported' ? "You've already flagged this — thank you." : 'Thanks — this was sent to the team.');
      setReportNote('');
    } else {
      setReportStatus('error');
      setReportMessage(result.message || 'Something went wrong — try again in a moment.');
    }
  }, [reportNote, reportStatus]);

  const handleClearLocalData = () => {
    Alert.alert(
      'Clear everything saved on this device?',
      "This wipes your journal, moods, voice bips, and Circle drafts that live only on this phone. If something was synced, it stays safe in your account — this just clears what's local.",
      [
        { text: 'Never mind', style: 'cancel' },
        {
          text: 'Clear it',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Done', "This device's local data is cleared. 💜");
            } catch {
              Alert.alert("Couldn't clear it", 'Something blocked the clear — try again in a bit.');
            }
          },
        },
      ],
    );
  };

  const vibe   = VIBE_CONFIG[theme] || VIBE_CONFIG.raylene;
  const glow   = vibe.glow;
  const cardBg = 'rgba(10,6,24,0.72)';

  const glass = (extra?: object) => [
    styles.glassCard,
    { backgroundColor: cardBg, borderColor: glow + '44' },
    extra,
  ] as any;

  return (
    <View style={styles.root}>
      {/* Atmospheric room background */}
      <ImageBackground
        source={vibe.previewBg}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(5,3,14,0.68)", "rgba(8,4,20,0.84)", "rgba(3,2,10,0.96)"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Vibe Lab ✨</Text>
          <Text style={styles.subtitle}>Choose the feeling of your room.</Text>
        </View>

        {/* ── ACTIVE VIBE HERO ── */}
        <View style={[styles.heroWrap, { borderColor: glow + '70' }]}>
          <ImageBackground
            source={vibe.previewBg}
            style={styles.heroBg}
            resizeMode="cover"
            borderRadius={22}
          >
            <LinearGradient
              colors={[vibe.gtop, vibe.gbot] as any}
              style={styles.heroOverlay}
            >
              <Text style={styles.heroEmoji}>{vibe.emoji}</Text>
              <Text style={[styles.heroName, { color: glow }]}>{vibe.name}</Text>
              <Text style={styles.heroTagline}>{vibe.tagline}</Text>
              <View style={[styles.activePill, { borderColor: glow + '99', backgroundColor: glow + '22' }]}>
                <Text style={[styles.activePillText, { color: glow }]}>active vibe</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* ── VIBE PICKER ── */}
        <Text style={styles.sectionLabel}>Pick Your Vibe</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vibeRow}
          style={{ marginBottom: 20 }}
        >
          {Object.entries(VIBE_CONFIG).map(([key, cfg]) => {
            const active = theme === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setTheme(key)}
                activeOpacity={0.8}
                style={[
                  styles.vibeCard,
                  { borderColor: active ? cfg.glow : 'rgba(120,80,160,0.25)', borderWidth: active ? 2.5 : 1 },
                ]}
              >
                <ImageBackground
                  source={cfg.previewBg}
                  style={styles.vibeCardBg}
                  resizeMode="cover"
                  borderRadius={16}
                >
                  <LinearGradient
                    colors={[cfg.gtop, cfg.gbot] as any}
                    style={styles.vibeCardGradient}
                  >
                    <Text style={styles.vibeEmoji}>{cfg.emoji}</Text>
                    <Text style={[styles.vibeName, { color: active ? cfg.glow : '#e2d8ff' }]}>
                      {cfg.name}
                    </Text>
                    {active && (
                      <View style={[styles.vibeActiveDot, { backgroundColor: cfg.glow }]} />
                    )}
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── YOUR SE'KRET ── */}
        <Text style={styles.sectionLabel}>Your Se'kret</Text>
        {Object.entries(SEKRET_PROFILES).map(([key, profile]) => {
          const active = selectedSekret === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedSekret(key)}
              activeOpacity={0.8}
              style={[
                styles.companionCard,
                {
                  backgroundColor: active ? profile.accent + '18' : cardBg,
                  borderColor: active ? profile.accent + '99' : 'rgba(120,80,160,0.28)',
                },
              ]}
            >
              <Image source={profile.avatar} style={styles.companionAvatar} resizeMode="contain" />
              <View style={styles.companionInfo}>
                <Text style={[styles.companionName, { color: active ? profile.accent : '#fff' }]}>
                  {profile.emoji} {profile.name}
                </Text>
                <Text style={styles.companionTitle}>{profile.title}</Text>
                <Text style={styles.companionTagline}>{profile.tagline}</Text>
              </View>
              {active && (
                <View style={[styles.checkBadge, { backgroundColor: profile.accent }]}>
                  <Text style={styles.checkBadgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── SE'KRET MODE ── */}
        <Text style={styles.sectionLabel}>Se'kret Mode</Text>
        <View style={glass({ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 18 })}>
          {Object.entries(SEKRET_MODES).map(([key, mode]) => {
            const active = sekretMode === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSekretMode(key)}
                style={[
                  styles.modePill,
                  {
                    borderColor: active ? glow : 'rgba(150,110,210,0.3)',
                    backgroundColor: active ? glow + '22' : 'rgba(20,10,40,0.5)',
                  },
                ]}
              >
                <Text style={styles.modePillEmoji}>{mode.emoji}</Text>
                <Text style={[styles.modePillLabel, { color: active ? glow : '#c4b5fd' }]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── ACCOUNT SIDE ── */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={glass({ flexDirection: 'row', gap: 10 })}>
          {([['teen', '🧑', 'Teen Side'], ['parent', '👨‍👩‍👧', 'Parent']] as const).map(([side, ico, label]) => {
            const active = userSide === side;
            return (
              <TouchableOpacity
                key={side}
                onPress={() => setUserSide(side)}
                style={[
                  styles.sideBtn,
                  {
                    borderColor: active ? glow : 'rgba(150,110,210,0.3)',
                    backgroundColor: active ? glow + '22' : 'rgba(20,10,40,0.5)',
                    flex: 1,
                  },
                ]}
              >
                <Text style={styles.sideBtnIcon}>{ico}</Text>
                <Text style={[styles.sideBtnLabel, { color: active ? glow : '#c4b5fd' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── PARENT ROOM STYLE ── */}
        {userSide === 'parent' && setParentRoomStyle && (
          <>
            <Text style={styles.sectionLabel}>Parent Room</Text>
            <View style={glass({ flexDirection: 'row', gap: 10 })}>
              {([['mom', '💜', 'Mom Room'], ['dad', '👑', 'Dad Room']] as const).map(([style, ico, label]) => {
                const active = parentRoomStyle === style;
                return (
                  <TouchableOpacity
                    key={style}
                    onPress={() => setParentRoomStyle(style)}
                    style={[
                      styles.sideBtn,
                      {
                        borderColor: active ? glow : 'rgba(150,110,210,0.3)',
                        backgroundColor: active ? glow + '22' : 'rgba(20,10,40,0.5)',
                        flex: 1,
                      },
                    ]}
                  >
                    <Text style={styles.sideBtnIcon}>{ico}</Text>
                    <Text style={[styles.sideBtnLabel, { color: active ? glow : '#c4b5fd' }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── SLEEP HOURS ── */}
        {setSleepWindow && (
          <>
            <Text style={styles.sectionLabel}>Sleep Hours</Text>
            <View style={glass({ gap: 10 })}>
              <Text style={styles.privacyText}>
                During sleep hours, Comfort always stays open — everything else gently waits till morning.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {([
                  ['Off', null],
                  ['10pm – 7am', { start: '22:00', end: '07:00' } as SleepWindow],
                  ['11pm – 8am', { start: '23:00', end: '08:00' } as SleepWindow],
                ] as const).map(([label, w]) => {
                  const active = w === null ? !sleepWindow : (sleepWindow?.start === w.start && sleepWindow?.end === w.end);
                  return (
                    <TouchableOpacity
                      key={label}
                      onPress={() => setSleepWindow(w)}
                      style={[
                        styles.modePill,
                        {
                          borderColor: active ? glow : 'rgba(150,110,210,0.3)',
                          backgroundColor: active ? glow + '22' : 'rgba(20,10,40,0.5)',
                        },
                      ]}
                    >
                      <Text style={[styles.modePillLabel, { color: active ? glow : '#c4b5fd' }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* ── DATA & PRIVACY ── */}
        <Text style={styles.sectionLabel}>Data & Privacy</Text>
        <View style={glass({ gap: 10 })}>
          <Text style={styles.privacyText}>
            🔒 <Text style={styles.privacyStrong}>Private to you</Text> — your journal, moods, and voice bips stay yours unless you choose to share them.
          </Text>
          <Text style={styles.privacyText}>
            👀 <Text style={styles.privacyStrong}>Shareable</Text> — Circle posts and anything you mark "share with parent" can be seen by the people you pick. Nothing sends unless you choose.
          </Text>
          <Text style={styles.privacyText}>
            ☁️ <Text style={styles.privacyStrong}>Syncs when possible</Text> — if you're signed in and online, your stuff backs up safely. If not, it just stays saved on this device.
          </Text>
          <TouchableOpacity
            onPress={handleClearLocalData}
            style={[styles.sideBtn, { borderColor: 'rgba(248,113,113,0.45)', backgroundColor: 'rgba(248,113,113,0.12)', marginTop: 4 }]}
          >
            <Text style={[styles.sideBtnLabel, { color: '#f87171' }]}>🗑️ Clear data on this device</Text>
          </TouchableOpacity>
        </View>

        {/* ── REPORT A PROBLEM ── */}
        <Text style={styles.sectionLabel}>Report a Problem</Text>
        <View style={glass({ gap: 10 })}>
          <Text style={styles.privacyText}>
            Something feel broken or off? Tell us what happened — it goes straight to the team, private and just from you.
          </Text>
          <TextInput
            style={[styles.noteInput, { borderColor: glow + '66', color: '#fff' }]}
            placeholder="what happened?"
            placeholderTextColor="#7c6899"
            multiline
            numberOfLines={3}
            maxLength={240}
            value={reportNote}
            onChangeText={v => { setReportNote(v); if (reportStatus !== 'sending') setReportStatus('idle'); }}
          />
          {reportStatus === 'sent' && (
            <Text style={[styles.privacyText, { color: '#34d399' }]}>✓ {reportMessage}</Text>
          )}
          {reportStatus === 'error' && (
            <Text style={[styles.privacyText, { color: '#f87171' }]}>{reportMessage}</Text>
          )}
          <TouchableOpacity
            onPress={handleSubmitReport}
            disabled={reportStatus === 'sending' || !reportNote.trim()}
            style={[styles.sideBtn, { borderColor: glow + '88', backgroundColor: glow + '20', opacity: reportNote.trim() ? 1 : 0.5 }]}
          >
            <Text style={[styles.sideBtnLabel, { color: glow }]}>
              {reportStatus === 'sending' ? 'sending…' : '📨 send report'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── PARENT LINK (teen side) ── */}
        {userSide === 'teen' && (
          <>
            <Text style={styles.sectionLabel}>Connect to a Parent</Text>
            <View style={glass({ gap: 12 })}>
              <Text style={styles.privacyText}>
                Generate a 6-letter code and share it with your parent. They enter it on their side to create a private link.
              </Text>
              {inviteCode ? (
                <TouchableOpacity onPress={handleCopyCode} style={[styles.codeBox, { borderColor: glow + '88' }]}>
                  <Text style={[styles.codeText, { color: glow }]}>{inviteCode}</Text>
                  <Text style={[styles.codeCopyHint, { color: glow + 'bb' }]}>tap to copy</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleGenerateCode}
                  disabled={isGenerating}
                  style={[styles.sideBtn, { borderColor: glow + '88', backgroundColor: glow + '20' }]}
                >
                  <Text style={[styles.sideBtnLabel, { color: glow }]}>
                    {isGenerating ? 'generating…' : '🔗 generate code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── PARENT LINK (parent side) ── */}
        {userSide === 'parent' && (
          <>
            <Text style={styles.sectionLabel}>Connect to Your Teen</Text>
            <View style={glass({ gap: 12 })}>
              <Text style={styles.privacyText}>
                Ask your teen to generate a code in their settings, then enter it here to create a private link.
              </Text>
              <TextInput
                style={[styles.codeInput, { borderColor: glow + '66', color: '#fff' }]}
                placeholder="enter 6-letter code"
                placeholderTextColor="#7c6899"
                autoCapitalize="characters"
                maxLength={6}
                value={codeInput}
                onChangeText={v => { setCodeInput(v); setRedeemStatus('idle'); }}
              />
              {redeemStatus === 'ok' && (
                <Text style={[styles.privacyText, { color: '#34d399' }]}>✓ Linked! You're now connected.</Text>
              )}
              {redeemStatus === 'not_found' && (
                <Text style={[styles.privacyText, { color: '#f87171' }]}>Code not found or already used — check with your teen.</Text>
              )}
              {redeemStatus === 'error' && (
                <Text style={[styles.privacyText, { color: '#f87171' }]}>Something went wrong — try again in a moment.</Text>
              )}
              <TouchableOpacity
                onPress={handleRedeemCode}
                disabled={isRedeeming || !codeInput.trim()}
                style={[styles.sideBtn, { borderColor: glow + '88', backgroundColor: glow + '20', opacity: codeInput.trim() ? 1 : 0.5 }]}
              >
                <Text style={[styles.sideBtnLabel, { color: glow }]}>
                  {isRedeeming ? 'linking…' : '🔗 link to teen'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── DONE ── */}
        <TouchableOpacity
          style={[
            styles.doneBtn,
            { borderColor: glow + '88', backgroundColor: glow + '20', shadowColor: glow },
          ]}
          onPress={() => setScreen('home')}
        >
          <Text style={[styles.doneBtnText, { color: glow }]}>Done ✓</Text>
        </TouchableOpacity>
        <View style={{ height: 110 }} />
      </ScrollView>

      {BottomNav}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#060210' },
  container: { flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 16, paddingBottom: 120, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  header:    { alignItems: 'center', marginBottom: 22 },
  title:     { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 0.5, marginBottom: 6 },
  subtitle:  { fontSize: 14, color: '#b0a8d4', fontStyle: 'italic' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#9b8ec4', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  // Hero active vibe
  heroWrap:    { borderRadius: 22, borderWidth: 1.5, overflow: 'hidden', marginBottom: 24, height: 210 },
  heroBg:      { flex: 1 },
  heroOverlay: { flex: 1, padding: 22, justifyContent: 'flex-end' },
  heroEmoji:   { fontSize: 32, marginBottom: 4 },
  heroName:    { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  heroTagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 12, lineHeight: 18 },
  activePill:  { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  activePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  // Vibe picker
  vibeRow:     { paddingLeft: 2, paddingRight: 16, gap: 10, flexDirection: 'row' },
  vibeCard:    { width: W * 0.38, height: 170, borderRadius: 16, overflow: 'hidden' },
  vibeCardBg:  { flex: 1 },
  vibeCardGradient: { flex: 1, padding: 12, justifyContent: 'flex-end' },
  vibeEmoji:   { fontSize: 22, marginBottom: 4 },
  vibeName:    { fontSize: 12, fontWeight: '800', lineHeight: 16 },
  vibeActiveDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },

  // Glass card
  glassCard:   { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },

  // Privacy copy
  privacyText:   { fontSize: 13, color: '#c4b5fd', lineHeight: 19 },
  privacyStrong: { fontWeight: '800', color: '#e2d8ff' },

  // Companion cards
  companionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  companionAvatar: { width: 64, height: 80, borderRadius: 12, marginRight: 14 },
  companionInfo: { flex: 1 },
  companionName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  companionTitle:{ fontSize: 12, color: '#9b8ec4', marginBottom: 4 },
  companionTagline: { fontSize: 12, color: '#c4b5fd', lineHeight: 17 },
  checkBadge:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  checkBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  // Mode pills
  modePill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 30, borderWidth: 1, gap: 6 },
  modePillEmoji: { fontSize: 15 },
  modePillLabel: { fontSize: 12, fontWeight: '700' },

  // Side buttons
  sideBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 18, borderWidth: 1 },
  sideBtnIcon: { fontSize: 18 },
  sideBtnLabel:{ fontSize: 13, fontWeight: '700' },

  // Parent link
  codeBox:      { alignItems: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  codeText:     { fontSize: 32, fontWeight: '900', letterSpacing: 6 },
  codeCopyHint: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  codeInput:    { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20, fontWeight: '700', letterSpacing: 4, textAlign: 'center', backgroundColor: 'rgba(20,10,40,0.5)' },
  noteInput:    { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, lineHeight: 19, textAlign: 'left', textAlignVertical: 'top', minHeight: 72, backgroundColor: 'rgba(20,10,40,0.5)' },

  // Done
  doneBtn:     { marginTop: 8, marginBottom: 4, paddingVertical: 16, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  doneBtnText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});
