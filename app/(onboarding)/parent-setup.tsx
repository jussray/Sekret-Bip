import React, { useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { useVerificationContext } from '@/context/VerificationContext';
import {
  saveAccountProfile,
  submitGuardianVerification,
  type ParentFocus,
  type ParentRoomStyle,
} from '@/features/identity/accountProfile';
import { fetchPostAuthBootstrap } from '@/services/auth/postAuthBootstrap';
import { advanceStage, markActivated } from '@/services/onboarding';
import { getSupabase } from '@/utils/supabase';

const FOCUS_OPTIONS: { id: ParentFocus; label: string; emoji: string }[] = [
  { id: 'support', label: 'Support', emoji: '🤝' },
  { id: 'listen', label: 'Listen', emoji: '👂' },
  { id: 'repair', label: 'Repair', emoji: '🌱' },
  { id: 'learn', label: 'Learn', emoji: '📖' },
];

const ROOM_STYLE_OPTIONS: { id: ParentRoomStyle; label: string; emoji: string; desc: string }[] = [
  { id: 'mom', label: 'Mom', emoji: '💜', desc: 'Mom Room' },
  { id: 'dad', label: 'Dad', emoji: '👑', desc: 'Dad Room' },
];

export default function ParentSetup() {
  const { setUserSide, setParentRoomStyle } = useAppContext();
  const { refreshVerification } = useVerificationContext();
  const [name, setName] = useState('');
  const [roomStyle, setRoomStyle] = useState<ParentRoomStyle | null>(null);
  const [focus, setFocus] = useState<ParentFocus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const underline = useRef(new Animated.Value(0)).current;

  function handleNameChange(text: string) {
    setName(text);
    setError(null);
    Animated.timing(underline, {
      toValue: text.length > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }

  const ready = name.trim().length > 0 && roomStyle !== null && focus !== null && !saving;

  async function handleFinish() {
    const privateDisplayName = name.trim();
    if (!privateDisplayName || !roomStyle || !focus || saving) return;
    const selectedRoomStyle = roomStyle;
    const selectedFocus = focus;
    setSaving(true);
    setError(null);
    Keyboard.dismiss();
    try {
      const bootstrap = await fetchPostAuthBootstrap('parent');
      if (!bootstrap.requiredConsentsComplete) {
        router.replace(bootstrap.nextRoute as never);
        return;
      }

      await saveAccountProfile({
        accountSide: 'parent',
        privateDisplayName,
        onboardingComplete: true,
        parentRoomStyle: selectedRoomStyle,
        parentFocus: selectedFocus,
        circleNickname: 'Guardian Bip',
        circleAvatarEmoji: selectedRoomStyle === 'dad' ? '👑' : '💜',
      });
      await submitGuardianVerification();

      getSupabase()?.auth.getUser().then(({ data }) => {
        if (!data.user) return;
        advanceStage(data.user.id, 'parent_setup_complete').catch(() => null);
        markActivated(data.user.id, 'onboarding_complete').catch(() => null);
      });

      setUserSide('parent');
      setParentRoomStyle(selectedRoomStyle);
      await refreshVerification();
      router.replace('/(onboarding)/parent-link');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your Parent profile.');
    } finally {
      setSaving(false);
    }
  }

  const underlineColor = underline.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff14', '#a7f3d0'],
  });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#071410', '#0d1f18', '#08140f']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.step}>PARENT SETUP</Text>
        <Text style={styles.title}>Quick intro,{`\n`}then connect.</Text>
        <Text style={styles.intro}>
          Finish your Parent profile, then enter your teen’s private code or continue to guardian review and link later.
        </Text>

        <Text style={styles.label}>What should your teen call you?</Text>
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Mom, Dad, Titi…"
            placeholderTextColor="#3d5e4a"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            maxLength={32}
            autoFocus
          />
          <Animated.View style={[styles.inputUnderline, { backgroundColor: underlineColor }]} />
        </TouchableOpacity>

        <Text style={styles.label}>You are</Text>
        <View style={styles.grid}>
          {ROOM_STYLE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.8}
              onPress={() => { setRoomStyle(opt.id); setError(null); }}
              style={[styles.card, roomStyle === opt.id && styles.cardActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: roomStyle === opt.id }}
            >
              <Text style={styles.cardEmoji}>{opt.emoji}</Text>
              <Text style={[styles.cardText, roomStyle === opt.id && styles.cardTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>Shapes your Room art and greeting. You can change this later in Settings.</Text>

        <Text style={[styles.label, styles.labelSpaced]}>What's your main intention here?</Text>
        <View style={styles.grid}>
          {FOCUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.8}
              onPress={() => { setFocus(opt.id); setError(null); }}
              style={[styles.card, focus === opt.id && styles.cardActive]}
            >
              <Text style={styles.cardEmoji}>{opt.emoji}</Text>
              <Text style={[styles.cardText, focus === opt.id && styles.cardTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity disabled={!ready} onPress={handleFinish} style={[styles.btn, !ready && styles.btnDisabled]} activeOpacity={0.85}>
          <Text style={styles.btnText}>{saving ? 'saving…' : 'Continue to private code →'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08140f' },
  scroll: { paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingHorizontal: 28, paddingBottom: 24 },
  back: { marginBottom: 28 },
  backText: { color: '#789082', fontSize: 22 },
  step: { color: '#6ee7b7', fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginBottom: 10 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 40, marginBottom: 12 },
  intro: { color: '#8aaf9c', fontSize: 13, lineHeight: 20, marginBottom: 32 },
  label: { color: '#8aaf9c', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 14 },
  labelSpaced: { marginTop: 24 },
  hint: { color: '#3d5e4a', fontSize: 11, lineHeight: 16, marginTop: 10 },
  inputWrap: { marginBottom: 36, paddingBottom: 8 },
  input: { color: '#fff', fontSize: 28, fontWeight: '800', paddingBottom: 8 },
  inputUnderline: { height: 2, borderRadius: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', height: 72, borderRadius: 20, borderWidth: 1.5, borderColor: '#ffffff10', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cardActive: { borderColor: '#a7f3d0', backgroundColor: 'rgba(167,243,208,0.12)' },
  cardEmoji: { fontSize: 20 },
  cardText: { color: '#789082', fontSize: 13, fontWeight: '800' },
  cardTextActive: { color: '#a7f3d0' },
  error: { color: '#fca5a5', fontSize: 13, lineHeight: 19, marginTop: 24 },
  footer: { paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 52 : 36 },
  btn: { height: 58, borderRadius: 20, backgroundColor: '#a7f3d0', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#062015', fontSize: 17, fontWeight: '900' },
});