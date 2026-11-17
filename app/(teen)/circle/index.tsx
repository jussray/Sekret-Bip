import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MessagesScreen } from '@screens/MessagesScreen';
import { CrewAccountabilityScreen } from '@/screens/CrewAccountabilityScreen';
import { routeForSide } from '@/shared/routes';
import { loadTeenCircleIdentity } from '@/features/identity/profileIdentity';
import { CIRCLE_COLORS as C } from '@/features/circle/circleTheme';
import PublicCircleFeedV2 from './feed-v2';

type Tab = 'circle' | 'crew' | 'messages';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'circle', label: '🪐 Open Bip' },
  { key: 'crew', label: '🤝 Crew Bip' },
  { key: 'messages', label: '💜 Messages' },
];

export default function TeenCircleRoute() {
  const [tab, setTab] = useState<Tab>('circle');
  const [circleName, setCircleName] = useState('anonymous bip');

  useEffect(() => {
    loadTeenCircleIdentity().then(value => setCircleName(value.circleName)).catch(() => {});
  }, []);

  const goTo = (screen: string) => router.push(routeForSide('teen', screen) as never);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map(option => {
            const active = tab === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setTab(option.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.identityRow}>
        <Text style={styles.identityNoteText}>
          Your Circle identity is separate from your private account. Posting as {circleName}.
        </Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(teen)/profile' as never)}
          accessibilityRole="button"
          accessibilityLabel={`Circle identity: ${circleName}`}
        >
          <Text style={styles.profileText} numberOfLines={1}>🪪 {circleName}</Text>
        </TouchableOpacity>
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
  root: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, backgroundColor: C.bg },
  tabs: { flex: 1, flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, borderWidth: 1, borderColor: C.borderSoft, backgroundColor: C.card },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: C.chipActive },
  tabText: { color: C.muted, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: '#fff' },
  profileButton: { maxWidth: 130, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.borderSoft, backgroundColor: C.card },
  profileText: { color: C.accentSoft, fontSize: 11, fontWeight: '800' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 4, backgroundColor: C.bg },
  identityNoteText: { flex: 1, color: C.faint, fontSize: 10, lineHeight: 15 },
  content: { flex: 1 },
});
