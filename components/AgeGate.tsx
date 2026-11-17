/**
 * components/AgeGate.tsx
 *
 * Confirms the person opening the app is in the supported teen range before
 * onboarding. Se'kret Bip supports teens ages 13–19; the separate age-out
 * experience begins at 20.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AGE_GATE_KEY = 'age_gate_status';
export type AgeGateStatus = 'teen' | 'guardian' | 'blocked';

interface Props {
  children: React.ReactNode;
  onResolved?: (status: AgeGateStatus) => void;
}

export function AgeGate({ children, onResolved }: Props) {
  const [status, setStatus] = useState<AgeGateStatus | 'unset' | 'loading'>('loading');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(AGE_GATE_KEY)
      .then(value => {
        if (!mounted) return;
        setStatus((value as AgeGateStatus) || 'unset');
      })
      .catch(() => {
        if (mounted) setStatus('unset');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const choose = async (next: AgeGateStatus) => {
    try {
      await AsyncStorage.setItem(AGE_GATE_KEY, next);
    } catch {}
    setStatus(next);
    onResolved?.(next);
  };

  if (status === 'loading') {
    return (
      <View style={styles.unsetRoot}>
        {children}
        <View style={styles.loadingCover} pointerEvents="auto">
          <Text style={styles.loadingMark}>SE’KRET BIP</Text>
        </View>
      </View>
    );
  }

  if (status === 'teen' || status === 'guardian') {
    return <>{children}</>;
  }

  if (status === 'blocked') {
    return (
      <View style={styles.root}>
        <Text style={styles.emoji}>💜</Text>
        <Text style={styles.title}>This space is for teens 13–19.</Text>
        <Text style={styles.body}>
          If you're under 13, Se'kret Bip isn't the right fit yet — ask a parent
          or guardian to come in with you, or have them set up the parent side.
        </Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => choose('teen')}>
          <Text style={styles.linkText}>Actually, I'm between 13 and 19</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.unsetRoot}>
      {children}
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Quick check before you come in</Text>
          <Text style={styles.body}>
            How old are you? This only helps us show you the right side of the app.
          </Text>

          <TouchableOpacity style={styles.optionBtn} onPress={() => choose('teen')}>
            <Text style={styles.optionText}>I'm 13–19</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionBtn} onPress={() => choose('guardian')}>
            <Text style={styles.optionText}>I'm a parent or guardian (18+)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionBtnSubtle} onPress={() => choose('blocked')}>
            <Text style={styles.optionTextSubtle}>I'm under 13</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0820',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  unsetRoot: { flex: 1 },
  loadingCover: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 3000,
    backgroundColor: '#0d0820',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMark: {
    color: '#e9d5ff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  backdrop: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 3000,
    backgroundColor: 'rgba(8,4,18,0.68)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#150b28',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(200,120,255,0.28)',
    borderBottomWidth: 0,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emoji: { fontSize: 40, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 14, color: '#c4b5fd', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  optionBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(200,120,255,0.5)',
    backgroundColor: 'rgba(200,120,255,0.12)',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionText: { color: '#e2d8ff', fontSize: 15, fontWeight: '700' },
  optionBtnSubtle: { paddingVertical: 10 },
  optionTextSubtle: { color: '#9b8ec4', fontSize: 13 },
  linkBtn: { marginTop: 20, paddingVertical: 10 },
  linkText: { color: '#9b8ec4', fontSize: 13, textDecorationLine: 'underline' },
});
