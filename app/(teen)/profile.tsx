import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';

type Gender = 'girl' | 'boy' | 'other';
type TeenTab = 'identity' | 'circle' | 'memories';

const GENDER_OPTIONS: { id: Gender; label: string; desc: string }[] = [
  { id: 'girl',  label: '🌸 Girl',       desc: 'Start with Raylene' },
  { id: 'boy',   label: '⚡ Boy',        desc: 'Start with Rylane'  },
  { id: 'other', label: '✨ My own way', desc: 'You choose first'   },
];

const COMPANION_FOR_GENDER: Record<Gender, 'raylene' | 'rylane'> = {
  girl:  'raylene',
  boy:   'rylane',
  other: 'raylene',
};

const ALL_OPTIONS = [
  { id: 'raylene', label: 'Raylene', desc: 'Warm + protective'  },
  { id: 'rylane',  label: 'Rylane',  desc: 'Direct + loyal'     },
  { id: 'cloud',   label: 'Cloud',   desc: 'Soft + no pressure' },
  { id: 'night',   label: 'Night',   desc: 'Quiet + steady'     },
] as const;

type OptionId = (typeof ALL_OPTIONS)[number]['id'];

function sekretToChoice(s: string): OptionId {
  if (s === 'soft') return 'raylene';
  const valid: OptionId[] = ['raylene', 'rylane', 'cloud', 'night'];
  return valid.includes(s as OptionId) ? (s as OptionId) : 'raylene';
}

