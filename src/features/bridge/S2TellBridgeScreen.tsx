import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { fetchSekretReply } from '@/utils/api';
import { sendS2TellShare } from '@/features/bridge/bridgeShareCompat';
import { useAppContext } from '@/context/AppContext';

const TONES = [
  { id: 'soft', label: 'Soft Start', emoji: '🌙' },
  { id: 'honest', label: 'Honest', emoji: '💜' },
  { id: 'boundary', label: 'Boundary', emoji: '🛡️' },
  { id: 'idontknow', label: "I Don't Know How", emoji: '☁️' },
] as const;

type ToneId = (typeof TONES)[number]['id'];

export default function S2TellBridgeScreen() {
  const { selectedSekret } = useAppContext();
  const [raw, setRaw] = useState('');
  const [tone, setTone] = useState<ToneId>('soft');
  const [rewrite, setRewrite] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  async function helpMeSayIt() {
    if (!raw.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const selectedTone = TONES.find(item => item.id === tone)?.label ?? 'Soft Start';
      const reply = await fetchSekretReply(
        raw.trim(),
        's2tell',
        selectedTone,
        selectedSekret,
        undefined,
        undefined,
        'teen',
      );
      setRewrite(reply);
    } catch {
      setMessage("Se'kret couldn't rewrite that right now. Your words are still here.");
    } finally {
      setLoading(false);
    }
  }

  async function sendToParentBridge() {
    if (!rewrite.trim()) return;
    setSending(true);
    setMessage('');
    const ok = await sendS2TellShare({ raw: raw.trim(), text: rewrite.trim(), tone });
    setSending(false);
    if (!ok) {
      setMessage('This could not reach Parent Bridge. Make sure your parent account is linked and try again.');
      return;
    }
    setMessage('Sent privately to Parent Bridge.');
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#140b24', '#25113d', '#0d0817']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.replace('/(teen)/bridge')} style={styles.back}>
          <Text style={styles.backText}>← Bridge</Text>
        </TouchableOpacity>

        <Text style={styles.kicker}>BRIDGE · S2TELL</Text>
        <Text style={styles.title}>Say it here first.</Text>
        <Text style={styles.subtitle}>Write it raw. Se'kret helps you shape it. Nothing reaches your parent until you press send.</Text>

        <TextInput
          value={raw}
          onChangeText={setRaw}
          placeholder="What do you need to say?"
          placeholderTextColor="#79678d"
          multiline
          textAlignVertical="top"
          style={styles.input}
        />

        <Text style={styles.label}>How should it land?</Text>
        <View style={styles.toneWrap}>
          {TONES.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setTone(item.id)}
              style={[styles.tone, tone === item.id && styles.toneActive]}
            >
              <Text style={styles.toneEmoji}>{item.emoji}</Text>
              <Text style={styles.toneText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity disabled={!raw.trim() || loading} onPress={helpMeSayIt} style={[styles.primary, (!raw.trim() || loading) && styles.disabled]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Help me say it</Text>}
        </TouchableOpacity>

        {rewrite ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Se'kret heard you</Text>
            <Text style={styles.resultText}>{rewrite}</Text>
            <TouchableOpacity disabled={sending} onPress={sendToParentBridge} style={styles.sendButton}>
              {sending ? <ActivityIndicator color="#22102f" /> : <Text style={styles.sendText}>Send to Parent Bridge</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0817' },
  content: { paddingTop: Platform.OS === 'ios' ? 66 : 42, paddingHorizontal: 22, paddingBottom: 48 },
  back: { marginBottom: 24 },
  backText: { color: '#c4b5fd', fontSize: 14, fontWeight: '800' },
  kicker: { color: '#a78bfa', fontSize: 10, fontWeight: '900', letterSpacing: 2.1, marginBottom: 10 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', marginBottom: 10 },
  subtitle: { color: '#c7bdd1', fontSize: 14, lineHeight: 21, marginBottom: 22 },
  input: { minHeight: 170, borderRadius: 20, borderWidth: 1, borderColor: '#8b5cf655', backgroundColor: '#ffffff08', color: '#fff', fontSize: 16, lineHeight: 24, padding: 16, marginBottom: 20 },
  label: { color: '#ded5e7', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  toneWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 18 },
  tone: { width: '48%', borderRadius: 16, borderWidth: 1, borderColor: '#ffffff16', backgroundColor: '#ffffff08', padding: 12 },
  toneActive: { borderColor: '#a78bfa', backgroundColor: '#8b5cf626' },
  toneEmoji: { fontSize: 18, marginBottom: 5 },
  toneText: { color: '#e7def0', fontSize: 12, fontWeight: '800' },
  primary: { height: 56, borderRadius: 18, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  resultCard: { marginTop: 20, borderRadius: 22, borderWidth: 1, borderColor: '#a78bfa55', backgroundColor: '#ffffff0b', padding: 18 },
  resultLabel: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  resultText: { color: '#fff', fontSize: 16, lineHeight: 24, marginBottom: 16 },
  sendButton: { minHeight: 52, borderRadius: 16, backgroundColor: '#ddd6fe', alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#22102f', fontSize: 14, fontWeight: '900' },
  message: { color: '#c4b5fd', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 16 },
});
