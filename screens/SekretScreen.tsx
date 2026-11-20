// screens/SekretScreen.tsx
// Se'kret Bip — Drop a Bip (Talk with Se'kret)
//
// Polish pass (2026-06-07): preserves ALL props, internal state, parent/teen split,
// SEKRET_PROFILES fallback, and personality-aware replies. Adds:
//   • Time-of-day Room backdrop via getRoomBg(character, time)
//   • Mood-tinted glow (happy/sad/angry/tired/calm)
//   • Per-character copy: Suhana, Sy, Cloud, Night each have distinct
//     heroSub / stickyLine / sendLabel / placeholder / greeting
//   • Stagger entrance fade-ins, breath loop on profile emoji
//   • Scrapbook sticky-note quiet line
//   • Gradient overlay on hero
//
// Props interface UNCHANGED — index.tsx call site untouched.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Text, TouchableOpacity, ScrollView,
  TextInput, View, StyleSheet, Platform,
  ImageBackground, Animated, Easing,
} from 'react-native';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { LinearGradient } from 'expo-linear-gradient';
import { AVATARS, getRoomBg, normalizeCharacterKey } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';
import { fetchSekretReply } from '../utils/api';
import type { OracleProfile } from '../services/oracleDiscovery';

// ── Profiles (keep in sync with index.tsx SEKRET_PROFILES) ─────────────────
const SEKRET_PROFILES: Record<string, any> = {
  soft:   { name: 'Suhana',        emoji: '🌸', title: 'Favorite Older Sister', vibe: 'Funny, warm, protective, and impossible to fool.', greeting: 'friend... 😭 okay, what happened?' },
  rylane: { name: 'Sy',         emoji: '⚡', title: 'Loyal Bro',            vibe: 'Quiet loyalty. Keeps it real. Never talks down.',   greeting: "Aight, what\'s actually on your mind? No fake 'I'm fine'." },
  cloud:  { name: "Cloud Se'kret",  emoji: '☁️', title: 'Quiet Observer',      vibe: 'Notices. Waits. Rarely pushes.',                    greeting: 'something feels different today.' },
  night:  { name: "Night Se'kret",  emoji: '🌙', title: 'The Light Left On',   vibe: 'Presence. Not conversation.',                       greeting: 'rough night?' },
};

const WRITING_FONT = Platform.select({
  ios: 'Bradley Hand',
  android: 'cursive',
  web: '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive',
  default: undefined,
});

// ── Mood glow palette ──────────────────────────────────────────────────────
function timeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// ── Per-character UI copy ──────────────────────────────────────────────────
interface CharacterCopy {
  heroTitle:   string;
  heroSub:     string;
  stickyLine:  string;
  sendLabel:   string;
  placeholder: string;
  greeting:    string;
}

function copyFor(profileKey: string, profileName: string): CharacterCopy {
  switch (profileKey) {
    case 'rylane':
      return {
        heroTitle:   'Drop a Bip 🤝',
        heroSub:     "Say it how it happened. I'll keep it real.",
        stickyLine:  'say the part you keep leaving out.',
        sendLabel:   'Send 🤝',
        placeholder: `Talk to ${profileName}… no cap`,
        greeting:    "Aight. I'm here. Drop it.",
      };
    case 'cloud':
      return {
        heroTitle:   'Drop a Bip ☁️',
        heroSub:     "No rush. Let it take shape when it's ready.",
        stickyLine:  'even fragments count.',
        sendLabel:   'Send ☁️',
        placeholder: `Talk to ${profileName}… let it come slowly`,
        greeting:    'something feels close to the surface.',
      };
    case 'night':
      return {
        heroTitle:   'Drop a Bip 🌙',
        heroSub:     "You don't have to explain it. Just show up.",
        stickyLine:  "you don't have to be okay right this second.",
        sendLabel:   'Send 🌙',
        placeholder: `Talk to ${profileName}… the night hears you`,
        greeting:    'rough night?',
      };
    default:
      return {
        heroTitle:   'Drop a Bip 💜',
        heroSub:     "Say it how you'd text it. Suhana can take it.",
        stickyLine:  'no polished version. what actually happened?',
        sendLabel:   'Send 💜',
        placeholder: `Talk to ${profileName}…`,
        greeting:    SEKRET_PROFILES.soft.greeting,
      };
  }
}

// ── Props ──────────────────────────────────────────────────────────────────
interface SekretScreenProps {
  t:                  Record<string, any>;
  mood:               string;
  currentSekret:      Record<string, any> | null;
  selectedProfile:    string;
  setSelectedProfile: (key: string) => void;
  userSide:           'teen' | 'parent';
  setScreen:          (screen: string) => void;
  BottomNav:          React.ReactNode;
  privateProfile?:     OracleProfile;
}

