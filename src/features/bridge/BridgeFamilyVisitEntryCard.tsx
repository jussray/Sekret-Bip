import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { fetchBridgeFamilyVisitBundle } from '@/services/bridgeFamilyVisitService';

export function BridgeFamilyVisitEntryCard() {
  const [visible, setVisible] = useState(false);
  const [professional, setProfessional] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchBridgeFamilyVisitBundle().then((result) => {
      if (!active || !result.ok || !result.value) return;
      const capabilityVerified = result.value.capability?.verificationStatus === 'verified';
      const hasAssignment = result.value.assignments.length > 0;
      setProfessional(capabilityVerified);
      setVisible(capabilityVerified || hasAssignment);
    });
    return () => { active = false; };
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Family Visit Mode"
        onPress={() => router.push('/bridge-family-visit' as never)}
        style={styles.card}
      >
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{professional ? 'PROFESSIONAL BRIDGE' : 'BRIDGE'}</Text>
          <Text style={styles.title}>Family Visit Mode</Text>
          <Text style={styles.body}>Visible, no-recording support for an assigned child-parent visit.</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#0d0715',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#4a3760',
    backgroundColor: '#181020',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  copy: { flex: 1, gap: 2 },
  eyebrow: { color: '#bda5ff', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '850' },
  body: { color: '#cfc4db', fontSize: 11, lineHeight: 16 },
  arrow: { color: '#d8c6ff', fontSize: 30, lineHeight: 32, fontWeight: '400' },
});
