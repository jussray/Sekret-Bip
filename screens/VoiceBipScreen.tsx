// screens/VoiceBipScreen.tsx
// Se'kret Bip — Voice Bip (Headphone Cloud)
// Vision: Speak it out loud. Cloud floats here. Listening without judgment.
// Cousin energy, soft purple night. The mic is a release valve, not a stage.
//
// Polish pass (2026-06-07):
//   - Time-of-day backdrop via getRoomBg(character, time) — 4 phases
//   - Real LinearGradient scrim (top + bottom fade)
//   - Cloud companion drifts above the room with breath loop
//   - Character-aware copy: Suhana soft / Sy direct / Cloud quiet
//   - Tips list adapts per companion
//   - Listening pill mirrors JournalScreen pattern (breath loop)
//   - Sticky-note hint ("tap the mic") with -2deg tilt
//   - Reply card credits the active avatar registry identity
//   - VoiceNote type properly imported
//   - Curly quotes throughout
//
// Previous fixes preserved: A1 (onSave), A4 (char-aware badge), B1 (box-none),
// B2 (none on hint), B3 (heroArt overlay), D1 (archive count + link)

import React, { useState, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGES, getRoomPhase, getRoomScene, type TimeOfDay } from '../constants/theme';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import {
  VOICE_BIP_AVATARS,
  VOICE_BIP_AVATAR_KEYS,
  normalizeVoiceBipAvatar,
  type VoiceBipAvatarKey,
} from '../constants/voiceBip';
import { useVoiceCompanion } from '../hooks/useVoiceCompanion';
import { SyncBadge, type SyncStatus } from '../components/SyncBadge';
import type { VoiceNote } from '../types/bridge';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { fetchSekretReply, fetchSekretVoice, fetchSekretTranscribe } from '../utils/api';
import { useVoiceBipIntelligence } from '../hooks/useVoiceBipIntelligence';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { OracleJournalEntry } from '../types/voiceIntelligence';
import type { OracleProfile, OracleSide } from '../services/oracleDiscovery';
import {
  Text, TouchableOpacity, ScrollView, View,
  Animated, Image, StyleSheet, Easing,
  type DimensionValue, Platform,
} from 'react-native';
import { PresenceAvatar } from '../components/PresenceAvatar';
import { usePresence } from '../hooks/usePresence';
import {
  getPresenceTime,
  PRESENCE_TIME_BADGE,
} from '../constants/presence/timeOfDay';
import { toPresenceCharacter } from '../constants/presence/avatarStates';
import { PRESENCE_MOTION } from '../src/motion/presenceMotion';

// ── DEBUG ──────────────────────────────────────────────────────────────────
const DEBUG_HOTSPOTS = false;

// ── ASSETS ─────────────────────────────────────────────────────────────────
const CLOUD_HP = IMAGES.cloudHeadphones;

// ── HOTSPOTS ───────────────────────────────────────────────────────────────
type Hotspot = {
  top?: DimensionValue; bottom?: DimensionValue;
  left?: DimensionValue; right?: DimensionValue;
  width: DimensionValue; height: DimensionValue;
  label: string;
};
const HOTSPOTS: Record<'microphone' | 'journal' | 'window' | 'crystalJar', Hotspot> = {
  microphone: { top: '18%',    left: '30%',  width: '22%', height: '28%', label: 'Mic 🎙️' },
  journal:    { bottom: '4%',  left: '16%',  width: '44%', height: '22%', label: 'Journal 📖' },
  window:     { top: '4%',     right: '2%',  width: '38%', height: '40%', label: 'Window 🌙' },
  crystalJar: { bottom: '4%',  right: '2%',  width: '18%', height: '22%', label: 'Saved 💎' },
};

// ── BIP TYPE MENU ──────────────────────────────────────────────────────────
const BIP_TYPES = [
  { id: 'voice', emoji: '🎙️', label: 'Voice Bip',  sub: 'say it out loud' },
  { id: 'video', emoji: '📹', label: 'Video Bip',  sub: '30–60 seconds' },
  { id: 'text',  emoji: '✍️', label: 'Text Bip',   sub: 'write it out' },
  { id: 'cloud', emoji: '☁️', label: 'Cloud Bip',  sub: 'send to the clouds' },
];

// ── TIME OF DAY ────────────────────────────────────────────────────────────
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5  && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

