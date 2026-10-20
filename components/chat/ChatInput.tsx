// components/chat/ChatInput.tsx
// Multiline text input + send button for companion-chat.tsx.
// Calls onSend with the trimmed text and resets itself.

import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, disabled = false, placeholder }: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={s.row}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder ?? 'say anything…'}
        placeholderTextColor="rgba(255,255,255,0.30)"
        style={s.input}
        multiline
        maxLength={500}
        editable={!disabled}
        returnKeyType="default"
      />
      <TouchableOpacity
        onPress={handleSend}
        style={[s.btn, !canSend && s.btnDisabled]}
        disabled={!canSend}
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#ff4dff', '#d946ef']} style={s.btnGrad}>
          <Ionicons name="send" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    maxHeight: 100,
  },
  btn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnGrad: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
});
