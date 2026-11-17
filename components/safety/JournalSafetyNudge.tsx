/**
 * components/safety/JournalSafetyNudge.tsx
 *
 * #415: mild/moderate safety tiers in the journal surface must produce a
 * supportive nudge WITHOUT interrupting writing — not the full blocking
 * SafetyExperienceSheet modal every other tier/surface uses.
 *
 * Caller contract: only render this for experience.tier !== 'immediate_danger'.
 * High-risk content always goes through SafetyExperienceSheet instead, on
 * every surface — this component never carries crisis resources or actions.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  acknowledgeAlert,
  TIER_META,
  type SafetyAction,
  type SafetyExperience,
} from '../../src/features/safety/safetyCoordinator';

interface Props {
  experience: SafetyExperience;
  onDismiss: () => void;
}

export function JournalSafetyNudge({ experience, onDismiss }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [reduceMotion, fade, experience.alertId, experience.tier]);

  const { tier, companionMessage, actions, alertId } = experience;
  const { label: tierLabel, color: tierColor } = TIER_META[tier];

  const ack = async () => {
    if (alertId !== undefined) {
      await acknowledgeAlert(alertId).catch(() => {});
    }
  };

  const handleAction = async (target: SafetyAction['target']) => {
    await ack();
    if (target === 'comfort') router.push('/(teen)/comfort' as any);
    if (target === 'bridge') router.push({ pathname: '/(teen)/bridge', params: { compose: 'true' } } as any);
    onDismiss();
  };

  return (
    <Animated.View
      style={[styles.card, { borderColor: `${tierColor}55`, opacity: fade }]}
      accessibilityRole="alert"
      accessibilityLabel={`${tierLabel}. ${companionMessage}`}
    >
      <Text style={[styles.tierLabel, { color: tierColor }]}>{tierLabel}</Text>
      <Text style={styles.message}>{companionMessage}</Text>
      <View style={styles.actionsRow}>
        {actions.map(a => (
          <TouchableOpacity
            key={a.target}
            style={[styles.actionBtn, a.target === 'dismiss' && styles.actionDismiss]}
            onPress={() => handleAction(a.target)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <Text
              style={[
                styles.actionText,
                { color: a.target === 'dismiss' ? '#94a3b8' : tierColor },
              ]}
            >
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Non-blocking by construction: position: 'absolute' takes this out of the
  // normal flex flow entirely, so it floats above the compose area instead
  // of displacing or covering it — the teen can keep writing underneath it.
  // Anchored above the bottom-80 floating controls (GlobalMoodButton /
  // CrisisSupportButton) from app/(teen)/_layout.tsx so it clears them.
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 140,
    zIndex: 50,
    elevation: 20,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(19,8,37,0.92)',
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  message: { fontSize: 14, lineHeight: 20, color: '#f0ebff', marginBottom: 10 },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(196,181,253,0.12)',
  },
  actionDismiss: { backgroundColor: 'transparent' },
  actionText: { fontSize: 12, fontWeight: '700' },
});
