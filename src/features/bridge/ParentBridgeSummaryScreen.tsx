import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ParentBridgeResponseRequestCard } from '../../../components/bridge/ParentBridgeResponseRequestCard';
import { ParentBridgeSummaryInbox } from '@/features/bridge/ParentBridgeSummaryInbox';

export function ParentBridgeSummaryScreen() {
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1e0f06', '#2e1a10', '#3a2208']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🌉</Text>
          <Text style={styles.title}>Parent Bridge</Text>
          <Text style={styles.subtitle}>Only summaries and signals your teen deliberately chooses to share.</Text>
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Privacy boundary</Text>
          <Text style={styles.privacyText}>
            Linking accounts does not unlock journals, chats, mood history, media, or other private content.
            Bridge shows generated context and support requests only after your teen confirms a share.
          </Text>
        </View>

        <ParentBridgeResponseRequestCard />
        <ParentBridgeSummaryInbox />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e0f06' },
  content: { paddingHorizontal: 18, paddingTop: 64, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 22 },
  emoji: { fontSize: 44, marginBottom: 10 },
  title: { color: '#f5e8c8', fontSize: 28, fontWeight: '800' },
  subtitle: {
    color: 'rgba(245,232,200,0.72)',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 7,
    maxWidth: 330,
  },
  privacyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(233,160,74,0.35)',
    backgroundColor: 'rgba(46,26,16,0.88)',
    padding: 16,
    marginBottom: 16,
  },
  privacyTitle: { color: '#e9a04a', fontWeight: '800', marginBottom: 7 },
  privacyText: { color: '#f5e8c8', lineHeight: 21 },
});
