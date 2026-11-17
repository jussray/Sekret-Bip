/**
 * components/BipEmptyState.tsx
 *
 * Guardrails 13 + 14 — Error-state polish + App-wide Se'kret Bip tone.
 *
 * Covers all four states a screen can be in:
 *   loading  — soft spinner message
 *   empty    — warm invite to start
 *   error    — friendly save-failure with retry
 *   saveError— inline "couldn't save, try again" (non-blocking)
 *
 * Tone rule: warm, plain, teen-safe. No clinical robot language.
 * All copy lives here so the whole app updates from one place.
 *
 * Usage:
 *   <BipEmptyState type="loading" />
 *   <BipEmptyState type="empty" message="Nothing here yet — your words will live here." />
 *   <BipEmptyState type="error" onRetry={reload} />
 *   <BipEmptyState type="saveError" onRetry={save} />
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type BipEmptyType = 'loading' | 'empty' | 'error' | 'saveError';

interface Props {
  type: BipEmptyType;
  message?: string;
  /** Called when the retry button is pressed (error / saveError only). */
  onRetry?: () => void;
  /** Override accent colour. Defaults to lavender. */
  accent?: string;
}

const DEFAULTS: Record<BipEmptyType, { emoji: string; title: string; body: string; cta?: string }> = {
  loading: {
    emoji: '✨',
    title: 'Just a second…',
    body:  'Getting things ready for you.',
  },
  empty: {
    emoji: '🌙',
    title: 'Nothing here yet',
    body:  'This is your space. It\'s waiting for you.',
  },
  error: {
    emoji: '💜',
    title: 'Something got stuck',
    body:  'It\'s not you. Try again whenever you\'re ready.',
    cta:   'Try again',
  },
  saveError: {
    emoji: '📱',
    title: 'Couldn\'t save right now',
    body:  'Your entry is still here. Tap to try saving again.',
    cta:   'Save again',
  },
};

export function BipEmptyState({ type, message, onRetry, accent = '#c4b5fd' }: Props) {
  const cfg = DEFAULTS[type];

  return (
    <View style={styles.wrap}>
      {type === 'loading' ? (
        <ActivityIndicator size="large" color={accent} style={styles.spinner} />
      ) : (
        <Text style={styles.emoji}>{cfg.emoji}</Text>
      )}
      <Text style={[styles.title, { color: accent }]}>{cfg.title}</Text>
      <Text style={styles.body}>{message ?? cfg.body}</Text>
      {(type === 'error' || type === 'saveError') && onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={[styles.retryBtn, { borderColor: accent + '88', backgroundColor: accent + '18' }]}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={cfg.cta}
        >
          <Text style={[styles.retryText, { color: accent }]}>{cfg.cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 200,
  },
  spinner: { marginBottom: 16 },
  emoji:   { fontSize: 40, marginBottom: 12 },
  title:   { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body:    { fontSize: 14, color: '#b0a8d4', textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  retryBtn: {
    marginTop:        20,
    paddingHorizontal: 22,
    paddingVertical:   11,
    borderRadius:     20,
    borderWidth:      1.5,
  },
  retryText: { fontSize: 14, fontWeight: '700' },
});
