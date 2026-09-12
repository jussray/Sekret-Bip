import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import {
  hydrateAccountProfile,
  saveAccountProfile,
  type AgeRange,
  type Companion,
  type ProfileGender,
} from '@/features/identity/accountProfile';
import { GlitterSparkles } from '../../components/GlitterSparkles';
import { MarqueeBanner } from '../../components/MarqueeBanner';
import { RetroFrame } from '../../components/RetroFrame';

type Gender = ProfileGender;
type TeenTab = 'identity' | 'circle' | 'memories';

const PAGE_ACCENTS = ['#c4b5fd', '#f472b6', '#38bdf8', '#a3e635', '#fb923c', '#f43f5e'] as const;

const GENDER_OPTIONS: { id: Gender; label: string; desc: string }[] = [
  { id: 'girl', label: '🌸 Girl', desc: 'Start with Suhana' },
  { id: 'boy', label: '⚡ Boy', desc: 'Start with Sy' },
  { id: 'other', label: '✨ My own way', desc: 'You choose first' },
];

const ALL_OPTIONS = [
  { id: 'raylene', label: 'Suhana', desc: 'Warm + protective' },
  { id: 'rylane', label: 'Sy', desc: 'Direct + loyal' },
  { id: 'cloud', label: 'Cloud', desc: 'Soft + no pressure' },
  { id: 'night', label: 'Night', desc: 'Quiet + steady' },
] as const;

type OptionId = Companion;

function sekretToChoice(s: string): OptionId {
  if (s === 'soft') return 'raylene';
  const valid: OptionId[] = ['raylene', 'rylane', 'cloud', 'night'];
  return valid.includes(s as OptionId) ? (s as OptionId) : 'raylene';
}

