/**
 * components/SleepGate.tsx
 *
 * Guardrail 5 — Sleep hours guardrail.
 *
 * When the teen is in their configured sleep window:
 *   - Renders a soft, non-punishing full-screen overlay.
 *   - Blocks normal app navigation.
 *   - ALWAYS allows Comfort / Emergency Comfort through (pass allowComfort=true).
 *   - ALWAYS allows the overlay to be dismissed for Comfort.
 *
 * The component does NOT block the whole app — it wraps specific screens
 * (Home, Pages, etc.) and shows itself when the guard is active.
 * Comfort screens receive allowComfort and always render children directly.
 *
 * Usage:
 *   // In a screen that should be gated:
 *   <SleepGate sleepActive={isSleepTime} onComfort={goToComfort}>
 *     {normalScreenContent}
 *   </SleepGate>
 *
 *   // In ComfortScreen — always passes through:
 *   <SleepGate sleepActive={isSleepTime} allowComfort>
 *     {comfortContent}
 *   </SleepGate>
 */

import React from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  /** Whether sleep mode is currently active. If false, children render normally. */
  sleepActive: boolean;
  /** If true, this is Comfort — always render children, never block. */
  allowComfort?: boolean;
  /** Called when the teen taps "Go to Comfort" from the sleep gate. */
  onComfort?: () => void;
  /** The screen content to render when not gated. */
  children?: React.ReactNode;
}

export function SleepGate({ sleepActive, allowComfort = false, onComfort, children }: Props) {
  // Comfort + Emergency screens always pass through — safety rule.
  if (!sleepActive || allowComfort) {
    return <>{children}</>;
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0b0622', '#1a0a3e', '#0b0622']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Text style={styles.moon}>🌙</Text>
        <Text style={styles.title}>Sleep time, friend</Text>
        <Text style={styles.body}>
          You set quiet hours so you can actually rest.{`\n`}
          The app will be here when you wake up. 💜
        </Text>
        <Text style={styles.sub}>
          Need something right now?
        </Text>
        {onComfort && (
          <TouchableOpacity
            style={styles.comfortBtn}
            onPress={onComfort}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Go to Comfort — always available"
          >
            <Text style={styles.comfortBtnText}>💜 Comfort is always open</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0622',
  },
  content: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    padding: 36,
  },
  moon:   { fontSize: 52, marginBottom: 18 },
  title:  { fontSize: 24, fontWeight: '800', color: '#e2d8ff', marginBottom: 14, textAlign: 'center' },
  body:   { fontSize: 15, color: '#b0a8d4', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  sub:    { fontSize: 13, color: '#7a6fa8', marginBottom: 16, textAlign: 'center' },
  comfortBtn: {
    paddingHorizontal: 24,
    paddingVertical:   13,
    borderRadius:      24,
    borderWidth:       1.5,
    borderColor:       'rgba(196,181,253,0.5)',
    backgroundColor:   'rgba(196,181,253,0.12)',
  },
  comfortBtnText: {
    fontSize:   15,
    fontWeight: '700',
    color:      '#c4b5fd',
  },
});
