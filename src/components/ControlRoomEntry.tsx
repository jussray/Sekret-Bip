/**
 * src/components/ControlRoomEntry.tsx
 * Private entry card for the Founder Control Room.
 * Drop this inside your More or Settings screen — it only renders
 * when the signed-in user has a founder/admin/developer role.
 *
 * Usage:
 *   import { ControlRoomEntry } from '@/components/ControlRoomEntry';
 *   <ControlRoomEntry />
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import {
  getCurrentFounderProfile,
  isFounderProfile,
  listFounderAuditEvents,
} from '@/services/founderAudit';
import { founderIdeasService } from '@/services/founderIdeas';

interface EntryState {
  visible: boolean;
  openIssues: number;
  criticalIssues: number;
  openIdeas: number;
}

export function ControlRoomEntry() {
  const [state, setState] = useState<EntryState>({
    visible: false,
    openIssues: 0,
    criticalIssues: 0,
    openIdeas: 0,
  });

  useEffect(() => {
    void (async () => {
      const profile = await getCurrentFounderProfile();
      if (!isFounderProfile(profile)) return;

      const [events, ideas] = await Promise.all([
        listFounderAuditEvents(60),
        founderIdeasService.list(),
      ]);

      const open = events.filter((e) => !e.resolved);
      const critical = open.filter((e) => e.severity === 'critical');
      const activeIdeas = ideas.filter(
        (i) => !['shipped', 'rejected'].includes(i.status),
      );

      setState({
        visible: true,
        openIssues: open.length,
        criticalIssues: critical.length,
        openIdeas: activeIdeas.length,
      });
    })();
  }, []);

  if (!state.visible) return null;

  return (
    <TouchableOpacity
      style={styles.entry}
      onPress={() => router.push('/(dev)')}
      activeOpacity={0.82}
    >
      <View style={styles.left}>
        <Text style={styles.icon}>🛠</Text>
        <View>
          <Text style={styles.title}>Founder Control Room</Text>
          <Text style={styles.sub}>
            {state.openIssues} open issue{state.openIssues !== 1 ? 's' : ''}
            {state.criticalIssues > 0 ? ` · ${state.criticalIssues} critical` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        {state.criticalIssues > 0 ? (
          <View style={styles.criticalBadge}>
            <Text style={styles.criticalBadgeText}>{state.criticalIssues}</Text>
          </View>
        ) : null}
        {state.openIdeas > 0 ? (
          <View style={styles.ideaBadge}>
            <Text style={styles.ideaBadgeText}>{state.openIdeas} 💡</Text>
          </View>
        ) : null}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151029',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    marginVertical: 6,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  icon: { fontSize: 24 },
  title: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    marginBottom: 2,
  },
  sub: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '700',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  criticalBadge: {
    backgroundColor: '#7f1d1d',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  criticalBadgeText: {
    color: '#fca5a5',
    fontWeight: '900',
    fontSize: 12,
  },
  ideaBadge: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  ideaBadgeText: {
    color: '#a78bfa',
    fontWeight: '800',
    fontSize: 12,
  },
  chevron: {
    color: '#6b7280',
    fontSize: 20,
    marginLeft: 2,
  },
});
