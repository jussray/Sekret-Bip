import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { PERSONALITY_CONFIG } from '@/services/ai';
import type { PersonalityId } from '@/types';

const PERSONALITY_ORDER: PersonalityId[] = ['raylene', 'rylane', 'cloud', 'night', 'ja'];

export default function ChatHubScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{"Se'kret Chat"}</Text>
        <Text style={styles.title}>Who do you need right now?</Text>
        <Text style={styles.subtitle}>
          Pick a companion. Each one talks differently, but they all keep it soft, private, and teen-safe.
        </Text>

        {PERSONALITY_ORDER.map((id) => {
          const p = PERSONALITY_CONFIG[id];
          return (
            <TouchableOpacity
              key={id}
              style={[styles.card, { borderColor: p.accentColor + '55', backgroundColor: p.cardColor }]}
              onPress={() => router.push(`/(teen)/chat/${id}` as any)}
              activeOpacity={0.86}
            >
              <Text style={styles.emoji}>{p.emoji}</Text>
              <View style={styles.cardBody}>
                <Text style={[styles.name, { color: p.accentColor }]}>{p.name}</Text>
                <Text style={styles.role}>{p.title}</Text>
                <Text style={styles.vibe}>{p.vibe}</Text>
              </View>
              <Text style={[styles.arrow, { color: p.accentColor }]}>›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: '#0d0015' },
  content:  { padding: 22, paddingBottom: 96 },
  kicker:   { color: '#c084fc', fontSize: 13, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  title:    { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 10 },
  subtitle: { color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 24 },
  card:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 24, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  emoji:    { fontSize: 34, marginRight: 14 },
  cardBody: { flex: 1 },
  name:     { fontSize: 18, fontWeight: '900', marginBottom: 2 },
  role:     { color: '#e2e8f0', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  vibe:     { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  arrow:    { fontSize: 32, fontWeight: '300', marginLeft: 10 },
});