export function SekretScreen({
  t, mood, currentSekret,
  selectedProfile, setSelectedProfile, userSide, setScreen, BottomNav, privateProfile,
}: SekretScreenProps) {

  const [sekretMessage,  setSekretMessage]  = useState('');
  const [sekretReply,    setSekretReply]    = useState('');
  const [isSekretTyping, setIsSekretTyping] = useState(false);
  const [lastSent,       setLastSent]       = useState('');

  const profile   = currentSekret ?? SEKRET_PROFILES[selectedProfile] ?? SEKRET_PROFILES.soft;
  const charKey   = normalizeCharacterKey(selectedProfile);
  const glow      = glowFor(mood);
  const tod       = timeOfDay();
  const bgSource  = useMemo(() => getRoomBg(charKey, tod), [charKey, tod]);
  const characterArt = AVATARS[charKey]?.fullbody;

  const copy = copyFor(selectedProfile, profile.name);

  const greetingDisplay =
    (currentSekret?.greeting && currentSekret.greeting !== SEKRET_PROFILES.soft.greeting)
      ? currentSekret.greeting
      : copy.greeting;

  // ── Animations ──────────────────────────────────────────────────────────
  const fadeHero   = useRef(new Animated.Value(0)).current;
  const fadeProf   = useRef(new Animated.Value(0)).current;
  const fadeChat   = useRef(new Animated.Value(0)).current;
  const fadeInput  = useRef(new Animated.Value(0)).current;
  const fadePicker = useRef(new Animated.Value(0)).current;
  const transHero   = useRef(new Animated.Value(10)).current;
  const transProf   = useRef(new Animated.Value(10)).current;
  const transChat   = useRef(new Animated.Value(10)).current;
  const transInput  = useRef(new Animated.Value(10)).current;
  const transPicker = useRef(new Animated.Value(10)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = (op: Animated.Value, tr: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(tr, { toValue: 0, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]);
    Animated.parallel([
      stagger(fadeHero,   transHero,   0),
      stagger(fadeProf,   transProf,   160),
      stagger(fadeChat,   transChat,   320),
      stagger(fadeInput,  transInput,  460),
      stagger(fadePicker, transPicker, 600),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(breath, { toValue: 0, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, []);

  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1,    1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1   ] });

  // ── Send handler ────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = sekretMessage.trim();
    if (!text) return;

    setLastSent(text);
    setSekretMessage('');
    setIsSekretTyping(true);
    setSekretReply('');

    const reply = await fetchSekretReply(text, 'chat', mood, selectedProfile, undefined, privateProfile, userSide);
    setSekretReply(reply);
    setIsSekretTyping(false);
  };

  // ── Parent side (preserved) ─────────────────────────────────────────────
  if (userSide === 'parent') return (
    <ImageBackground source={bgSource} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.logo}>Se'kret Bridge 💜</Text>
        <Text style={styles.subtitle}>Your teen's safe space. You can reach in with love.</Text>
        <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.85)', borderColor: glow + '88', shadowColor: glow }]}>
          <Text style={[styles.cardText, { color: '#fff' }]}>This is your teen's private space.</Text>
          <Text style={[styles.entryText, { color: '#E2E8F0' }]}>
            Se'kret helps them process emotions safely. You can send a message of support through the Bridge.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: glow, shadowColor: glow, marginTop: 12 }]}
            onPress={() => setScreen('bridge')}
          >
            <Text style={styles.buttonText}>Open Bridge 💌</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {BottomNav}
    </ImageBackground>
  );

  // ── Teen side ────────────────────────────────────────────────────────────
  return (
    <ImageBackground source={bgSource} style={styles.root} resizeMode="cover">
      <AmbientWeatherOverlay />
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <Animated.View style={{ opacity: fadeHero, transform: [{ translateY: transHero }] }}>
          <Text style={styles.logo}>{copy.heroTitle}</Text>
          <Text style={styles.subtitle}>{copy.heroSub}</Text>
          <Animated.View style={[
            styles.companion,
            { backgroundColor: 'rgba(30,18,55,0.78)', borderColor: glow + '88', shadowColor: glow,
              opacity: breathOpacity, transform: [{ scale: breathScale }] },
          ]}>
            <Text style={styles.companionText}>
              {profile.emoji}  {profile.name} is right here
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Profile card */}
        <Animated.View style={{ opacity: fadeProf, transform: [{ translateY: transProf }] }}>
          <View style={[styles.characterStage, { borderColor: glow + '88', shadowColor: glow }]}>
            {characterArt ? <Animated.Image
              source={characterArt}
              style={[styles.characterArt, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}
              resizeMode="contain"
            /> : null}
            <LinearGradient colors={['transparent', 'rgba(13,9,20,0.92)']} style={styles.characterCaption}>
              <Text style={styles.cardText}>{profile.name}</Text>
              <Text style={styles.characterRole}>{profile.title} · {profile.vibe}</Text>
            </LinearGradient>
          </View>
          <View style={styles.sticky}>
            <Text style={styles.stickyText}>{copy.stickyLine}</Text>
          </View>
        </Animated.View>

        {/* Chat bubble */}
        <Animated.View style={{ opacity: fadeChat, transform: [{ translateY: transChat }] }}>
          {(lastSent || sekretReply || isSekretTyping) ? (
            <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.85)', borderColor: glow + '88', shadowColor: glow }]}>
              {lastSent ? (
                <Text style={[styles.entryText, styles.userWritingText, { color: '#E2E8F0' }]}>
                  You: {lastSent}
                </Text>
              ) : null}
              <Text style={[styles.entryText, styles.companionWritingText, { color: t.soft, marginTop: 8 }]}>
                {isSekretTyping
                  ? `${profile.name} is typing… ☁️`
                  : sekretReply}
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.78)', borderColor: glow + '88', shadowColor: glow }]}>
              <Text style={[styles.entryText, styles.companionWritingText, { color: t.soft }]}>
                {greetingDisplay}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Input + Send */}
        <Animated.View style={{ opacity: fadeInput, transform: [{ translateY: transInput }] }}>
          <TextInput
            style={[styles.journalInput, { backgroundColor: 'rgba(30,18,55,0.78)', borderColor: glow + '88', color: '#fff' }]}
            placeholder={copy.placeholder}
            placeholderTextColor="#94A3B8"
            multiline
            value={sekretMessage}
            onChangeText={setSekretMessage}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: glow, shadowColor: glow }]}
            onPress={handleSend}
          >
            <Text style={styles.buttonText}>{copy.sendLabel}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Profile picker */}
        <Animated.View style={{ opacity: fadePicker, transform: [{ translateY: transPicker }] }}>
          <Text style={[styles.sectionTitle, { color: '#fff' }]}>Choose Your Se'kret</Text>
          <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.82)', borderColor: glow + '88', shadowColor: glow }]}>
            {Object.keys(SEKRET_PROFILES).map(key => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.choiceButton,
                  selectedProfile === key && { borderColor: glow, borderWidth: 2, backgroundColor: 'rgba(124,58,237,0.18)' },
                ]}
                onPress={() => setSelectedProfile(key)}
              >
                <Text style={styles.entryText}>
                  {SEKRET_PROFILES[key].emoji} {SEKRET_PROFILES[key].name}
                </Text>
                <Text style={styles.miniText}>{SEKRET_PROFILES[key].title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

      </ScrollView>

      {BottomNav}
    </ImageBackground>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:           { flex: 1 },
  scroll:         { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  logo:           { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle:       { fontSize: 15, color: '#CBD5E1', textAlign: 'center', marginBottom: 16 },
  companion:      { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginBottom: 20, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  companionText:  { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  sectionTitle:   { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12, marginTop: 18 },
  card:           { padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  cardEmoji:      { fontSize: 36, marginBottom: 8, textAlign: 'center' },
  cardText:       { fontSize: 17, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  entryText:      { fontSize: 14, marginBottom: 6, lineHeight: 20 },
  companionWritingText: { fontFamily: WRITING_FONT, fontSize: 16, lineHeight: 24 },
  userWritingText:      { fontFamily: WRITING_FONT },
  miniText:       { color: '#CBD5E1', fontSize: 12, textAlign: 'center' },
  button:         { padding: 16, borderRadius: 18, marginBottom: 12, alignItems: 'center', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  journalInput:   { padding: 16, borderRadius: 18, minHeight: 130, textAlignVertical: 'top', marginBottom: 16, borderWidth: 1, fontSize: 14, lineHeight: 22, fontFamily: WRITING_FONT },
  choiceButton:   { backgroundColor: 'rgba(30,41,59,0.7)', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  sticky:         { alignSelf: 'center', backgroundColor: '#fff8e7', borderColor: '#7c3aed', borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 18, transform: [{ rotate: '-2deg' }] },
  stickyText:     { color: '#3b1f6b', fontFamily: WRITING_FONT, fontStyle: 'italic', fontSize: 14 },
  characterStage: { height: 260, borderRadius: 24, overflow: 'hidden', borderWidth: 1, marginBottom: 12, backgroundColor: 'rgba(20,12,38,0.78)', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  characterArt:   { width: '100%', height: '100%' },
  characterCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 50, paddingHorizontal: 18, paddingBottom: 16 },
  characterRole:  { color: '#ddd4e8', textAlign: 'center', fontSize: 12, lineHeight: 17 },
});
