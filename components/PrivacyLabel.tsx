/**
 * components/PrivacyLabel.tsx
 *
 * Guardrail 4 — Parent privacy guardrail.
 *
 * A small inline tag shown next to journal entries, mood logs,
 * and circle posts so the teen always knows what their parent can see.
 *
 * Two variants:
 *   shared  → "Shared with parent" (lavender)
 *   private → "Private to me" (soft indigo)
 *
 * Usage:
 *   <PrivacyLabel shared={entry.sharedWithParent} />
 *
 * The parent-side screens should also consume this so parents
 * see the same label and understand it is consent-based.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  /** If true → "Shared with parent". If false → "Private to me". */
  shared: boolean;
  /** Small mode removes vertical padding — use inside list items. */
  compact?: boolean;
}

export function PrivacyLabel({ shared, compact = false }: Props) {
  return (
    <View
      style={[
        styles.pill,
        compact && styles.pillCompact,
        shared ? styles.sharedBg : styles.privateBg,
      ]}
      accessibilityLabel={shared ? 'Shared with parent' : 'Private to me'}
      accessibilityRole="text"
    >
      <Text style={[styles.text, shared ? styles.sharedText : styles.privateText]}>
        {shared ? '👀 Shared with parent' : '🔒 Private to me'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf:        'flex-start',
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:     14,
    borderWidth:      1,
    marginTop:        4,
  },
  pillCompact: {
    paddingVertical: 2,
  },
  sharedBg:   { backgroundColor: 'rgba(200,120,255,0.12)', borderColor: 'rgba(200,120,255,0.35)' },
  privateBg:  { backgroundColor: 'rgba(80,60,160,0.14)',  borderColor: 'rgba(100,80,200,0.30)' },
  text:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  sharedText: { color: '#d8aaff' },
  privateText:{ color: '#9b8ec4' },
});
