/**
 * components/ContentSafetyBlock.tsx
 *
 * Guardrail 7 — Content safety guardrail.
 *
 * Shown instead of a post/image when content is flagged as unsafe.
 * Tone rules:
 *   - No shame language.
 *   - Warm and direct.
 *   - Always gives the teen a path forward (edit + retry).
 *
 * Usage:
 *   {contentBlocked && (
 *     <ContentSafetyBlock onEdit={openEditor} />
 *   )}
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  /** Called when the teen taps "Edit and try again". */
  onEdit?: () => void;
  /** Custom explanation. Defaults to the standard message. */
  message?: string;
}

export function ContentSafetyBlock({ onEdit, message }: Props) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="alert"
      accessibilityLabel="This post couldn't be shared"
    >
      <Text style={styles.emoji}>💜</Text>
      <Text style={styles.title}>This one didn't go through</Text>
      <Text style={styles.body}>
        {message ??
          "Something in this post flagged our safety check.\nYou can edit it and try posting again — no worries."}
      </Text>
      {onEdit && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onEdit}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Edit and try again"
        >
          <Text style={styles.editBtnText}>Edit and try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius:    18,
    backgroundColor: 'rgba(100,60,160,0.14)',
    borderColor:     'rgba(150,100,220,0.30)',
    borderWidth:     1,
    padding:         20,
    alignItems:      'center',
    marginVertical:  8,
  },
  emoji: { fontSize: 28, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#e2d8ff', marginBottom: 8, textAlign: 'center' },
  body:  { fontSize: 13, color: '#b0a8d4', textAlign: 'center', lineHeight: 20 },
  editBtn: {
    marginTop:        16,
    paddingHorizontal: 20,
    paddingVertical:   10,
    borderRadius:     18,
    borderWidth:      1.5,
    borderColor:      'rgba(196,181,253,0.5)',
    backgroundColor:  'rgba(196,181,253,0.12)',
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#c4b5fd' },
});
