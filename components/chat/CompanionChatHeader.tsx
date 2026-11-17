// components/chat/CompanionChatHeader.tsx
// Top bar for companion-chat.tsx.
// Shows the selected companion's portrait, name, title, and a back button.
// No generic "Sekret" branding — the real companion identity is displayed.

import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  name: string;
  title: string;
  emoji: string;
  portrait: ImageSourcePropType | null;
  onBack: () => void;
};

export function CompanionChatHeader({ name, title, emoji, portrait, onBack }: Props) {
  return (
    <View style={s.bar}>
      <TouchableOpacity onPress={onBack} style={s.back} hitSlop={10}>
        <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
      </TouchableOpacity>

      {portrait ? (
        <Image source={portrait} style={s.portrait} />
      ) : (
        <View style={s.portraitFallback}>
          <Text style={s.emoji}>{emoji}</Text>
        </View>
      )}

      <View style={s.meta}>
        <Text style={s.name}>{name}</Text>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  back: {
    padding: 4,
    marginRight: 2,
  },
  portrait: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  portraitFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  meta: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  title: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    lineHeight: 16,
  },
});
