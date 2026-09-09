import { Redirect, Tabs, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SideSafeBackButton } from '@/components/SideSafeBackButton';
import { isFounderPreviewEnabled } from '@/constants/founderPreview';
import { getDevSplitViewSideOverride } from '@/utils/devSplitViewSide';
import {
  resolveParentEntryState,
  routeForParentEntryState,
  type ParentEntryState,
} from '@/services/parentEntryState';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

function ParentTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#111827', borderTopWidth: 0, height: 68, paddingBottom: 10 },
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        {/* Parent Bridge is the primary shared relationship surface. Calm stays
            available from Room, More, and in-flow reply resets. */}
        <Tabs.Screen name="room" options={{ title: 'Room', tabBarIcon: () => <TabIcon emoji="🏡" /> }} />
        <Tabs.Screen name="bridge" options={{ title: 'Bridge', tabBarIcon: () => <TabIcon emoji="🌉" /> }} />
        <Tabs.Screen name="pages" options={{ title: 'Pages', tabBarIcon: () => <TabIcon emoji="📝" /> }} />
        <Tabs.Screen name="circle" options={{ title: 'Circle', tabBarIcon: () => <TabIcon emoji="🤝" /> }} />
        <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: () => <TabIcon emoji="•••" /> }} />

        <Tabs.Screen name="dashboard" options={{ href: null }} />
        <Tabs.Screen name="circle/[id]" options={{ href: null }} />
        <Tabs.Screen name="circle/weather" options={{ href: null }} />
        <Tabs.Screen name="calm" options={{ href: null }} />
        <Tabs.Screen name="voicebip" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="s2tell" options={{ href: null }} />
        <Tabs.Screen name="repair" options={{ href: null }} />
        <Tabs.Screen name="voicereflect" options={{ href: null }} />
        <Tabs.Screen name="period-calendar" options={{ href: null }} />
        <Tabs.Screen name="sekret" options={{ href: null }} />
        <Tabs.Screen name="growth" options={{ href: null }} />
        <Tabs.Screen name="resources" options={{ href: null }} />
        <Tabs.Screen name="approvals" options={{ href: null }} />
      </Tabs>
      <SideSafeBackButton side="parent" />
    </View>
  );
}

export default function ParentLayout() {
  const [entryState, setEntryState] = useState<ParentEntryState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const founderPreview = isFounderPreviewEnabled();
  const devSideOverride = getDevSplitViewSideOverride();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    setEntryState(null);
    setError(null);

    void resolveParentEntryState()
      .then(state => {
        if (active) setEntryState(state);
      })
      .catch(cause => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to verify Parent Side access.');
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  // Split View and exact-head browser proof can land on the parent copy of a
  // duplicate web URL first. Honor the explicit side before Founder Preview
  // renders so /(teen) and /(parent) remain deterministic in development.
  if (founderPreview && devSideOverride === 'teen') {
    return <Redirect href={`/(teen)${pathname}` as never} />;
  }

  // Development Founder Preview makes every built parent route inspectable.
  // Screen-level RLS, linkage, consent, account, and safety requirements still
  // apply to actual reads and writes.
  if (founderPreview) return <ParentTabs />;

  if (error) {
    return (
      <View style={styles.guardRoot}>
        <Text style={styles.guardTitle}>We could not verify Parent Side.</Text>
        <Text style={styles.guardBody}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => setAttempt(value => value + 1)}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!entryState) {
    return (
      <View style={styles.guardRoot}>
        <ActivityIndicator color="#a7f3d0" />
      </View>
    );
  }

  if (entryState.state !== 'ready') {
    return <Redirect href={routeForParentEntryState(entryState) as never} />;
  }

  return <ParentTabs />;
}

const styles = StyleSheet.create({
  guardRoot: {
    flex: 1,
    backgroundColor: '#08140f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  guardTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  guardBody: { color: '#9fb6aa', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  retry: { minWidth: 160, height: 52, borderRadius: 16, backgroundColor: '#a7f3d0', alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#062015', fontSize: 15, fontWeight: '900' },
});
