// screens/BridgeScreen.tsx
// Se'kret Bip — Bridge Screen (Teen Side)
// Phase 1 polish: time-of-day backdrop, char-aware tone, mood glow,
// staggered entrance, breath badge, sticky note, send confirmation glow.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Animated,
  StyleSheet,
  Platform,
  Alert,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg, TimeOfDay } from '../constants/theme';
import type { BridgePayload } from '../types/index';

interface BridgeScreenProps {
  t:             Record<string, any>;
  currentSekret: Record<string, any>;
  setScreen:     (screen: string) => void;
  BottomNav:     React.ReactNode;
  selectedSekret?: string;
  mood?:         string;
}

const SHARE_TYPES = [
  { id: 'mood',    emoji: '💜', label: 'My Mood',     placeholder: "tell them how you're feeling…" },
  { id: 'thought', emoji: '💭', label: 'A Thought',    placeholder: 'something on your mind…' },
  { id: 'need',    emoji: '🌿', label: 'Something I Need', placeholder: 'what would help right now…' },
  { id: 'win',     emoji: '⚡', label: 'A Win',         placeholder: 'something good that happened…' },
];

const CONV_MODES = [
  { id: 'soft',     emoji: '🌸', label: 'Soft Start',     hint: 'Ease in gently — no pressure to say it all.',          tone: 'soft' },
  { id: 'honest',   emoji: '💜', label: 'Honest Version',  hint: 'Say the full truth. No editing, no softening.',        tone: 'direct' },
  { id: 'boundary', emoji: '🛡️', label: 'Calm Boundary',   hint: 'Set a limit with kindness — you stay in control.',     tone: 'firm' },
  { id: 'safety',   emoji: '🫶', label: 'Safety Check',    hint: 'Check that your message lands the way you mean it.',   tone: 'check' },
] as const;
type ConvModeId = (typeof CONV_MODES)[number]['id'];

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
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