export default function TeenProfile() {
  const { setSelectedSekret, selectedSekret } = useAppContext();
  const [tab, setTab] = useState<TeenTab>('identity');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [choice, setChoice] = useState<OptionId>(() => sekretToChoice(selectedSekret));
  const [circleName, setCircleName] = useState('');

  useEffect(() => {
    AsyncStorage.multiGet(['teen_profile_data', 'teen_circle_identity']).then(pairs => {
      const [profile, circle] = pairs.map(([, v]) => (v ? JSON.parse(v) : null));
      if (profile?.name)   setName(profile.name);
      if (profile?.gender) setGender(profile.gender as Gender);
      if (profile?.choice) setChoice(profile.choice as OptionId);
      if (circle?.circleName) setCircleName(circle.circleName);
    }).catch(() => {});
  }, []);

  function pickGender(g: Gender) {
    setGender(g);
    setChoice(COMPANION_FOR_GENDER[g]);
  }

  async function finish() {
    await AsyncStorage.setItem('teen_profile_done', 'true');
    await AsyncStorage.setItem('teen_profile_data', JSON.stringify({ name: name.trim(), choice, gender }));
    await AsyncStorage.setItem('teen_circle_identity', JSON.stringify({ circleName: circleName.trim() || name.trim() }));
    setSelectedSekret(choice === 'raylene' ? 'soft' : choice);
    router.replace('/(teen)/room');
  }

  const ready = name.trim().length > 0 && gender !== null;

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>PROFILE</Text>
      <Text style={styles.title}>Make this side yours</Text>
      <Text style={styles.sub}>Pick what this space should remember for you.</Text>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'identity' && styles.tabActive]} onPress={() => setTab('identity')}>
          <Text style={[styles.tabText, tab === 'identity' && styles.tabTextActive]}>My Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'circle' && styles.tabActive]} onPress={() => setTab('circle')}>
          <Text style={[styles.tabText, tab === 'circle' && styles.tabTextActive]}>Circle Identity</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'memories' && styles.tabActive]} onPress={() => setTab('memories')}>
          <Text style={[styles.tabText, tab === 'memories' && styles.tabTextActive]}>Memories</Text>
        </TouchableOpacity>
      </View>

      {tab === 'identity' ? (
        <>
          <Text style={styles.label}>Name or nickname</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="nickname"
            placeholderTextColor="#7f7487"
            style={styles.input}
          />

          <Text style={styles.label}>You are</Text>
          <View style={styles.grid}>
            {GENDER_OPTIONS.map(g => (
              <TouchableOpacity
                key={g.id}
                onPress={() => pickGender(g.id)}
                style={[styles.card, gender === g.id && styles.active]}
              >
                <Text style={styles.cardText}>{g.label}</Text>
                <Text style={styles.cardDesc}>{g.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, styles.labelSpaced]}>First Se'kret</Text>
          <View style={styles.grid}>
            {ALL_OPTIONS.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setChoice(item.id)}
                style={[styles.card, choice === item.id && styles.active]}
              >
                <Text style={styles.cardText}>{item.label}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.ownerCard} onPress={() => router.push('/(teen)/bippin2' as any)}>
            <Text style={styles.ownerTitle}>🌱 Growth lives in Bippin 2</Text>
            <Text style={styles.ownerText}>Your growth journey and milestones belong there.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ownerCard} onPress={() => router.push('/(teen)/bridge' as any)}>
            <Text style={styles.ownerTitle}>🌉 Support lives in Bridge</Text>
            <Text style={styles.ownerText}>Connection and support permissions belong there.</Text>
          </TouchableOpacity>
        </>
      ) : tab === 'circle' ? (
        <>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Circle Identity</Text>
            <Text style={styles.identityHelp}>
              Your Circle identity is separate from your private account identity.
              Crew sees only what you choose to share.
            </Text>
          </View>
          <Text style={styles.label}>Circle name</Text>
          <TextInput
            value={circleName}
            onChangeText={setCircleName}
            placeholder="display name in Circle"
            placeholderTextColor="#7f7487"
            style={styles.input}
          />
          <TouchableOpacity style={styles.ownerCard} onPress={() => router.push('/(teen)/circle' as any)}>
            <Text style={styles.ownerTitle}>🤝 View your Circle</Text>
            <Text style={styles.ownerText}>Circle uses this identity for your crew.</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Profile Memories</Text>
            <Text style={styles.identityHelp}>
              Every space creates memories. Profile only remembers safe scrapbook markers of what mattered to you.
            </Text>
          </View>
          {[
            ['📄', 'Pages',    'Pages protects the full story. Profile only remembers the moments you highlight.', '/(teen)/pages'],
            ['🤝', 'Circle',   'Your crew connections live in Circle.',                                            '/(teen)/circle'],
            ['🌱', 'Bippin 2', 'Your growth lives in Bippin 2.',                                                  '/(teen)/bippin2'],
            ['🌙', 'Calm',     'Your calm tools live in Calm.',                                                    '/(teen)/calm'],
            ['🏡', 'Room',     'Your safe space starts in the Room.',                                              '/(teen)/room'],
          ].map(([emoji, title, body, route]) => (
            <TouchableOpacity key={title} style={styles.memoryCard} onPress={() => router.push(route as any)}>
              <Text style={styles.memoryEmoji}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerTitle}>{title}</Text>
                <Text style={styles.ownerText}>{body}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      <TouchableOpacity
        disabled={!ready}
        onPress={finish}
        style={[styles.button, !ready && styles.disabled]}
      >
        <Text style={styles.buttonText}>Enter my room</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:          { flexGrow: 1, backgroundColor: '#0d0820', padding: 22, paddingTop: 60, paddingBottom: 40 },
  kicker:        { color: '#c4b5fd', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title:         { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
  sub:           { color: '#a99fb1', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  tabs:          { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab:           { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  tabActive:     { backgroundColor: 'rgba(196,181,253,0.16)', borderWidth: 1, borderColor: '#c4b5fd' },
  tabText:       { color: '#7f7487', fontWeight: '800', fontSize: 12 },
  tabTextActive: { color: '#eee7f2' },
  identityCard:  { padding: 16, borderRadius: 18, backgroundColor: 'rgba(196,181,253,0.10)', borderWidth: 1, borderColor: '#c4b5fd44', marginBottom: 12 },
  identityLabel: { color: '#c4b5fd', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  identityHelp:  { color: '#a99fb1', fontSize: 12, lineHeight: 18, marginTop: 6 },
  label:         { color: '#eee7f2', fontSize: 12, fontWeight: '900', marginBottom: 8, marginTop: 16 },
  labelSpaced:   { marginTop: 24 },
  input:         { height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff18', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', paddingHorizontal: 14 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card:          { width: '48%', minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff14', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 10 },
  active:        { borderColor: '#c4b5fd', backgroundColor: 'rgba(196,181,253,0.16)' },
  cardText:      { color: '#eee7f2', fontSize: 13, fontWeight: '800' },
  cardDesc:      { color: '#7f7487', fontSize: 10, marginTop: 3 },
  ownerCard:     { padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#ffffff18', marginTop: 16 },
  ownerTitle:    { color: '#fff', fontSize: 14, fontWeight: '900' },
  ownerText:     { color: '#a99fb1', fontSize: 12, lineHeight: 18, marginTop: 5 },
  memoryCard:    { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#ffffff18', marginBottom: 10 },
  memoryEmoji:   { fontSize: 24, width: 34, textAlign: 'center' },
  button:        { height: 54, borderRadius: 18, backgroundColor: '#c4b5fd', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  disabled:      { opacity: 0.4 },
  buttonText:    { color: '#160b24', fontSize: 15, fontWeight: '900' },
});
