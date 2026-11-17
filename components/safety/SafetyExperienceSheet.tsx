/**
 * components/safety/SafetyExperienceSheet.tsx
 *
 * Renders a SafetyExperience from safetyCoordinator as a bottom sheet.
 *
 * Three visual tiers:
 *   emotional_support   — soft purple, companion check-in copy
 *   concerning_pattern  — amber, Comfort + Bridge actions
 *   immediate_danger    — red, crisis lines front-and-center
 *
 * Handles all action targets:
 *   call_988 / text_741741  — Linking deep-links (tel: / sms:)
 *   comfort / bridge        — Expo Router push
 *   journal / dismiss       — local state
 *
 * On any action or dismiss: calls acknowledgeAlert(alertId) if alertId present.
 * Failed support actions are surfaced honestly instead of being silently treated
 * as successful.
 */

import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  acknowledgeAlert,
  type SafetyAction,
  type SafetyExperience,
} from '@/features/safety/safetyCoordinator';

interface Props {
  experience: SafetyExperience | null;
  onDismiss: () => void;
}

const TIER_META = {
  emotional_support:  { label: '💜 here with you', color: '#c4b5fd' },
  concerning_pattern: { label: '💛 checking in', color: '#fbbf24' },
  immediate_danger:   { label: '🚨 right here', color: '#f87171' },
};

const FALSE_PARENT_NOTIFICATION_CLAIM = 'Your parent has been quietly notified.';
const VOLUNTARY_SUPPORT_REPLACEMENT = 'If you want someone you trust to know, Bridge can help you reach them.';
const TRUST_BOUNDARY_NOTICE =
  'Bip is not monitoring what you write. Bip can help you contact someone, but cannot promise they will answer.';

export function SafetyExperienceSheet({ experience, onDismiss }: Props) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(340)).current;

  useEffect(() => {
    if (experience) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 52,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(340);
    }
  }, [experience]);

  if (!experience) return null;

  const { tier, companionMessage, actions, resources, parentNotified, alertId } = experience;
  const { label: tierLabel, color: tierColor } = TIER_META[tier];

  const displayedMessage = companionMessage.replace(
    FALSE_PARENT_NOTIFICATION_CLAIM,
    VOLUNTARY_SUPPORT_REPLACEMENT,
  );

  const ack = async () => {
    if (alertId !== undefined) {
      await acknowledgeAlert(alertId).catch(() => {});
    }
  };

  const handleDismiss = async () => {
    await ack();
    onDismiss();
  };

  const handleAction = async (target: SafetyAction['target']) => {
    await ack();
    try {
      switch (target) {
        case 'call_988':
          await Linking.openURL('tel:988');
          break;
        case 'text_741741':
          await Linking.openURL('sms:741741&body=HOME');
          break;
        case 'comfort':
          router.push('/(teen)/comfort' as any);
          break;
        case 'bridge':
          router.push({ pathname: '/(teen)/bridge', params: { compose: 'true' } } as any);
          break;
        case 'journal':
          router.push('/(teen)/pages' as any);
          break;
        case 'dismiss':
          break;
      }
      onDismiss();
    } catch (error) {
      console.error('Failed to open selected support option', error);
      Alert.alert(
        'That option did not open',
        'Please try another support option. Bip has not confirmed that anyone was contacted.',
      );
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity
        style={s.backdrop}
        activeOpacity={1}
        onPress={handleDismiss}
        accessibilityRole="none"
        accessibilityLabel="Close"
      >
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[s.accentStrip, { backgroundColor: tierColor }]} />
          <Text style={[s.tierLabel, { color: tierColor }]}>{tierLabel}</Text>
          <Text style={s.message}>{displayedMessage}</Text>

          {tier === 'immediate_danger' && (
            <Text style={s.trustBoundaryNote}>{TRUST_BOUNDARY_NOTICE}</Text>
          )}

          {parentNotified && (
            <Text style={s.parentNote}>
              A caregiver notification was recorded for this safety event.
            </Text>
          )}

          {resources.length > 0 && (
            <View style={s.resourcesWrap}>
              {resources.map(r => (
                <TouchableOpacity
                  key={r.action}
                  style={[s.resourceBtn, { borderColor: tierColor + '88' }]}
                  onPress={() => handleAction(r.action === 'call_911' ? 'call_988' : r.action)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                >
                  <Text style={[s.resourceLabel, { color: tierColor }]}>{r.label}</Text>
                  <Text style={s.resourceDetail}>{r.detail}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={s.actionsWrap}>
            {actions.map(a => {
              const isCrisis = a.target === 'call_988' || a.target === 'text_741741';
              const isDismiss = a.target === 'dismiss';
              return (
                <TouchableOpacity
                  key={a.target}
                  style={[
                    s.actionBtn,
                    isCrisis && [s.actionCrisis, { borderColor: tierColor }],
                    isDismiss && s.actionDismiss,
                  ]}
                  onPress={() => handleAction(a.target)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                >
                  <Text
                    style={[
                      s.actionText,
                      isCrisis && [s.actionCrisisText, { color: tierColor }],
                      isDismiss && s.actionDismissText,
                    ]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,2,18,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#130825',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,181,253,0.15)',
  },
  accentStrip: { width: 48, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, opacity: 0.85 },
  tierLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },
  message: { fontSize: 16, fontWeight: '500', color: '#f0ebff', lineHeight: 24, marginBottom: 16 },
  trustBoundaryNote: { fontSize: 12, lineHeight: 18, color: '#cbd5e1', marginBottom: 16 },
  parentNote: { fontSize: 12, color: '#a78bfa', fontStyle: 'italic', marginBottom: 16 },
  resourcesWrap: { gap: 10, marginBottom: 16 },
  resourceBtn: { borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: 'rgba(248,113,113,0.08)' },
  resourceLabel: { fontSize: 14, fontWeight: '800', color: '#f87171', marginBottom: 3 },
  resourceDetail: { fontSize: 12, color: '#fca5a5' },
  actionsWrap: { gap: 10 },
  actionBtn: { borderRadius: 18, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(196,181,253,0.12)', borderWidth: 1, borderColor: 'rgba(196,181,253,0.28)' },
  actionCrisis: { backgroundColor: 'rgba(248,113,113,0.10)', borderWidth: 1.5 },
  actionDismiss: { backgroundColor: 'transparent', borderColor: 'rgba(148,163,184,0.2)' },
  actionText: { fontSize: 14, fontWeight: '700', color: '#c4b5fd' },
  actionCrisisText: { fontSize: 14, fontWeight: '900' },
  actionDismissText: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },
});
