import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { PERSONALITY_CONFIG } from '@/services/ai';
import { usePoints } from '@/features/activity/ledger';

const COMPANION_UNLOCK_PTS: Record<string, number> = {
  raylene: 0, rylane: 50, cloud: 150, night: 350,
};

const COMPANIONS = ['raylene', 'rylane', 'cloud', 'night'] as const;

const TOOLS = [
  { emoji: '🌊', title: 'Breathe',        desc: 'Two minutes of calm.',      route: '/(teen)/calm'     },
  { emoji: '📝', title: 'Write It Out',   desc: 'No prompts. Just you.',     route: '/(teen)/pages'    },
  { emoji: '🌙', title: 'Night Journal',  desc: 'Close your day softly.',    route: '/(teen)/pages'    },
  { emoji: '🎙️', title: 'Voice Bip',     desc: 'Say it out loud.',           route: '/(teen)/voicebip' },
  { emoji: '🌐', title: 'Circle',         desc: 'See what others feel.',     route: '/(teen)/circle'   },
  { emoji: '☁️', title: 'Cloud Thoughts', desc: 'Let something float away.', route: '/(teen)/cloud'    },
] as const;

export default function DiscoverScreen() {
  const { total: totalPoints } = usePoints();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, delay: 100, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#10091b', '#171024', '#090711']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <Text style={styles.kicker}>DISCOVER</Text>
          <Text style={styles.title}>What do you{'\n'}need right now?</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <Text style={styles.sectionLabel}>Your Se'krets</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fade }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.companionRow}
          >
            {COMPANIONS.map(id => {
              const p = PERSONALITY_CONFIG[id];
              const unlocked = totalPoints >= (COMPANION_UNLOCK_PTS[id] ?? 0);
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.companionCard, { borderColor: p.accentColor + '55', opacity: unlocked ? 1 : 0.45 }]}
                  onPress={() => unlocked ? router.push(`/(teen)/chat/${id}` as any) : undefined}
                  activeOpacity={unlocked ? 0.8 : 1}
                >
                  <View style={[styles.companionGlow, { backgroundColor: p.accentColor + '1a' }]} />
                  <Text style={styles.companionEmoji}>{p.emoji}</Text>
                  <Text style={[styles.companionName, { color: p.accentColor }]}>{p.name}</Text>
                  {unlocked ? (
                    <Text style={styles.companionTitle}>{p.title}</Text>
                  ) : (
                    <Text style={styles.companionTitle}>{COMPANION_UNLOCK_PTS[id]} pts to unlock</Text>
                  )}
                  <Text style={styles.companionGreeting} numberOfLines={2}>
                    "{p.greeting}"
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Quick Tools</Text>
          <View style={styles.toolGrid}>
            {TOOLS.map(tool => (
              <TouchableOpacity
                key={tool.title}
                style={styles.toolCard}
                onPress={() => router.push(tool.route as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.toolEmoji}>{tool.emoji}</Text>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolDesc}>{tool.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#090711' },
  scroll:             { paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingBottom: 40 },
  kicker:             { color: '#6d28d9', fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginBottom: 10, paddingHorizontal: 24 },
  title:              { color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 40, marginBottom: 32, paddingHorizontal: 24 },
  sectionLabel:       { color: '#4a3f6b', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 14, paddingHorizontal: 24 },
  sectionLabelSpaced: { marginTop: 32 },
  companionRow:       { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  companionCard:      { width: 148, borderRadius: 24, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, overflow: 'hidden' },
  companionGlow:      { position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: 45 },
  companionEmoji:     { fontSize: 28, marginBottom: 10 },
  companionName:      { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  companionTitle:     { color: '#5a5070', fontSize: 11, fontWeight: '700', marginBottom: 8 },
  companionGreeting:  { color: '#7a6e8a', fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
  toolGrid:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  toolCard:           { width: '47%', borderRadius: 20, borderWidth: 1, borderColor: '#ffffff0f', backgroundColor: 'rgba(255,255,255,0.04)', padding: 16, minHeight: 96 },
  toolEmoji:          { fontSize: 22, marginBottom: 8 },
  toolTitle:          { color: '#e8e0f0', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  toolDesc:           { color: '#4a3f6b', fontSize: 11, lineHeight: 16 },
});