export default function TeenProfile() {
  const { setSelectedSekret, selectedSekret } = useAppContext();
  const [tab, setTab] = useState<TeenTab>('identity');
  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [choice, setChoice] = useState<OptionId>(() => sekretToChoice(selectedSekret));
  const [circleName, setCircleName] = useState('');
  const [pageAccent, setPageAccent] = useState<string>(PAGE_ACCENTS[0]);
  const [statusLine, setStatusLine] = useState('');
  const [glitterOn, setGlitterOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      hydrateAccountProfile('teen'),
      AsyncStorage.multiGet(['teen_profile_data', 'teen_circle_identity']),
    ]).then(([profile, pairs]) => {
      if (!active) return;
      const [localProfile, localCircle] = pairs.map(([, value]) => {
        try { return value ? JSON.parse(value) as Record<string, unknown> : null; } catch { return null; }
      });

      if (profile?.accountSide === 'teen') {
        setName(profile.privateDisplayName);
        setAgeRange(profile.ageRange);
        setGender(profile.gender);
        if (profile.selectedCompanion) setChoice(profile.selectedCompanion);
        setCircleName(profile.circleNickname);
      }

      if (typeof localProfile?.pageAccent === 'string') setPageAccent(localProfile.pageAccent);
      if (typeof localProfile?.statusLine === 'string') setStatusLine(localProfile.statusLine);
      if (typeof localProfile?.glitterOn === 'boolean') setGlitterOn(localProfile.glitterOn);
      if (!profile && typeof localCircle?.circleName === 'string') setCircleName(localCircle.circleName);
    }).catch(caught => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your profile.');
    });
    return () => { active = false; };
  }, []);

  async function saveCustomization(next: Partial<{ pageAccent: string; statusLine: string; glitterOn: boolean }>) {
    const existingRaw = await AsyncStorage.getItem('teen_profile_data');
    let existing: Record<string, unknown> = {};
    try {
      existing = existingRaw ? JSON.parse(existingRaw) : {};
    } catch {
      existing = {};
    }
    await AsyncStorage.setItem('teen_profile_data', JSON.stringify({ ...existing, ...next }));
  }

  function pickGender(g: Gender) {
    setGender(g);
    setError(null);
  }

  async function finish() {
    if (!ready || !ageRange || !gender || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveAccountProfile({
        accountSide: 'teen',
        privateDisplayName: name.trim(),
        onboardingComplete: true,
        ageRange,
        gender,
        selectedCompanion: choice,
        circleNickname: circleName.trim() || 'anonymous bip',
      });
      setSelectedSekret(choice === 'raylene' ? 'soft' : choice);
      router.replace('/(teen)/room');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  }

  const ready = name.trim().length > 0 && gender !== null && ageRange !== null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>PROFILE</Text>
      <Text style={styles.title}>Your profile hub</Text>
      <Text style={styles.sub}>One place for who you are, your Circle identity, and your space memories.</Text>

      <RetroFrame accent={pageAccent} style={styles.customizeFrame}>
        <Text style={[styles.customizeKicker, { color: pageAccent }]}>✨ CUSTOMIZE MY PAGE ✨</Text>
        <MarqueeBanner
          text={statusLine.trim() || 'set your status →'}
          accent={pageAccent}
          background={`${pageAccent}1a`}
        />
        <Text style={[styles.label, styles.labelSpaced]}>Status line</Text>
        <TextInput
          value={statusLine}
          onChangeText={text => { setStatusLine(text); void saveCustomization({ statusLine: text }); }}
          placeholder="what's the vibe today?"
          placeholderTextColor="#7f7487"
          style={styles.input}
          maxLength={60}
        />
        <Text style={[styles.label, styles.labelSpaced]}>Page color</Text>
        <View style={styles.swatchRow}>
          {PAGE_ACCENTS.map(color => (
            <TouchableOpacity
              key={color}
              onPress={() => { setPageAccent(color); void saveCustomization({ pageAccent: color }); }}
              style={[styles.swatch, { backgroundColor: color }, pageAccent === color && styles.swatchActive]}
            />
          ))}
        </View>
        <View style={styles.glitterRow}>
          <Text style={styles.glitterLabel}>✨ Glitter mode</Text>
          <Switch
            value={glitterOn}
            onValueChange={value => { setGlitterOn(value); void saveCustomization({ glitterOn: value }); }}
            trackColor={{ false: '#3a3245', true: pageAccent }}
          />
        </View>
      </RetroFrame>

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
          <TextInput value={name} onChangeText={text => { setName(text); setError(null); }} placeholder="nickname" placeholderTextColor="#7f7487" style={styles.input} />
          <Text style={styles.label}>You are</Text>
          <View style={styles.grid}>
            {GENDER_OPTIONS.map(g => (
              <TouchableOpacity key={g.id} onPress={() => pickGender(g.id)} style={[styles.card, gender === g.id && styles.active]}>
                <Text style={styles.cardText}>{g.label}</Text>
                <Text style={styles.cardDesc}>{g.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, styles.labelSpaced]}>First Se'kret</Text>
          <View style={styles.grid}>
            {ALL_OPTIONS.map(item => (
              <TouchableOpacity key={item.id} onPress={() => { setChoice(item.id); setError(null); }} style={[styles.card, choice === item.id && styles.active]}>
                <Text style={styles.cardText}>{item.label}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.ownerCard} onPress={() => router.push('/(teen)/bippin2' as any)}>
            <Text style={styles.ownerTitle}>🌱 Growth lives in Bippin 2</Text>
            <Text style={styles.ownerText}>Your growth tools and goals belong there, not duplicated here.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ownerCard} onPress={() => router.push('/(teen)/bridge' as any)}>
            <Text style={styles.ownerTitle}>🌉 Support lives in Bridge</Text>
            <Text style={styles.ownerText}>Connection and shared moments with your parent live in Bridge.</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity disabled={!ready || saving} onPress={finish} style={[styles.button, (!ready || saving) && styles.disabled]}>
            <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save my profile'}</Text>
          </TouchableOpacity>
        </>
      ) : tab === 'circle' ? (
        <>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Circle Identity</Text>
            <Text style={styles.identityHelp}>Your Circle identity is separate from your private account identity. Crew sees only what you choose to share.</Text>
          </View>
          <Text style={styles.label}>Circle name</Text>
          <TextInput value={circleName} onChangeText={text => { setCircleName(text); setError(null); }} placeholder="how your crew sees you" placeholderTextColor="#7f7487" style={styles.input} />
          <TouchableOpacity style={styles.ownerCard} onPress={() => router.push('/(teen)/circle' as any)}>
            <Text style={styles.ownerTitle}>🤝 View your Circle</Text>
            <Text style={styles.ownerText}>Your social identity and crew connections live in Circle.</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity disabled={!ready || saving} onPress={finish} style={[styles.button, (!ready || saving) && styles.disabled]}>
            <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save circle identity'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Profile Memories</Text>
            <Text style={styles.identityHelp}>Every space creates memories. Profile only remembers safe scrapbook markers — not the private content itself.</Text>
          </View>
          <Text style={styles.memoriesNote}>Pages protects the full story. Profile only remembers the moments you marked.</Text>
          {[
            ['📝', 'Pages', 'Your private writing stays in Pages.', '/(teen)/pages'],
            ['🤝', 'Circle', 'Your social world lives in Circle.', '/(teen)/circle'],
            ['🌱', 'Bippin 2', 'Growth and goals live in Bippin 2.', '/(teen)/bippin2'],
            ['🌙', 'Calm', 'Your reset tools live in Calm.', '/(teen)/calm'],
            ['🏡', 'Room', 'Your home base is the Room.', '/(teen)/room'],
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
      </ScrollView>
      {glitterOn ? <GlitterSparkles count={18} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, backgroundColor: '#0d0820', padding: 22, paddingTop: 104, paddingBottom: 40 },
  kicker: { color: '#c4b5fd', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
  sub: { color: '#a99fb1', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  customizeFrame: { marginBottom: 20 },
  customizeKicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10, textAlign: 'center' },
  swatchRow: { flexDirection: 'row', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#fff' },
  glitterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  glitterLabel: { color: '#eee7f2', fontSize: 13, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  tabActive: { backgroundColor: 'rgba(196,181,253,0.16)', borderWidth: 1, borderColor: '#c4b5fd' },
  tabText: { color: '#7f7487', fontWeight: '800', fontSize: 12 },
  tabTextActive: { color: '#eee7f2' },
  identityCard: { padding: 16, borderRadius: 18, backgroundColor: 'rgba(196,181,253,0.10)', borderWidth: 1, borderColor: '#c4b5fd44', marginBottom: 12 },
  identityLabel: { color: '#c4b5fd', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  identityHelp: { color: '#a99fb1', fontSize: 12, lineHeight: 18, marginTop: 6 },
  memoriesNote: { color: '#7f7487', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  label: { color: '#eee7f2', fontSize: 12, fontWeight: '900', marginBottom: 8, marginTop: 16 },
  labelSpaced: { marginTop: 24 },
  input: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff18', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', paddingHorizontal: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48%', minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff14', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 10 },
  active: { borderColor: '#c4b5fd', backgroundColor: 'rgba(196,181,253,0.16)' },
  cardText: { color: '#eee7f2', fontSize: 13, fontWeight: '800' },
  cardDesc: { color: '#7f7487', fontSize: 10, marginTop: 3 },
  ownerCard: { padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#ffffff18', marginTop: 16 },
  ownerTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  ownerText: { color: '#a99fb1', fontSize: 12, lineHeight: 18, marginTop: 5 },
  memoryCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#ffffff18', marginBottom: 10 },
  memoryEmoji: { fontSize: 24, width: 34, textAlign: 'center' },
  error: { color: '#fca5a5', fontSize: 12, lineHeight: 18, marginTop: 14 },
  button: { height: 54, borderRadius: 18, backgroundColor: '#c4b5fd', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#160b24', fontSize: 15, fontWeight: '900' },
});
