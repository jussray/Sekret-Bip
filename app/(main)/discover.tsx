/**
 * app/(main)/discover.tsx
 *
 * Discover / Oracle screen.
 * Houses the Oracle companion entry point + quick-access navigation cards.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { PERSONALITY_CONFIG } from '@/services/ai';

type DiscoverCard = {
  emoji: string;
  title: string;
  desc: string;
  action: '/(main)/calm' | '/(main)/pages' | '/(main)/circle' | null;
};

const DISCOVER_CARDS: DiscoverCard[] = [
  { emoji: '🌙', title: 'Night Journal',  desc: 'A guided prompt to close your day.',  action: null },
  { emoji: '🌊', title: 'Breathe',        desc: 'Two minutes of guided breathing.',    action: '/(main)/calm' },
  { emoji: '📝', title: 'Free Write',     desc: 'No prompts. Just you and the page.', action: '/(main)/pages' },
  { emoji: '🌐', title: 'Drop in Circle', desc: 'See what others are feeling.',        action: '/(main)/circle' },
];

export default function DiscoverScreen() {
  const oracle = PERSONALITY_CONFIG.oracle;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Discover ✨</Text>

        {/* Oracle entry card */}
        <TouchableOpacity
          style={styles.oracleCard}
          onPress={() => router.push('/(main)/chat/oracle')}
          activeOpacity={0.85}
        >
          <Text style={styles.oracleEmoji}>{oracle.emoji}</Text>
          <View style={styles.oracleBody}>
            <Text style={[styles.oracleName, { color: oracle.accentColor }]}>
              {oracle.name}
            </Text>
            <Text style={styles.oracleVibe}>{oracle.vibe}</Text>
            <Text style={styles.oracleGreeting}>"{oracle.greeting}"</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Quick Access</Text>
        <View style={styles.grid}>
          {DISCOVER_CARDS.map((card) => {
            if (!card.action) {
              return (
                <View key={card.title} style={[styles.gridCard, styles.gridCardInactive]}>
                  <Text style={styles.gridEmoji}>{card.emoji}</Text>
                  <Text style={styles.gridTitle}>{card.title}</Text>
                  <Text style={styles.gridDesc}>{card.desc}</Text>
                  <Text style={styles.gridComingSoon}>Coming soon</Text>
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={card.title}
                style={styles.gridCard}
                onPress={() => router.push(card.action!)}
                activeOpacity={0.8}
              >
                <Text style={styles.gridEmoji}>{card.emoji}</Text>
                <Text style={styles.gridTitle}>{card.title}</Text>
                <Text style={styles.gridDesc}>{card.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#0d0d0d' },
  content:          { padding: 24, paddingTop: 56, paddingBottom: 40 },
  heading:          { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 20 },
  oracleCard:       {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: '#1E1B2E',
    borderRadius:    20,
    padding:         20,
    marginBottom:    28,
    borderWidth:     1,
    borderColor:     '#A78BFA40',
  },
  oracleEmoji:      { fontSize: 36, marginTop: 2, marginRight: 14 },
  oracleBody:       { flex: 1 },
  oracleName:       { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  oracleVibe:       { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 4 },
  oracleGreeting:   { color: '#A78BFA', fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  sectionLabel:     { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  grid:             { flexDirection: 'row', flexWrap: 'wrap' },
  gridCard:         {
    width:           '47%',
    backgroundColor: '#111827',
    borderRadius:    16,
    padding:         16,
    marginRight:     '3%',
    marginBottom:    12,
  },
  gridCardInactive: { opacity: 0.5 },
  gridEmoji:        { fontSize: 24, marginBottom: 6 },
  gridTitle:        { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  gridDesc:         { color: '#666', fontSize: 12, lineHeight: 17 },
  gridComingSoon:   { color: '#444', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
});
