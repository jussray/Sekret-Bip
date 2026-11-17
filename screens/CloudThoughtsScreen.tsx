// screens/CloudThoughtsScreen.tsx
// Se'kret Bip — Cloud Thoughts
// The quiet space. Say what you've been carrying.
// Not therapy. Not clinical. Just the cloud.

import React, { useEffect, useRef, useState } from 'react';
import { IMAGES, getRoomBg } from '../constants/theme';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { glowForMood as glowFor } from '../constants/moodGlow';
import {
  fetchSekretReply,
  getVisibleSekretName,
  normalizeSekretCharacter,
} from '../utils/api';
import { MiniReactionSticker, type MiniStickerCharacter } from '../components/MiniReactionSticker';
import type { OracleProfile, OracleSide } from '../services/oracleDiscovery';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  View,
  Image,
  StyleSheet,
  Platform,
  ImageBackground,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function timeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

const CLOUD_HP = IMAGES.cloudHeadphones;
const CLOUD = IMAGES.cloud;

const PROMPT_SETS: Record<string, { emoji: string; text: string }[]> = {
  cloud: [
    { emoji: '☁️', text: "What's been sitting in your chest lately?" },
    { emoji: '🌙', text: 'What thought keeps coming back at night?' },
    { emoji: '💜', text: 'What do you wish someone would just ask you?' },
    { emoji: '🫶', text: 'What have you been carrying by yourself?' },
    { emoji: '✨', text: 'What would you say if nobody was judging?' },
    { emoji: '🕯️', text: "What do you need right now that you haven't asked for?" },
    { emoji: '🌧️', text: "What's one thing that felt heavy this week?" },
    { emoji: '💫', text: 'What are you proud of that nobody else noticed?' },
  ],
  braindump: [
    { emoji: '🧠', text: 'Let it all out. No filter, no judgment.' },
    { emoji: '💥', text: "What's been loud in your head?" },
    { emoji: '🌀', text: 'Say the thing you keep pushing down.' },
    { emoji: '🔊', text: "What would you say if you didn't have to be calm about it?" },
  ],
  night: [
    { emoji: '🌙', text: "What are you thinking about that you can't turn off?" },
    { emoji: '🌃', text: 'What would feel better if you said it out loud?' },
    { emoji: '😶‍🌫️', text: 'What are you too tired to pretend is fine?' },
    { emoji: '🕯️', text: 'What do late nights make you feel?' },
  ],
  reflection: [
    { emoji: '💭', text: 'What did this week actually feel like?' },
    { emoji: '🪞', text: 'What moment from lately keeps replaying?' },
    { emoji: '🌱', text: 'What did you handle quietly that nobody saw?' },
    { emoji: '📖', text: 'What would your honest journal entry say today?' },
  ],
  checkin: [
    { emoji: '🫶', text: 'How are you actually doing right now?' },
    { emoji: '💚', text: "What's one thing your body is telling you today?" },
    { emoji: '☀️', text: "What's something you're grateful you got through?" },
    { emoji: '🌊', text: 'On a scale of heavy to okay — where are you?' },
  ],
};

type ModeKey = 'cloud' | 'braindump' | 'night' | 'reflection' | 'checkin';

const MODES: { key: ModeKey; emoji: string; label: string; sub: string }[] = [
  { key: 'braindump', emoji: '🧠', label: 'brain dump', sub: 'just let it all out' },
  { key: 'night', emoji: '🌙', label: 'night thoughts', sub: 'for when it gets loud' },
  { key: 'reflection', emoji: '💭', label: 'reflection', sub: 'look back softly' },
  { key: 'checkin', emoji: '🫶', label: 'check-in', sub: 'how are you really' },
];

interface CloudThoughtsScreenProps {
  t: Record<string, any>;
  mood: string;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  backTarget?: string;
  selectedSekret?: string;
  character?: MiniStickerCharacter;
  privateProfile?: OracleProfile;
  profileSide?: OracleSide;
}

