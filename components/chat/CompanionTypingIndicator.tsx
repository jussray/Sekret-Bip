// components/chat/CompanionTypingIndicator.tsx
// Shown while awaiting the companion's reply.
// Uses the companion's real name and emoji — never a generic label.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = {
  name: string;
  emoji: string;
};

export function CompanionTypingIndicator({ name, emoji }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={s.row}>
      <Text style={s.emoji}>{emoji}</Text>
      <Animated.Text style={[s.label, { opacity }]}>
        {name} is with you…
      </Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
