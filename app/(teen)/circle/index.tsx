import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MessagesScreen } from '@screens/MessagesScreen';
import { CrewAccountabilityScreen } from '@/screens/CrewAccountabilityScreen';
import { routeForSide } from '@/shared/routes';
import { loadTeenCircleIdentity } from '@/features/identity/profileIdentity';
import PublicCircleFeedV2 from './feed-v2';

type Tab = 'circle' | 'crew' | 'messages';

export default function TeenCircleRoute() {
  const [tab, setTab] = useState<Tab>('circle');
  const [circleName, setCircleName] = useState('anonymous bip');

  useEffect(() => {
    loadTeenCircleIdentity().then(value => setCircleName(value.circleName)).catch(() => {});
  }, []);

  const goTo = (screen: string) => router.push(routeForSide('teen', screen) as never);

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'circle' && styles.tabActive]} onPress={() => setTab('circle')}>
          <Text style={[styles.tabText, tab === 'circle' && styles.tabTextActive]}>🌐 Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'crew' && styles.tabActive]} onPress={() => setTab('crew')}>
          <Text style={[styles.tabText, tab === 'crew' && styles.tabTextActive]}>🤝 Crew</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'messages' && styles.tabActive]} onPress={() => setTab('messages')}>
          <Text style={[styles.tabText, tab === 'messages' && styles.tabTextActive]}>💜 Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(teen)/profile' as never)}>
          <Text style={styles.profileText}>🪪 {circleName}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.identityNote}>
        <Text style={styles.identityNoteText}>
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
  root: { flex: 1, backgroundColor: '#0d0518' },
  tabs: { flexDirection: 'row', backgroundColor: '#130828', borderBottomWidth: 1, borderBottomColor: '#2e1250' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#a855f7' },
  tabText: { color: '#5a3a78', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#e8dff5' },
  profileButton: { maxWidth: 110, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  profileText: { color: '#c4b5fd', fontSize: 11, fontWeight: '800' },
  identityNote: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#120823', borderBottomWidth: 1, borderBottomColor: '#2e1250' },
  identityNoteText: { color: '#8f7aa6', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  content: { flex: 1 },
});
