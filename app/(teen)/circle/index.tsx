import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MessagesScreen } from '@screens/MessagesScreen';
import { CrewAccountabilityScreen } from '@/screens/CrewAccountabilityScreen';
import { routeForSide } from '@/shared/routes';
import { loadTeenCircleIdentity } from '@/features/identity/profileIdentity';
import { useAppContext } from '@/context/AppContext';
import { BIP_SURFACE } from '../../../constants/vibeColors';
import PublicCircleFeedV2 from './feed-v2';

type Tab = 'circle' | 'crew' | 'messages';

export default function TeenCircleRoute() {
  const { colorScheme } = useAppContext();
  const cs = BIP_SURFACE[colorScheme ?? 'dark'];
  const [tab, setTab] = useState<Tab>('circle');
  const [circleName, setCircleName] = useState('anonymous bip');

  useEffect(() => {
    loadTeenCircleIdentity().then(value => setCircleName(value.circleName)).catch(() => {});
  }, []);

  const goTo = (screen: string) => router.push(routeForSide('teen', screen) as never);

  return (
    <View style={[styles.root, { backgroundColor: cs.root }]}>
      <View style={[styles.tabs, { backgroundColor: cs.card, borderBottomColor: cs.cardBorder }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'circle' && { borderBottomColor: cs.accent, borderBottomWidth: 2 }]}
          onPress={() => setTab('circle')}
        >
          <Text style={[styles.tabText, { color: cs.textMuted }, tab === 'circle' && { color: cs.textPrimary }]}>🌐 Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'crew' && { borderBottomColor: cs.accent, borderBottomWidth: 2 }]}
          onPress={() => setTab('crew')}
        >
          <Text style={[styles.tabText, { color: cs.textMuted }, tab === 'crew' && { color: cs.textPrimary }]}>🤝 Crew</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'messages' && { borderBottomColor: cs.accent, borderBottomWidth: 2 }]}
          onPress={() => setTab('messages')}
        >
          <Text style={[styles.tabText, { color: cs.textMuted }, tab === 'messages' && { color: cs.textPrimary }]}>💜 Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(teen)/profile' as never)}>
          <Text style={[styles.profileText, { color: cs.textSecond }]}>🪪 {circleName}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.identityNote, { backgroundColor: cs.card, borderBottomColor: cs.cardBorder }]}>
        <Text style={[styles.identityNoteText, { color: cs.textMuted }]}>
          Your Circle identity is separate from your private account. Posting as {circleName}.
        </Text>
      </View>

      <View style={styles.content}>
        {tab === 'circle' ? (
          <PublicCircleFeedV2 />
        ) : tab === 'crew' ? (
          <CrewAccountabilityScreen />
        ) : (
          <MessagesScreen side="teen" setScreen={goTo} BottomNav={null} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  profileButton: { maxWidth: 110, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  profileText: { fontSize: 11, fontWeight: '800' },
  identityNote: { paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1 },
  identityNoteText: { fontSize: 10, lineHeight: 15, textAlign: 'center' },
  content: { flex: 1 },
});
