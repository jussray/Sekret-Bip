import React, { useState, useRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useOnboarding } from '@/context/OnboardingContext';

const PURPLE     = '#7c3aed';
const BG         = '#0a0a0a';
const TEXT       = '#f3f3f5';
const MUTED      = '#8b7fa0';

const STEPS     = 4;
const STEP_IDX  = 1; // 0-based; this is step 2 of 4 (post-signup)

export default function NameScreen() {
  const { advance } = useOnboarding();
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);
  const ready = name.trim().length > 0;

  async function handleNext() {
    if (!ready) return;
    Keyboard.dismiss();
    await AsyncStorage.setItem('bip_onboarding_name', name.trim());
    await advance('name_set');
    router.push('/(onboarding)/identity');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.bgDot1} pointerEvents="none" />
      <View style={styles.bgDot2} pointerEvents="none" />

      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === STEP_IDX && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>What should{`\n`}Se'kret call you?</Text>
        <Text style={styles.sub}>A nickname, your name — whatever feels like you.</Text>

        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder="your name here"
            placeholderTextColor="#4a4357"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleNext}
            maxLength={32}
            autoFocus
            accessibilityLabel="Your name or nickname"
          />
          <View style={[styles.inputUnderline, ready && styles.inputUnderlineActive]} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={!ready}
          onPress={handleNext}
          style={[styles.btn, !ready && styles.btnDisabled]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text style={styles.btnText}>That's me →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:                 { flex: 1, backgroundColor: BG },
  bgDot1:               { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: '#4c1d9520', top: -80, right: -100 },
  bgDot2:               { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#7c3aed12', bottom: 60, left: -80 },
  content:              { flex: 1, paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingHorizontal: 28 },
  back:                 { marginBottom: 28 },
  backText:             { color: MUTED, fontSize: 22 },
  stepDots:             { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot:                  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive:            { backgroundColor: PURPLE, width: 18, borderRadius: 3 },
  title:                { color: TEXT, fontSize: 34, fontWeight: '900', lineHeight: 42, marginBottom: 10 },
  sub:                  { color: MUTED, fontSize: 14, lineHeight: 22, marginBottom: 52 },
  inputWrap:            { paddingBottom: 8 },
  input:                { color: TEXT, fontSize: 30, fontWeight: '800', paddingBottom: 8 },
  inputUnderline:       { height: 2, borderRadius: 1, backgroundColor: '#ffffff18' },
  inputUnderlineActive: { backgroundColor: PURPLE },
  footer:               { paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 52 : 36 },
  btn:                  { height: 58, borderRadius: 20, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  btnDisabled:          { opacity: 0.35, shadowOpacity: 0 },
  btnText:              { color: '#fff', fontSize: 17, fontWeight: '900' },
});
