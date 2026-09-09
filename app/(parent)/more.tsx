import React, { useEffect, useState } from 'react';
import { ImageBackground, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { IMAGES } from '@/constants/theme';
import { routeForSide } from '@/shared/routes';
import { useAppContext } from '@/context/AppContext';
import { PARENT_MORE_GROUPS } from '@/constants/screenPurpose';
import { isFounderPreviewEnabled } from '@/constants/founderPreview';
import { isDevTestFamilyEnabled } from '@/features/testing/devTestFamily';
import { useLinkedBridge } from '@/hooks/useLinkedBridge';
import { fetchPendingTaskSubmissions, fetchPendingRewardRedemptions } from '@/utils/parentApprovals';
import { ControlRoomEntry } from '@/components/ControlRoomEntry';

export default function ParentMoreRoute() {
  const { setUserSide } = useAppContext();
  const founderPreview = isFounderPreviewEnabled();
  const allowSideSwitch = process.env.EXPO_PUBLIC_ENABLE_SIDE_SWITCH === 'true' || isDevTestFamilyEnabled();
  const { linkedTeenId, isLinked } = useLinkedBridge();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    if (!isLinked || !linkedTeenId) { setPendingApprovals(0); return; }
    let cancelled = false;
    void Promise.all([
      fetchPendingTaskSubmissions(linkedTeenId),
      fetchPendingRewardRedemptions(linkedTeenId),
    ]).then(([tasks, rewards]) => {
      if (!cancelled) setPendingApprovals(tasks.length + rewards.length);
    });
    return () => { cancelled = true; };
  }, [isLinked, linkedTeenId]);

  function open(route: string) {
    if (route === 'parent-link') {
      router.push('/(onboarding)/parent-link');
      return;
    }
    router.push(routeForSide('parent', route) as any);
  }

  return (
    <ImageBackground source={IMAGES.parentHomeBg} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(36,16,56,0.72)', 'rgba(22,11,43,0.88)', 'rgba(13,9,20,0.97)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>FEATURE DRAWER</Text>
        <Text style={styles.logo}>Parent More</Text>
        <Text style={styles.subtitle}>
          Extra tools, connection management, and support resources. Bridge carries Doorbell signals, S2Tell shares, and replies.
        </Text>

        {founderPreview ? (
          <TouchableOpacity
            style={styles.previewHero}
            onPress={() => router.push('/(dev)/feature-preview' as any)}
            activeOpacity={0.86}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.previewKicker}>EXPO GO · FOUNDER PREVIEW</Text>
              <Text style={styles.previewTitle}>Open every Bip feature</Text>
              <Text style={styles.previewBody}>Jump between every teen, parent, hidden, setup-dependent, and prototype surface.</Text>
            </View>
            <Text style={styles.previewArrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <ControlRoomEntry />

        {PARENT_MORE_GROUPS.map(group => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map(item => (
              <TouchableOpacity key={item.route} style={styles.row} onPress={() => open(item.route)} activeOpacity={0.82}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.rowText}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.description}>{item.description}</Text>
                </View>
                {item.route === 'approvals' && pendingApprovals > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingApprovals}</Text>
                  </View>
                )}
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.promiseCard}>
          <Text style={styles.promiseTitle}>Support without surveillance</Text>
          <Text style={styles.promiseBody}>
            Bridge contains only intentional teen-parent connection. Circle stays completely separate. Teen journals, voice notes, and companion conversations stay private.
          </Text>
        </View>

        {allowSideSwitch ? (
          <View style={styles.devCard}>
            <Text style={styles.promiseTitle}>Founder tools</Text>
            <Text style={styles.promiseBody}>Development-only shortcuts. The Control Room still verifies founder, admin, or developer access.</Text>
            <TouchableOpacity style={styles.controlButton} onPress={() => router.push('/(dev)/control-room' as any)}>
              <Text style={styles.switchText}>Open Control Room</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => router.push('/(dev)/split-view' as any)}>
              <Text style={styles.switchText}>Open Split View (both sides)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => { setUserSide('teen'); router.push('/(teen)/room' as any); }}
            >
              <Text style={styles.switchText}>Founder Test: Go to Teen Side</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%', backgroundColor: '#0d0914' },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 110,
    ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}),
  },
  kicker: { color: '#a7f3d0', fontSize: 10, fontWeight: '900', letterSpacing: 2.3, marginBottom: 8 },
  logo: { fontSize: 34, fontWeight: '900', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#c6d5cc', marginBottom: 24, lineHeight: 21 },
  previewHero: { minHeight: 118, flexDirection: 'row', alignItems: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#f59e0b66', backgroundColor: 'rgba(74,35,10,0.92)', padding: 17, marginBottom: 16 },
  previewKicker: { color: '#fde68a', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 5 },
  previewTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  previewBody: { color: '#dbc9a8', fontSize: 11, lineHeight: 17, marginTop: 5 },
  previewArrow: { color: '#fde68a', fontSize: 34, marginLeft: 10 },
  group: { marginBottom: 22 },
  groupTitle: { color: '#85aa96', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 10 },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#a7f3d026', borderRadius: 18, backgroundColor: 'rgba(17,37,28,0.90)', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  badge: { backgroundColor: '#34d399', borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 4 },
  badgeText: { color: '#0d2318', fontSize: 12, fontWeight: '900' },
  emoji: { width: 38, fontSize: 21 },
  rowText: { flex: 1 },
  label: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 3 },
  description: { color: '#91a79a', fontSize: 12, lineHeight: 17 },
  arrow: { color: '#a7f3d0', fontSize: 28, paddingLeft: 8 },
  promiseCard: { borderRadius: 20, borderWidth: 1, borderColor: '#a7f3d02e', backgroundColor: 'rgba(17,37,28,0.92)', padding: 18, marginTop: 4, marginBottom: 14 },
  promiseTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  promiseBody: { color: '#9bb0a2', fontSize: 12, lineHeight: 18 },
  devCard: { borderRadius: 20, borderWidth: 1, borderColor: '#a7f3d02e', backgroundColor: 'rgba(17,37,28,0.92)', padding: 18, marginTop: 4 },
  controlButton: { height: 54, borderRadius: 18, backgroundColor: '#047857', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  switchButton: { height: 54, borderRadius: 18, backgroundColor: '#4338CA', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  switchText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