const TIME_BADGE: Record<TimeOfDay, string> = {
  morning: '☀️ morning',
  day:     '🌤️ day',
  evening: '🌆 evening',
  night:   '🌙 night',
};

// ── Props ──────────────────────────────────────────────────────────────────
interface VoiceBipScreenProps {
  theme:          Record<string, any>;
  setScreen:      (screen: string) => void;
  selectedSekret: string;
  onSelectAvatar?: (avatarKey: VoiceBipAvatarKey) => void;
  weatherMode?: string;
  voiceNotes:     VoiceNote[];
  setVoiceNotes:  (notes: VoiceNote[] | ((prev: VoiceNote[]) => VoiceNote[])) => void;
  onSave?:        (note: VoiceNote) => void;
  mood?:          string;
  companion?:     {
    presenceMessage: string;
  };
  BottomNav: React.ReactNode;
  privateProfile?: OracleProfile;
  profileSide?: OracleSide;
  oracleJournalEntries?: readonly OracleJournalEntry[];
  onStoreOracleMemory?: (entry: OracleJournalEntry) => void;
  syncStatus?: SyncStatus;
}

// ── COMPONENT ──────────────────────────────────────────────────────────────
export function VoiceBipScreen({
  theme, setScreen, selectedSekret, onSelectAvatar, weatherMode, voiceNotes, setVoiceNotes, onSave, mood, companion, BottomNav, privateProfile, profileSide = 'teen',
  oracleJournalEntries, onStoreOracleMemory, syncStatus,
}: VoiceBipScreenProps) {

  const voiceHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const reduceMotion = useReducedMotion();

  const [showBipMenu,      setShowBipMenu]      = useState(false);
  const [showArchive,      setShowArchive]       = useState(false);
  const [voicePromptIdx,   setVoicePromptIdx]    = useState(0);
  const [isRecording,      setIsRecording]       = useState(false);
  const [isRecordingStarting, setIsRecordingStarting] = useState(false);
  const [recorded,         setRecorded]          = useState(false);
  const [sekretReply,      setSekretReply]       = useState('');
  const [replyAudioUri,    setReplyAudioUri]     = useState('');
  const [isVoiceLoading,   setIsVoiceLoading]    = useState(false);
  const [isThinking,       setIsThinking]        = useState(false);
  const [recordingTime,    setRecordingTime]     = useState(0);
  const [selectedBipType,  setSelectedBipType]   = useState<string | null>(null);
  const [transcriptFailed, setTranscriptFailed]  = useState(false);

  const recordingRef    = useRef<Audio.Recording | null>(null);
  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<any>(null);
  const glowLoop  = useRef<any>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cloud drift + breath
  const cloudFloat = useRef(new Animated.Value(0)).current;
  const cloudBreath = useRef(new Animated.Value(0)).current;
  // Listening pill breath
  const pillBreath = useRef(new Animated.Value(0)).current;

  // Waveform — 12 bars
  const waveAnims = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(0.3))
  ).current;
  const waveLoop = useRef<any>(null);

  // Avatar identity and room phase come from normalized registries. Oracle
  // context can inform replies, but no Oracle identity is exposed in this UI.
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = getTimeOfDay(hour);
  const roomPhase = getRoomPhase(now, weatherMode);
  const isNight = roomPhase === 'night' || roomPhase === 'deepNight';
  const avatarKey = normalizeVoiceBipAvatar(selectedSekret);
  const avatar = VOICE_BIP_AVATARS[avatarKey];
  const presenceCharacter = toPresenceCharacter(avatarKey);
  const presenceTime = getPresenceTime(hour, { isRaining: weatherMode === 'rain' });
  const presence = usePresence({ character: presenceCharacter, time: presenceTime });
  const roomArt = getRoomScene(avatarKey, roomPhase);
  const heroArt = isNight ? avatar.heroArt.night : avatar.heroArt.day;
  const { prepareVoiceSession } = useVoiceCompanion({
    avatarKey,
    personality: avatar.personality,
    mood: mood || 'calm',
    voiceId: avatar.voiceId,
  });
  const { prepareIntelligence } = useVoiceBipIntelligence({
    avatarKey,
    side: profileSide,
    mood,
    privateProfile,
    oracleJournalEntries,
    onStoreOracleMemory,
  });

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Cloud + presence-pill ambience follows the same accessibility authority as
  // the avatar. Reduced motion keeps the room expressive but physically still.
  useEffect(() => {
    cloudFloat.stopAnimation();
    cloudBreath.stopAnimation();
    pillBreath.stopAnimation();
    cloudFloat.setValue(0);
    cloudBreath.setValue(0);
    pillBreath.setValue(0);

    if (reduceMotion) return undefined;

    const loopValue = (value: Animated.Value, duration: number) => Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );

    const loops = [
      loopValue(cloudFloat, PRESENCE_MOTION.cloudFloatDurationMs),
      loopValue(cloudBreath, PRESENCE_MOTION.cloudBreathDurationMs),
      loopValue(pillBreath, PRESENCE_MOTION.pillBreathDurationMs),
    ];
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [cloudBreath, cloudFloat, pillBreath, reduceMotion]);

  const cloudStyle = reduceMotion ? {
    transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
    opacity: 1,
  } : {
    transform: [
      { translateX: cloudFloat.interpolate({ inputRange: [0, 1], outputRange: PRESENCE_MOTION.cloudTranslateX }) },
      { translateY: cloudFloat.interpolate({ inputRange: [0, 1], outputRange: PRESENCE_MOTION.cloudTranslateY }) },
      { scale: cloudBreath.interpolate({ inputRange: [0, 1], outputRange: PRESENCE_MOTION.cloudScale }) },
    ],
    opacity: cloudBreath.interpolate({ inputRange: [0, 1], outputRange: PRESENCE_MOTION.cloudOpacity }),
  };
  const pillStyle = reduceMotion ? {
    opacity: 1,
    transform: [{ scale: 1 }],
  } : {
    opacity: pillBreath.interpolate({ inputRange: [0, 1], outputRange: PRESENCE_MOTION.pillOpacity }),
    transform: [{ scale: pillBreath.interpolate({ inputRange: [0, 1], outputRange: PRESENCE_MOTION.pillScale }) }],
  };

  const startRecording = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;

    setIsRecordingStarting(true);
    setIsRecording(true);
    setRecorded(false);
    setSekretReply('');
    setReplyAudioUri('');
    setRecordingTime(0);
    setTranscriptFailed(false);
    setShowBipMenu(false);
    prepareVoiceSession('voice');
    presence.beginListening();

    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();

    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
      ])
    );
    glowLoop.current.start();

    waveLoop.current = Animated.loop(
      Animated.stagger(80,
        waveAnims.map(anim =>
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.2 + Math.random() * 0.8,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2 + Math.random() * 0.4,
              duration: 200 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        )
      )
    );
    waveLoop.current.start();

    timerRef.current = setInterval(() => {
      setRecordingTime(t => t + 1);
    }, 1000);

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    recordingRef.current = recording;
    setIsRecordingStarting(false);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setRecorded(true);

    pulseLoop.current?.stop();
    glowLoop.current?.stop();
    waveLoop.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);

    pulseAnim.setValue(1);
    glowAnim.setValue(0);
    waveAnims.forEach(a => a.setValue(0.3));

    // Stop the real recording and transcribe
    let transcript: string | null = null;
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        // Android E_AUDIO_NODATA: Stop tapped before any audio data was captured
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (uri) {
        try {
          const fetchRes = await fetch(uri);
          const blob = await fetchRes.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              resolve(dataUrl.split(',')[1] ?? '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          transcript = await fetchSekretTranscribe({ audioBase64: base64, contentType: blob.type || 'audio/m4a' });
        } catch {
          setTranscriptFailed(true);
        }
      }
    }

    const noteId = Date.now();
    const intelligence = prepareIntelligence(noteId, transcript);
    const note: VoiceNote = {
      id: noteId,
      title: selectedBipType ? `${selectedBipType} Bip` : 'Voice Bip',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: formatTime(recordingTime),
      type: (selectedBipType || 'voice') as VoiceNote['type'],
      avatarKey,
      transcriptId: intelligence.transcript.id,
    };

    (onSave ?? ((n: VoiceNote) => setVoiceNotes(prev => [n, ...prev])))(note);

    setIsThinking(true);
    presence.endListening();
    const replyText = transcript ?? 'I needed to get some feelings out.';
    const previousVoiceHistory = voiceHistoryRef.current.slice();
    const reply = await fetchSekretReply(
      replyText,
      'voiceBip',
      mood,
      avatarKey,
      undefined,
      privateProfile,
      profileSide,
      previousVoiceHistory,
    );
    voiceHistoryRef.current = [
      ...previousVoiceHistory,
      { role: 'user' as const, content: replyText },
      { role: 'assistant' as const, content: reply },
    ].slice(-20);
    setSekretReply(reply);
    setIsVoiceLoading(true);
    const audio = await fetchSekretVoice({ reply, characterId: avatar.personality });
    if (audio) setReplyAudioUri(`data:${audio.contentType};base64,${audio.audioBase64}`);
    setIsVoiceLoading(false);
    setIsThinking(false);
    presence.markResponseReady();
    setSelectedBipType(null);
  };

  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    if (!isRecording) return;
    if (recordingTime >= 300) {
      stopRecordingRef.current();
    }
  }, [recordingTime, isRecording]);

  const startVideoRecording = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setSelectedBipType(null);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) {
      setSelectedBipType(null);
      return;
    }
    const asset = result.assets[0];
    const secs = typeof asset.duration === 'number' ? Math.floor(asset.duration) : 0;
    const note: VoiceNote = {
      id: Date.now(),
      title: 'Video Bip',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
      type: 'video',
      avatarKey,
      videoUri: asset.uri,
    };
    (onSave ?? ((n: VoiceNote) => setVoiceNotes(prev => [n, ...prev])))(note);
    setRecorded(true);
    setSelectedBipType(null);
  };

  useEffect(() => {
    return () => {
      pulseLoop.current?.stop();
      glowLoop.current?.stop();
      waveLoop.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => null);
    };
  }, []);


  const playReplyAudio = async () => {
    if (!replyAudioUri) return;
    const { sound } = await Audio.Sound.createAsync({ uri: replyAudioUri });
    await sound.playAsync();
  };

  const prompts = avatar.prompts;
  const prompt = prompts[voicePromptIdx % prompts.length];
  const selectAvatar = (nextAvatarKey: VoiceBipAvatarKey) => {
    setVoicePromptIdx(0);
    setSekretReply('');
    setRecorded(false);
    voiceHistoryRef.current = [];
    onSelectAvatar?.(nextAvatarKey);
  };

  return (
    <View style={[styles.root, { backgroundColor: '#0d0914' }]}>
      <AmbientWeatherOverlay />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar Voice Bip — each companion keeps an independent identity. */}
        <View style={styles.avatarSelector}>
          {VOICE_BIP_AVATAR_KEYS.map(key => {
            const option = VOICE_BIP_AVATARS[key];
            const active = key === avatarKey;
            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => selectAvatar(key)}
                style={[
                  styles.avatarOption,
                  active && { borderColor: option.accent, backgroundColor: `${option.accent}24` },
                ]}
              >
                <Text style={styles.avatarOptionEmoji}>{option.emoji}</Text>
                <Text style={[styles.avatarOptionName, active && { color: option.accent }]}>{option.displayName}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.avatarIntro}>
          <Text style={[styles.avatarRole, { color: avatar.accent }]}>{avatar.role}</Text>
          <Text style={styles.avatarGreeting}>“{avatar.greeting}”</Text>
        </View>

        <SyncBadge status={syncStatus ?? 'idle'} />

        {/* ── Interactive Room ── */}
        <View style={styles.roomWrap} pointerEvents="box-none">
          <Image source={roomArt} style={styles.roomImage} resizeMode="cover" blurRadius={1.2} />

          {/* Hero avatar — driven by the Voice Bip Presence System.
              Listens / thinks / responds / settles instead of sitting still. */}
          <PresenceAvatar
            character={presenceCharacter}
            time={presenceTime}
            state={presence.state}
            style={styles.heroAvatar}
          />

          {/* Top scrim */}
          <LinearGradient
            colors={['rgba(13,9,20,0.55)', 'transparent']}
            style={styles.topScrim}
            pointerEvents="none"
          />
          {/* Environmental character art */}
          <View pointerEvents="none" style={styles.environmentLayer}>
            {heroArt ? (
              <Image
                source={heroArt}
                style={styles.heroAvatar}
                resizeMode="contain"
              />
            ) : null}
            <LinearGradient
              colors={['rgba(13,9,20,0.55)', 'transparent']}
              style={styles.topScrim}
            />
          </View>
          {/* Bottom scrim */}
          <LinearGradient
            colors={['transparent', 'rgba(13,9,20,0.55)', 'rgba(13,9,20,0.95)']}
            style={styles.bottomScrim}
            pointerEvents="none"
          />

          {/* Cloud companion — drifts only when motion is enabled */}
          <Animated.View
            testID="voice-presence-cloud"
            style={[styles.cloudWrap, cloudStyle]}
            pointerEvents="none"
          >
            <Image source={CLOUD_HP} style={styles.cloudImg} resizeMode="contain" />
          </Animated.View>

          {/* Purple recording overlay */}
          {isRecording && (
            <Animated.View
              style={[styles.recordingOverlay, { opacity: glowAnim }]}
              pointerEvents="none"
            />
          )}

          {/* Time badge — 6-phase via PresenceTime, with legacy fallback */}
          <View style={styles.timeBadge} pointerEvents="none">
            <Text style={styles.timeBadgeText}>{TIME_BADGE[timeOfDay]}</Text>
          </View>

          {/* Companion presence pill */}
          <Animated.View
            testID="voice-presence-pill"
            style={[styles.presencePill, pillStyle]}
            pointerEvents="none"
          >
            <Text style={styles.presenceText}>
              {companion?.presenceMessage || avatar.presence}
            </Text>
          </Animated.View>

          {/* Listening badge — full character name, only while recording */}
          {isRecording && (
            <View style={styles.listeningBadge} pointerEvents="none">
              <Text style={styles.listeningBadgeText}>
                {avatar.listening}
              </Text>
            </View>
          )}

          {/* HOTSPOT — Microphone */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.hotspot,
              { top: HOTSPOTS.microphone.top as any, left: HOTSPOTS.microphone.left as any, width: HOTSPOTS.microphone.width as any, height: HOTSPOTS.microphone.height as any },
              DEBUG_HOTSPOTS && styles.hotspotDebug,
            ]}
            onPress={() => {
              if (isRecording && !isRecordingStarting) stopRecording();
              else if (!isRecording) setShowBipMenu(true);
            }}
          >
            {DEBUG_HOTSPOTS && <Text style={styles.debugLabel}>{HOTSPOTS.microphone.label}</Text>}
          </TouchableOpacity>

          {/* HOTSPOT — Journal */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.hotspot,
              { bottom: HOTSPOTS.journal.bottom as any, left: HOTSPOTS.journal.left as any, width: HOTSPOTS.journal.width as any, height: HOTSPOTS.journal.height as any },
              DEBUG_HOTSPOTS && styles.hotspotDebug,
            ]}
            onPress={() => setShowArchive(true)}
          >
            {DEBUG_HOTSPOTS && <Text style={styles.debugLabel}>{HOTSPOTS.journal.label}</Text>}
          </TouchableOpacity>

          {/* HOTSPOT — Window */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.hotspot,
              { top: HOTSPOTS.window.top as any, right: HOTSPOTS.window.right as any, width: HOTSPOTS.window.width as any, height: HOTSPOTS.window.height as any },
              DEBUG_HOTSPOTS && styles.hotspotDebug,
            ]}
            onPress={() => setScreen('cloudThoughts')}
          >
            {DEBUG_HOTSPOTS && <Text style={styles.debugLabel}>{HOTSPOTS.window.label}</Text>}
          </TouchableOpacity>

          {/* HOTSPOT — Crystal Jar */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.hotspot,
              { bottom: HOTSPOTS.crystalJar.bottom as any, right: HOTSPOTS.crystalJar.right as any, width: HOTSPOTS.crystalJar.width as any, height: HOTSPOTS.crystalJar.height as any },
              DEBUG_HOTSPOTS && styles.hotspotDebug,
            ]}
            onPress={() => setShowArchive(true)}
          >
            {DEBUG_HOTSPOTS && <Text style={styles.debugLabel}>{HOTSPOTS.crystalJar.label}</Text>}
          </TouchableOpacity>

          {/* Scrapbook sticky-note hint */}
          {!DEBUG_HOTSPOTS && !isRecording && (
            <View style={[styles.stickyHint, { top: '15%', left: '26%' }]} pointerEvents="none">
              <Text style={styles.stickyHintText}>tap the mic 🎙️</Text>
            </View>
          )}
        </View>

        {/* ── Recording state ── */}
        {isRecording && (
          <View style={[styles.recordingCard, { borderColor: '#a855f7', backgroundColor: 'rgba(13,9,20,0.92)', shadowColor: '#a855f7' }]}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], borderColor: '#a855f7' }]} />
            <Text style={styles.recordingLabel}>Recording… 🔴</Text>
            <Text style={styles.recordingTimer}>{formatTime(recordingTime)}</Text>
            {recordingTime >= 270 && (
              <Text style={styles.recordingWarn}>almost at limit — wrapping up soon</Text>
            )}
            <View style={styles.waveform}>
              {waveAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 36] }),
                      backgroundColor: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#f472b6' : '#7c3aed',
                    },
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity style={[styles.stopBtn, isRecordingStarting && { opacity: 0.4 }]} onPress={stopRecording} disabled={isRecordingStarting}>
              <Text style={styles.stopBtnText}>⏹ Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Saved confirmation ── */}
        {recorded && !isRecording && (
          <View style={[styles.floatCard, { borderColor: theme.accent, backgroundColor: 'rgba(13,9,20,0.88)' }]}>
            <Text style={[styles.savedLabel, { color: theme.soft }]}>
              Saved to your journal {avatar.emoji}
            </Text>
          </View>
        )}

        {/* ── Transcript failed badge ── */}
        {recorded && transcriptFailed && !isThinking && (
          <View style={[styles.floatCard, { borderColor: '#f59e0b88', backgroundColor: 'rgba(13,9,20,0.88)' }]}>
            <Text style={{ fontSize: 13, color: '#fcd34d', fontStyle: 'italic', textAlign: 'center', lineHeight: 19 }}>
              couldn't catch that clearly — replied from the vibe anyway 💜
            </Text>
          </View>
        )}

        {/* ── Companion thinking ── */}
        {isThinking && (
          <View style={[styles.floatCard, { borderColor: theme.accent, backgroundColor: 'rgba(13,9,20,0.88)', flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Image source={CLOUD_HP} style={{ width: 36, height: 36 }} resizeMode="contain" />
            <Text style={[styles.thinkingText, { color: theme.soft }]}>{avatar.listening}</Text>
          </View>
        )}

        {/* ── Reply ── */}
        {Boolean(sekretReply) && !isThinking && (
          <View style={[styles.floatCard, { borderColor: 'rgba(168,85,247,0.5)', backgroundColor: 'rgba(13,9,20,0.92)', shadowColor: '#a855f7' }]}>
            <Text style={[styles.replyLabel, { color: '#a855f7' }]}>{avatar.responseLabel}</Text>
            <Text style={[styles.replyText, { color: theme.soft }]}>{sekretReply}</Text>
            {isVoiceLoading ? (
              <Text style={[styles.voiceStatus, { color: theme.soft }]}>preparing voice…</Text>
            ) : replyAudioUri ? (
              <TouchableOpacity style={styles.voiceBtn} onPress={playReplyAudio}>
                <Text style={styles.voiceBtnText}>▶ hear this reply</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── Companion voice prompt ── */}
        {!isRecording && !sekretReply && (() => {
          const p = prompt;
          return (
            <View style={[styles.floatCard, { borderColor: `${avatar.accent}73`, backgroundColor: 'rgba(20,12,40,0.88)', shadowColor: avatar.accent }]}>
              <Text style={{ color: avatar.accent, fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 }}>
                {avatar.displayName.toUpperCase()} · WHAT TO SAY
              </Text>
              <Text style={{ fontSize: 26, marginBottom: 8 }}>{p.emoji}</Text>
              <Text style={{ color: '#f5f0ff', fontSize: 15, fontWeight: '600', lineHeight: 23, marginBottom: 14 }}>
                {p.text}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{ borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 }}
                  onPress={() => setVoicePromptIdx(i => i + 1)}
                >
                  <Text style={{ color: '#c4b5fd', fontSize: 12, fontWeight: '600' }}>different prompt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 7, alignItems: 'center' }}
                  onPress={() => setShowBipMenu(true)}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>🎙️ record now</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* ── Tips ── */}
        <View style={[styles.floatCard, { borderColor: theme.accent, backgroundColor: 'rgba(13,9,20,0.85)' }]}>
          <Text style={[styles.cardTitle, { color: '#fff' }]}>Tips for Voice Bips 🌙</Text>
          {avatar.tips.map(tip => (
            <Text key={tip} style={[styles.tip, { color: '#c4b5fd' }]}>• {tip}</Text>
          ))}
        </View>

      </ScrollView>

      {BottomNav}

      {/* ── Bip type menu ── */}
      {showBipMenu && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBackdrop} onPress={() => setShowBipMenu(false)} />
          <View style={[styles.bipMenuCard, { backgroundColor: 'rgba(13,9,20,0.97)', borderColor: theme.accent }]}>
            <Text style={[styles.bipMenuTitle, { color: theme.soft }]}>What kind of Bip? {avatar.emoji}</Text>
            <Text style={[styles.bipMenuSub, { color: '#7c6899' }]}>Choose how you want to express right now</Text>
            {BIP_TYPES.map(bip => (
              <TouchableOpacity
                key={bip.id}
                style={[styles.bipTypeRow, { borderColor: theme.accent }]}
                onPress={() => {
                  setSelectedBipType(bip.id);
                  if (bip.id === 'text')       { setShowBipMenu(false); setScreen('pages'); }
                  else if (bip.id === 'cloud') { setShowBipMenu(false); setScreen('cloudThoughts'); }
                  else if (bip.id === 'video') { setShowBipMenu(false); void startVideoRecording(); }
                  else                         { setShowBipMenu(false); startRecording(); }
                }}
              >
                <Text style={styles.bipTypeEmoji}>{bip.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bipTypeLabel, { color: '#fff' }]}>{bip.label}</Text>
                  <Text style={[styles.bipTypeSub, { color: '#7c6899' }]}>{bip.sub}</Text>
                </View>
                <Text style={{ color: theme.soft, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Archive overlay ── */}
      {showArchive && (
        <View style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBackdrop} onPress={() => setShowArchive(false)} />
          <View style={[styles.archiveCard, { backgroundColor: 'rgba(13,9,20,0.97)', borderColor: theme.accent }]}>
            <Text style={[styles.bipMenuTitle, { color: theme.soft }]}>
              {avatar.archiveTitle} 📖
            </Text>

            {voiceNotes.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Image source={CLOUD_HP} style={{ width: 48, height: 48, marginBottom: 10 }} resizeMode="contain" />
                <Text style={[styles.emptyText, { color: '#7c6899' }]}>No bips yet. Your first one is waiting. 🎙️</Text>
              </View>
            ) : (
              <>
                {voiceNotes.slice(0, 6).map(n => (
                  <View key={n.id} style={[styles.noteRow, { borderBottomColor: 'rgba(167,114,192,0.15)' }]}>
                    <View style={[styles.noteIcon, { backgroundColor: 'rgba(124,58,237,0.3)' }]}>
                      <Text style={{ fontSize: 14 }}>
                        {n.type === 'video' ? '📹' : n.type === 'text' ? '✍️' : n.type === 'cloud' ? '☁️' : '🎙️'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.noteTitle, { color: '#fff' }]}>{n.title}</Text>
                      <Text style={[styles.noteMeta, { color: '#7c6899' }]}>{n.date} · {n.duration}</Text>
                    </View>
                    <TouchableOpacity style={[styles.playBtn, { backgroundColor: 'rgba(124,58,237,0.25)' }]}>
                      <Text style={[styles.playBtnText, { color: '#c4b5fd' }]}>▶</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {voiceNotes.length > 6 && (
                  <TouchableOpacity
                    style={{ alignItems: 'center', paddingTop: 10 }}
                    onPress={() => { setShowArchive(false); setScreen('pages'); }}
                  >
                    <Text style={{ color: theme.soft, fontSize: 12, fontWeight: '600' }}>
                      +{voiceNotes.length - 6} more → open journal
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity style={{ alignItems: 'center', paddingTop: 12 }} onPress={() => setShowArchive(false)}>
              <Text style={{ color: '#7c6899', fontSize: 13 }}>close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#0d0914' },
  scrollView:          { flex: 1 },
  scroll:             { paddingBottom: 100, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  avatarSelector:     { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  avatarOption:       { flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(196,181,253,0.18)', backgroundColor: 'rgba(13,9,20,0.72)', paddingVertical: 8, paddingHorizontal: 4 },
  avatarOptionEmoji:  { fontSize: 18, marginBottom: 3 },
  avatarOptionName:   { color: '#9b91aa', fontSize: 11, fontWeight: '800' },
  avatarIntro:        { paddingHorizontal: 16, paddingBottom: 12 },
  avatarRole:         { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  avatarGreeting:     { color: '#f5f0ff', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  roomWrap:           { position: 'relative', width: '100%', height: Platform.OS === 'web' ? 240 : 340, marginBottom: 16, overflow: 'hidden' },
  roomImage:          { width: '100%', height: '100%' },
  environmentLayer:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroAvatar:         { position: 'absolute', bottom: -20, alignSelf: 'center', width: '88%', height: '82%', opacity: 0.16, tintColor: '#fff' },
  topScrim:           { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  bottomScrim:        { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  cloudWrap:          { position: 'absolute', top: 36, right: 24 },
  cloudImg:           { width: 64, height: 64 },
  recordingOverlay:   { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(124,58,237,0.25)' },
  timeBadge:          { position: 'absolute', top: 10, left: 12, backgroundColor: 'rgba(13,9,20,0.65)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  timeBadgeText:      { color: '#c4b5fd', fontSize: 11, fontWeight: '600' },
  presencePill:       {
    position: 'absolute', top: 110, right: 16,
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderColor: 'rgba(168,85,247,0.45)', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  presenceText:       { color: '#e9d5ff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  listeningBadge:     { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  listeningBadgeText: { color: '#f5f0ff', fontSize: 14, fontWeight: '800', backgroundColor: 'rgba(124,58,237,0.7)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  hotspot:            { position: 'absolute' },
  hotspotDebug:       { borderWidth: 2, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.18)' },
  debugLabel:         { color: '#f472b6', fontSize: 9, fontWeight: '900', padding: 2 },
  stickyHint:         {
    position: 'absolute',
    backgroundColor: '#fff8e7',
    borderColor: '#a855f7', borderWidth: 1, borderStyle: 'dashed',
    borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5,
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 1, height: 2 },
  },
  stickyHintText:     { color: '#3d2563', fontSize: 11, fontWeight: '700', fontStyle: 'italic' },

  // Recording card
  recordingCard:      {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center',
    shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  pulseRing:          { width: 80, height: 80, borderRadius: 40, borderWidth: 3, position: 'absolute', top: 14 },
  recordingLabel:     { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 6, marginTop: 8 },
  recordingTimer:     { color: '#a855f7', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  recordingWarn:      { color: '#fcd34d', fontSize: 11, fontStyle: 'italic', marginBottom: 8 },
  waveform:           { flexDirection: 'row', alignItems: 'center', gap: 3, height: 44, marginBottom: 20 },
  waveBar:            { width: 4, borderRadius: 2 },
  stopBtn:            { backgroundColor: '#ef4444', borderRadius: 18, paddingHorizontal: 24, paddingVertical: 12 },
  stopBtnText:        { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Float cards
  floatCard:          {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 18, borderWidth: 1, padding: 16,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  savedLabel:         { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  thinkingText:       { fontSize: 13, fontStyle: 'italic' },
  replyLabel:         { fontSize: 10, marginBottom: 6, fontWeight: '700', letterSpacing: 0.5 },
  replyText:          { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  voiceStatus:        { marginTop: 10, fontSize: 12, fontStyle: 'italic', opacity: 0.75 },
  voiceBtn:           { marginTop: 12, alignSelf: 'flex-start', backgroundColor: 'rgba(124,58,237,0.34)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(196,181,253,0.35)' },
  voiceBtnText:       { color: '#f5f0ff', fontSize: 12, fontWeight: '800' },
  cardTitle:          { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  tip:                { fontSize: 13, marginBottom: 8, lineHeight: 20 },

  // Bip menu overlay
  overlayWrap:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  overlayBackdrop:    { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  bipMenuCard:        { margin: 16, borderRadius: 28, borderWidth: 1, padding: 24, zIndex: 10 },
  bipMenuTitle:       { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  bipMenuSub:         { fontSize: 12, marginBottom: 20 },
  bipTypeRow:         { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  bipTypeEmoji:       { fontSize: 26 },
  bipTypeLabel:       { fontSize: 15, fontWeight: '700' },
  bipTypeSub:         { fontSize: 11, marginTop: 2 },

  // Archive overlay
  archiveCard:        { margin: 16, borderRadius: 28, borderWidth: 1, padding: 24, zIndex: 10, maxHeight: '70%' },
  noteRow:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  noteIcon:           { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  noteTitle:          { fontWeight: '600', fontSize: 13 },
  noteMeta:           { fontSize: 11 },
  playBtn:            { borderRadius: 10, padding: 8 },
  playBtnText:        { fontSize: 14 },
  emptyText:          { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
});