export function BridgeScreen({
  t, currentSekret, setScreen, BottomNav, selectedSekret, mood,
}: BridgeScreenProps) {
  const [shareType, setShareType]   = useState<string | null>(null);
  const [convMode, setConvMode]     = useState<ConvModeId | null>(null);
  const [message, setMessage]       = useState('');
  const [sent, setSent]             = useState(false);

  const selectedType = SHARE_TYPES.find(s => s.id === shareType);
  const isRylane = selectedSekret === 'rylane';
  const charLabel = isRylane ? 'rylane' : 'raylene';
  const charKey: 'raylene' | 'rylane' = isRylane ? 'rylane' : 'raylene';

  const time = useMemo(() => getTimeOfDay(), []);
  const bg   = useMemo(() => getRoomBg(charKey, time), [charKey, time]);
  const glow = useMemo(() => moodGlow(mood), [mood]);

  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fade3 = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = (val: Animated.Value, delay: number) =>
      Animated.timing(val, {
        toValue: 1, duration: 380, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
    Animated.parallel([stagger(fade1, 0), stagger(fade2, 160), stagger(fade3, 320)]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fade1, fade2, fade3, breath]);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const cardStyle = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  const handleSend = () => {
    if (!shareType || !message.trim()) {
      Alert.alert('almost there', 'pick a share type and write your message first.');
      return;
    }

    const payload: BridgePayload = {
      shareTypeLabel: selectedType?.label,
      preview:        message.trim().slice(0, 80),
      sharedAt:       new Date().toISOString(),
      softPrompt:     `${currentSekret?.name ?? 'Bip'} helped share this.`,
    };

    if (__DEV__) console.log('[BridgeScreen] Bridge payload:', payload);

    setSent(true);
    setMessage('');
    setShareType(null);
  };

  const heroCopy = isRylane
    ? "share something with your person. no pressure. no big speech."
    : "share something with your person — softly. no full explanation needed.";

  if (sent) {
    return (
      <View style={styles.root}>
        <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: glow + '14' }]} />

        <ScrollView contentContainerStyle={styles.container}>
          <Animated.View style={cardStyle(fade1)}>
            <Text style={styles.logo}>🌉 bridge</Text>
            <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.88)', borderColor: glow, shadowColor: glow, alignItems: 'center', paddingVertical: 32 }]}>
              <Animated.Text style={[styles.sentEmoji, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}>💌</Animated.Text>
              <Text style={styles.sentTitle}>sent to your person.</Text>
              <Text style={styles.sentSub}>
                they'll see it as a gentle note. you did something brave 💜
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: glow, marginTop: 18 }]}
                onPress={() => setSent(false)}
              >
                <Text style={styles.buttonText}>send another</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ghostButton, { borderColor: glow }]}
                onPress={() => setScreen('home')}
              >
                <Text style={[styles.ghostButtonText, { color: '#e9defc' }]}>back to room</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          {BottomNav}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glow + '12' }]} />

      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View style={cardStyle(fade1)}>
          <Text style={styles.logo}>🌉 bridge</Text>
          <Text style={styles.subtitle}>{heroCopy}</Text>

          <Animated.View
            style={[
              styles.energyBadge,
              { borderColor: glow, shadowColor: glow, shadowOpacity: 0.6, shadowRadius: 12 },
              { transform: [{ scale: breathScale }], opacity: breathOpacity },
            ]}
          >
            <Text style={[styles.energyText, { color: glow }]}>
              {charLabel} helps you bridge it · you stay in control
            </Text>
          </Animated.View>
        </Animated.View>

        <Animated.View style={cardStyle(fade2)}>
          <Text style={[styles.sectionLabel, { color: '#cbb6f7' }]}>what do you want to share?</Text>
          <View style={styles.typeRow}>
            {SHARE_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: shareType === type.id ? glow : 'rgba(20,12,40,0.75)',
                    borderColor:     shareType === type.id ? glow : glow + '55',
                  },
                ]}
                onPress={() => setShareType(type.id)}
              >
                <Text style={styles.typeEmoji}>{type.emoji}</Text>
                <Text style={[styles.typeLabel, { color: shareType === type.id ? '#fff' : '#e9defc' }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {shareType && (
            <>
              <Text style={[styles.sectionLabel, { color: '#cbb6f7', marginTop: 4 }]}>how do you want to say it?</Text>
              <View style={[styles.typeRow, { marginBottom: 14 }]}>
                {CONV_MODES.map(mode => (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: convMode === mode.id ? glow : 'rgba(20,12,40,0.75)',
                        borderColor:     convMode === mode.id ? glow : glow + '55',
                      },
                    ]}
                    onPress={() => setConvMode(mode.id)}
                  >
                    <Text style={styles.typeEmoji}>{mode.emoji}</Text>
                    <Text style={[styles.typeLabel, { color: convMode === mode.id ? '#fff' : '#e9defc', fontSize: 12 }]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {convMode && (
                <View style={[styles.convModeHint, { borderColor: glow + '55', backgroundColor: 'rgba(30,18,55,0.65)' }]}>
                  <Text style={[styles.convModeHintText, { color: '#cbb6f7' }]}>
                    {CONV_MODES.find(m => m.id === convMode)?.hint}
                  </Text>
                </View>
              )}

              <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.85)', borderColor: glow + '88', shadowColor: glow }]}>
                <Text style={[styles.cardLabel, { color: glow }]}>
                  {selectedType?.emoji} {selectedType?.label}
                </Text>
                <TextInput
                  style={[styles.input, { color: '#fff', borderColor: glow + '66' }]}
                  placeholder={selectedType?.placeholder}
                  placeholderTextColor="#7c6b98"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  maxLength={280}
                />
                <Text style={[styles.charCount, { color: '#cbb6f7' }]}>
                  {message.length}/280
                </Text>
              </View>
            </>
          )}
        </Animated.View>

        <Animated.View style={cardStyle(fade3)}>
          <View style={styles.stickyNote}>
            <Text style={styles.stickyText}>
              {isRylane
                ? '“share what you can. they don’t need the whole story.”'
                : '“soft is brave. you don’t have to explain everything.”'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: shareType && message.trim() ? glow : 'rgba(50,35,80,0.6)',
                opacity:          shareType && message.trim() ? 1 : 0.6,
              },
            ]}
            onPress={handleSend}
            disabled={!shareType || !message.trim()}
          >
            <Text style={styles.buttonText}>🌉 send to bridge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ghostButton, { borderColor: glow + '88' }]}
            onPress={() => setScreen('home')}
          >
            <Text style={[styles.ghostButtonText, { color: '#cbb6f7' }]}>back to room</Text>
          </TouchableOpacity>
        </Animated.View>

        {BottomNav}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e0820' },
  container:       { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  logo:            { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle:        { fontSize: 14, color: '#cbb6f7', textAlign: 'center', marginBottom: 14, fontStyle: 'italic', lineHeight: 20 },
  energyBadge:     { alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16 },
  energyText:      { fontSize: 12, fontWeight: '600' },

  sectionLabel:    { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  typeRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  typeEmoji:       { fontSize: 18 },
  typeLabel:       { fontSize: 14, fontWeight: '600' },

  card:            { padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1, shadowOpacity: 0.4, shadowRadius: 14 },
  cardLabel:       { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input:           { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, minHeight: 110, textAlignVertical: 'top', marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.35)' },
  charCount:       { fontSize: 12, textAlign: 'right' },

  convModeHint:    { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  convModeHintText: { fontSize: 13, fontStyle: 'italic', lineHeight: 19 },

  stickyNote:      { backgroundColor: '#fff8e7', borderColor: '#7c3aed', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12, marginBottom: 14, transform: [{ rotate: '-2deg' }] },
  stickyText:      { color: '#3a2461', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 19 },

  button:          { padding: 16, borderRadius: 18, marginBottom: 12, alignItems: 'center' },
  buttonText:      { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  ghostButton:     { padding: 14, borderRadius: 18, marginBottom: 12, alignItems: 'center', borderWidth: 1 },
  ghostButtonText: { fontSize: 14, fontWeight: '600' },

  sentEmoji:       { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  sentTitle:       { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  sentSub:         { fontSize: 14, color: '#e9defc', textAlign: 'center', lineHeight: 21 },
});