export function CloudThoughtsScreen({
  t,
  mood,
  setScreen,
  BottomNav,
  backTarget = 'home',
  selectedSekret,
  character,
  privateProfile,
  profileSide = 'teen',
}: CloudThoughtsScreenProps) {
  const characterId = normalizeSekretCharacter(selectedSekret);
  const characterName = getVisibleSekretName(characterId);

  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [lastThought, setLastThought] = useState('');
  const [promptIdx, setPromptIdx] = useState(0);
  const [activeMode, setActiveMode] = useState<ModeKey>('cloud');

  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;

  const glow = glowFor(mood);
  const charKey = (
    selectedSekret === 'rylane' ? 'rylane' :
    selectedSekret === 'cloud' ? 'cloud' :
    selectedSekret === 'night' ? 'night' :
    'raylene'
  ) as 'raylene' | 'rylane' | 'cloud' | 'night';
  const bgSource = getRoomBg(charKey, timeOfDay());

  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2100,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 2100,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);
  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  const currentPrompts = PROMPT_SETS[activeMode];
  const currentPrompt = currentPrompts[promptIdx % currentPrompts.length];

  const sendThought = async (thought = input) => {
    const text = thought.trim();
    if (!text || isThinking) return;

    setInput('');
    setLastThought(text);
    setReply('');
    setRequestError(null);
    setIsThinking(true);

    try {
      const nextReply = await fetchSekretReply(
        text,
        activeMode,
        mood,
        selectedSekret,
        undefined,
        privateProfile,
        profileSide,
      );
      const cleanReply = nextReply.trim();
      if (!cleanReply) throw new Error('empty_cloud_reply');
      setReply(cleanReply);
    } catch {
      setRequestError("Cloud couldn't answer right now. Try again when you're ready.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleModeSwitch = (key: ModeKey) => {
    if (isThinking || key === activeMode) return;
    setActiveMode(key);
    setPromptIdx(0);
    setInput('');
    setReply('');
    setRequestError(null);
    setLastThought('');
  };

  const sendDisabled = !input.trim() || isThinking;
  const retryDisabled = !lastThought || isThinking;

  return (
    <ImageBackground source={bgSource} style={styles.root} resizeMode="cover">
      <AmbientWeatherOverlay />
      <LinearGradient
        colors={['rgba(13,9,20,0.72)', 'rgba(30,18,55,0.82)', 'rgba(13,9,20,0.95)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setScreen(backTarget)}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={[styles.backText, { color: '#7c6899' }]}>← back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroWrap}>
          <View pointerEvents="none" style={styles.envCloudLayer}>
            <Animated.Image
              source={CLOUD}
              style={[styles.envCloud, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}
              resizeMode="contain"
            />
            <Animated.Image
              source={CLOUD_HP}
              style={[styles.envCloudSmall, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.heroSub, { color: glow }]}>
            {isNight ? 'late night thoughts 🌙' : 'cloud thoughts ☁️'}
          </Text>
          <Text style={[styles.heroTitle, { color: glow }]}>Cloud Thoughts</Text>
          <Text style={[styles.heroMini, { color: '#cbb5ff' }]}>Write what is on your mind.</Text>
        </View>

        <View style={styles.modeRow} accessibilityRole="radiogroup">
          {MODES.map(mode => {
            const selected = activeMode === mode.key;
            return (
              <TouchableOpacity
                key={mode.key}
                style={[
                  styles.modeBtn,
                  {
                    borderColor: selected ? t.accent : 'rgba(124,58,237,0.3)',
                    backgroundColor: selected
                      ? 'rgba(217,70,239,0.14)'
                      : 'rgba(13,9,20,0.82)',
                    opacity: isThinking ? 0.62 : 1,
                  },
                ]}
                onPress={() => handleModeSwitch(mode.key)}
                disabled={isThinking}
                accessibilityRole="radio"
                accessibilityLabel={mode.label}
                accessibilityState={{ selected, disabled: isThinking }}
              >
                <Text style={styles.modeEmoji}>{mode.emoji}</Text>
                <Text style={[styles.modeLabel, { color: t.soft }]}>{mode.label}</Text>
                <Text style={styles.modeSub}>{mode.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.promptCard, {
          borderColor: glow + '88',
          backgroundColor: 'rgba(30,18,55,0.82)',
          shadowColor: glow,
        }]}>
          <Text style={styles.promptEmoji}>{currentPrompt.emoji}</Text>
          <Text style={[styles.promptText, { color: '#f5f0ff' }]}>{currentPrompt.text}</Text>
          <TouchableOpacity
            style={[styles.promptBtn, { borderColor: t.accent }]}
            onPress={() => setPromptIdx(i => (i + 1) % currentPrompts.length)}
            disabled={isThinking}
            accessibilityRole="button"
            accessibilityLabel="Different prompt"
            accessibilityState={{ disabled: isThinking }}
          >
            <Text style={[styles.promptBtnText, { color: t.soft }]}>different prompt</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.inputCard, {
          borderColor: glow + '88',
          backgroundColor: 'rgba(30,18,55,0.82)',
          shadowColor: glow,
        }]}>
          <TextInput
            testID="cloud-thought-input"
            style={[styles.input, { color: '#f5f0ff' }]}
            placeholder="write it here..."
            placeholderTextColor="#4a3d6b"
            multiline
            value={input}
            editable={!isThinking}
            onChangeText={setInput}
            accessibilityLabel="Cloud thought"
          />
          <TouchableOpacity
            testID="cloud-thought-send"
            style={[
              styles.sendBtn,
              {
                backgroundColor: sendDisabled ? 'rgba(124,58,237,0.2)' : t.accent,
                opacity: isThinking ? 0.7 : 1,
              },
            ]}
            onPress={() => void sendThought()}
            disabled={sendDisabled}
            accessibilityRole="button"
            accessibilityLabel="Send to Cloud"
            accessibilityState={{ disabled: sendDisabled, busy: isThinking }}
          >
            <Text style={styles.sendBtnText}>{isThinking ? 'waiting for Cloud…' : 'send to Cloud ☁️'}</Text>
          </TouchableOpacity>
          <MiniReactionSticker character={character ?? null} screenContext="cloudThoughts" size={40} />
        </View>

        {isThinking && (
          <View
            testID="cloud-thought-thinking"
            style={[styles.replyCard, {
              borderColor: 'rgba(168,85,247,0.3)',
              backgroundColor: 'rgba(13,9,20,0.9)',
            }]}
            accessibilityLabel={`${characterName} is preparing a reply`}
            accessibilityLiveRegion="polite"
          >
            <Image source={CLOUD} style={styles.replyCloud} resizeMode="contain" />
            <Text style={[styles.thinkingText, { color: t.soft }]}>
              {characterName} is preparing a reply… ☁️
            </Text>
          </View>
        )}

        {!!requestError && !isThinking && (
          <View
            testID="cloud-thought-error"
            style={[styles.errorCard, { borderColor: glow + '66' }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Text style={styles.errorTitle}>Cloud paused</Text>
            <Text style={[styles.errorText, { color: t.soft }]}>{requestError}</Text>
            <TouchableOpacity
              testID="cloud-thought-retry"
              style={[styles.retryBtn, { borderColor: t.accent }]}
              onPress={() => void sendThought(lastThought)}
              disabled={retryDisabled}
              accessibilityRole="button"
              accessibilityLabel="Retry Cloud reply"
              accessibilityState={{ disabled: retryDisabled, busy: isThinking }}
            >
              <Text style={[styles.retryText, { color: t.soft }]}>try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!reply && !isThinking && !requestError && (
          <View style={[styles.replyCard, {
            borderColor: 'rgba(168,85,247,0.3)',
            backgroundColor: 'rgba(13,9,20,0.92)',
          }]}>
            <Image source={CLOUD_HP} style={styles.replyCloud} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyLabel, { color: '#a855f7' }]}>{characterName} says 💜</Text>
              <Text style={[styles.replyText, { color: t.soft }]}>{reply}</Text>
            </View>
          </View>
        )}

        <View style={[styles.noteStrip, { borderColor: 'rgba(168,85,247,0.2)' }]}>
          <Text style={styles.noteText}>
            What you type is processed to create a reply. Share only details you are comfortable sending to the service.
          </Text>
        </View>
      </ScrollView>
      {BottomNav}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%' },
  scroll: {
    paddingBottom: 100,
    ...(Platform.OS === 'web'
      ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const }
      : {}),
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { fontSize: 14 },
  heroWrap: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  envCloudLayer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  envCloud: {
    width: 260,
    height: 260,
    position: 'absolute',
    top: -24,
    right: -40,
  },
  envCloudSmall: {
    width: 140,
    height: 140,
    position: 'absolute',
    bottom: -8,
    left: -18,
  },
  heroSub: { fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  heroTitle: { fontSize: 30, fontWeight: '900', fontStyle: 'italic', marginBottom: 6 },
  heroMini: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  modeBtn: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  modeEmoji: { fontSize: 24, marginBottom: 6 },
  modeLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  modeSub: { fontSize: 10, color: '#7c6899', textAlign: 'center' },
  promptCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  promptEmoji: { fontSize: 32, marginBottom: 10 },
  promptText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  promptBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  promptBtnText: { fontSize: 12, fontWeight: '600' },
  inputCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  input: {
    minHeight: 100,
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  sendBtn: { borderRadius: 16, padding: 14, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  replyCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  replyCloud: { width: 36, height: 36, marginTop: 2 },
  replyLabel: { fontSize: 10, fontWeight: '700', marginBottom: 6 },
  replyText: { fontSize: 14, lineHeight: 22 },
  thinkingText: { fontSize: 13, fontStyle: 'italic', flex: 1 },
  errorCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    backgroundColor: 'rgba(13,9,20,0.92)',
  },
  errorTitle: { color: '#f5f0ff', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  errorText: { fontSize: 13, lineHeight: 20 },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { fontSize: 12, fontWeight: '700' },
  noteStrip: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  noteText: { color: '#7c6899', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});