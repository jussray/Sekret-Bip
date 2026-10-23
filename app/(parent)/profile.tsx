import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

type ParentTab = 'identity' | 'circle' | 'memories';

export default function ParentProfile() {
  const [tab, setTab] = useState<ParentTab>('identity');
  const [name, setName] = useState('');
  const [focus, setFocus] = useState('support');
  const [circleName, setCircleName] = useState('');
  const [supportStyle, setSupportStyle] = useState('listen first');

  useEffect(() => {
    AsyncStorage.multiGet(['parent_profile_data', 'parent_circle_identity']).then(pairs => {
      const [profile, circle] = pairs.map(([, v]) => (v ? JSON.parse(v) : null));
      if (profile?.name) setName(profile.name);
      if (profile?.focus) setFocus(profile.focus);
      if (circle?.circleName) setCircleName(circle.circleName);
      if (circle?.supportStyle) setSupportStyle(circle.supportStyle);
    }).catch(() => {});
  }, []);

  async function finish() {
    if (!name.trim()) return;
    await AsyncStorage.setItem('parent_profile_done', 'true');
    await AsyncStorage.setItem('parent_profile_data', JSON.stringify({ name: name.trim(), focus }));
    await AsyncStorage.setItem('parent_circle_identity', JSON.stringify({ circleName: circleName.trim() || name.trim(), supportStyle }));
    router.replace('/(parent)/room');
  }

  const ready = name.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>PROFILE</Text>
      <Text style={styles.title}>Your parent identity in Bip</Text>
      <Text style={styles.sub}>One parent presence, expressed through support, reflection, community, and repair.</Text>

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
          <Text style={styles.label}>Your name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="name" placeholderTextColor="#789082" style={styles.input} />

          <Text style={styles.label}>Main focus</Text>
          <View style={styles.grid}>
            {['support', 'listen', 'repair', 'learn'].map(item => (
              <TouchableOpacity key={item} onPress={() => setFocus(item)} style={[styles.card, focus === item && styles.active]}>
                <Text style={styles.cardText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.ownerCard} onPress={() => router.push('/(parent)/bridge' as any)}>
            <Text style={styles.ownerTitle}>🌉 Support lives in Bridge</Text>
            <Text style={styles.ownerText}>Connection, shared moments, and support permissions belong there.</Text>
          </TouchableOpacity>
        </>
      ) : tab === 'circle' ? (
        <>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Parent Circle Identity</Text>
            <Text style={styles.identityHelp}>This is your community-facing support identity.</Text>
          </View>
          <Text style={styles.label}>Parent Circle name</Text>
          <TextInput value={circleName} onChangeText={setCircleName} placeholder="display name" placeholderTextColor="#789082" style={styles.input} />
          <Text style={styles.label}>Support style</Text>
          <TextInput value={supportStyle} onChangeText={setSupportStyle} placeholder="listen first, repair gently..." placeholderTextColor="#789082" style={styles.input} />
          <TouchableOpacity style={styles.ownerCard} onPress={() => router.push('/(parent)/circle' as any)}>
            <Text style={styles.ownerTitle}>🤝 View this identity in Parent Circle</Text>
            <Text style={styles.ownerText}>Parent Circle uses this identity for community support.</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Support Memories</Text>
            <Text style={styles.identityHelp}>Every parent space can create memories. Profile collects safe markers of how you showed up, without opening teen private data.</Text>
            <Text style={styles.identityHelp}>Parent Circle sees your community identity, not your teen’s private world.</Text>
          </View>
          {[
            ['📝', 'Parent Pages', 'Your reflections live in Pages.', '/(parent)/pages'],
            ['🤝', 'Parent Circle', 'Your support community lives in Circle.', '/(parent)/circle'],
            ['🎙️', 'Parent Voice Bip', 'Your spoken reflections live in Voice Bip.', '/(parent)/voicebip'],
            ['🌙', 'Calm', 'Your reset tools live in Calm.', '/(parent)/calm'],
            ['🏡', 'Parent Room', 'Your support presence starts in the Room.', '/(parent)/room'],
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

      <TouchableOpacity disabled={!ready} onPress={finish} style={[styles.button, !ready && styles.disabled]}>
        <Text style={styles.buttonText}>Save parent identity</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, backgroundColor: '#08140f', padding: 22, paddingTop: 60, paddingBottom: 40 },
  kicker: { color: '#a7f3d0', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
  sub: { color: '#b7c9bf', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  tabActive: { backgroundColor: 'rgba(167,243,208,0.16)', borderWidth: 1, borderColor: '#a7f3d0' },
  tabText: { color: '#789082', fontWeight: '800', fontSize: 12 },
  tabTextActive: { color: '#edfdf4' },
  identityCard: { padding: 16, borderRadius: 18, backgroundColor: 'rgba(167,243,208,0.10)', borderWidth: 1, borderColor: '#a7f3d044', marginBottom: 12 },
  identityLabel: { color: '#a7f3d0', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  identityHelp: { color: '#b7c9bf', fontSize: 12, lineHeight: 18, marginTop: 6 },
  label: { color: '#edfdf4', fontSize: 12, fontWeight: '900', marginBottom: 8, marginTop: 16 },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff18', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', paddingHorizontal: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { minWidth: '31%', minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff14', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12 },
  active: { borderColor: '#a7f3d0', backgroundColor: 'rgba(167,243,208,0.16)' },
  cardText: { color: '#edfdf4', fontSize: 12, fontWeight: '800' },
  ownerCard: { padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#ffffff18', marginTop: 16 },
  ownerTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  ownerText: { color: '#b7c9bf', fontSize: 12, lineHeight: 18, marginTop: 5 },
  memoryCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#ffffff18', marginBottom: 10 },
  memoryEmoji: { fontSize: 24, width: 34, textAlign: 'center' },
  button: { minHeight: 54, borderRadius: 18, backgroundColor: '#a7f3d0', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#062015', fontSize: 15, fontWeight: '900' },
});
