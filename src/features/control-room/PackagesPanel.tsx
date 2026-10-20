import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../../package.json') as {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type Section = 'deps' | 'dev';

export default function PackagesPanel() {
  const [section, setSection] = useState<Section>('deps');

  const deps    = Object.entries(pkg.dependencies    ?? {});
  const devDeps = Object.entries(pkg.devDependencies ?? {});
  const entries = section === 'deps' ? deps : devDeps;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{pkg.name} <Text style={styles.version}>v{pkg.version}</Text></Text>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, section === 'deps' && styles.tabActive]} onPress={() => setSection('deps')}>
            <Text style={[styles.tabLabel, section === 'deps' && styles.tabLabelActive]}>deps ({deps.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, section === 'dev' && styles.tabActive]} onPress={() => setSection('dev')}>
            <Text style={[styles.tabLabel, section === 'dev' && styles.tabLabelActive]}>dev ({devDeps.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {entries.map(([name, ver]) => (
          <View key={name} style={styles.row}>
            <Text style={styles.pkgName} numberOfLines={1}>{name}</Text>
            <Text style={[styles.pkgVer, ver.startsWith('^') ? styles.caret : ver.startsWith('~') ? styles.tilde : styles.exact]}>
              {ver}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#080611' },
  header:       { paddingHorizontal: 16, paddingTop: 72, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1a1628' },
  title:        { color: '#e2d9f3', fontWeight: '900', fontSize: 15, marginBottom: 10 },
  version:      { color: '#7c6fa0', fontWeight: '400' },
  tabs:         { flexDirection: 'row', gap: 6 },
  tab:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#120e1e' },
  tabActive:    { backgroundColor: '#6d28d9' },
  tabLabel:     { color: '#7c6fa0', fontSize: 11, fontWeight: '800' },
  tabLabelActive: { color: '#fff' },
  list:         { flex: 1 },
  listContent:  { paddingHorizontal: 16, paddingVertical: 8 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#100d1a' },
  pkgName:      { color: '#c4b5fd', fontSize: 12, flex: 1, marginRight: 8 },
  pkgVer:       { fontSize: 11, fontWeight: '700' },
  caret:        { color: '#4ade80' },
  tilde:        { color: '#facc15' },
  exact:        { color: '#94a3b8' },
});
