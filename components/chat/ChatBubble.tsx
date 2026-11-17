// components/chat/ChatBubble.tsx
// Renders a single chat message bubble.
// 'companion' bubbles sit left; 'user' bubbles sit right.
//
// Props added in Phase 3B:
//   accentColor — character hex colour (from COMPANION_PROFILES.accentColor).
//                 Drives companion bubble background tint so each character
//                 feels visually distinct.
//   tone        — backend tone string from the AI reply
//                 ('playful' | 'grounded' | 'concerned' | 'safety' | …).
//                 Deep / safety tones add a left-border accent so the UI
//                 mirrors the AI's emotional read without any explicit label.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Tones that warrant a visible left-border accent on the companion bubble.
const WEIGHTED_TONES = new Set([
  'concerned',
  'deep',
  'safety',
  'grief',
  'crisis',
  'emotional_support',
  'venting',
]);

type Props = {
  from: 'companion' | 'user';
  text: string;
  time: string;
  /** Character accent hex — e.g. '#FF4FA3' for Suhana. Optional; falls back to neutral. */
  accentColor?: string;
  /** Tone string returned by backend reply. Optional. */
  tone?: string;
};

export function ChatBubble({ from, text, time, accentColor, tone }: Props) {
  const isUser = from === 'user';
  const isWeighted = !isUser && !!tone && WEIGHTED_TONES.has(tone.toLowerCase());

  // Companion bubble background: character accent at low opacity, else neutral.
  const companionBg = accentColor
    ? hexToRgba(accentColor, 0.13)
    : 'rgba(255,255,255,0.08)';

  // Left border colour for emotional/safety tones.
  const borderColor = isWeighted && accentColor ? accentColor : 'transparent';

  return (
    <View style={[s.row, isUser ? s.rowUser : s.rowCompanion]}>
      <View
        style={[
          s.bubble,
          isUser
            ? s.bubbleUser
            : [s.bubbleCompanion, { backgroundColor: companionBg }],
          isWeighted && {
            borderLeftWidth: 3,
            borderLeftColor: borderColor,
            paddingLeft: 11, // compensate so text doesn't shift
          },
        ]}
      >
        <Text style={[s.text, isUser ? s.textUser : s.textCompanion]}>
          {text}
        </Text>
        <Text style={[s.time, isUser ? s.timeUser : s.timeCompanion]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Convert 6-digit hex to rgba string. Returns fallback on bad input. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  row: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowCompanion: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: 'rgba(217,70,239,0.28)',
    borderBottomRightRadius: 4,
  },
  bubbleCompanion: {
    // backgroundColor set dynamically above
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: '#f3e8ff',
  },
  textCompanion: {
    color: '#e8e3f0',
  },
  time: {
    fontSize: 11,
    marginTop: 4,
  },
  timeUser: {
    color: 'rgba(243,232,255,0.45)',
    textAlign: 'right',
  },
  timeCompanion: {
    color: 'rgba(232,227,240,0.40)',
    textAlign: 'left',
  },
});
