import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WorkspaceDependency } from './types';

const C = {
  surface: '#0d0a15',
  border: '#272238',
  text: '#e2dff0',
  muted: '#8f899e',
  faint: '#4a4660',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
} as const;

interface Props {
  chain: WorkspaceDependency[];
  label?: string;
}

export default function PRDependencyRail({ chain, label = 'MERGE ORDER PREVIEW' }: Props) {
  if (chain.length === 0) return null;

  return (
    <View style={styles.root}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {chain.map((dependency, index) => (
          <React.Fragment key={dependency.prNumber}>
            <DependencyNode dependency={dependency} />
            {index < chain.length - 1 ? <Text style={styles.arrow}>→</Text> : null}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

function DependencyNode({ dependency }: { dependency: WorkspaceDependency }) {
  const statusColor =
    dependency.status === 'merged'
      ? C.green
      : dependency.status === 'closed'
        ? C.red
        : C.yellow;

  return (
    <View style={[styles.node, { borderColor: `${statusColor}66` }]}>
      <Text style={[styles.number, { color: statusColor }]}>#{dependency.prNumber}</Text>
      <Text style={styles.title} numberOfLines={2}>{dependency.title}</Text>
      <Text style={[styles.status, { color: statusColor }]}>{dependency.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginVertical: 8 },
  label: {
    color: C.faint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  node: {
    width: 132,
    gap: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: C.surface,
  },
  number: { fontSize: 13, fontWeight: '800' },
  title: { color: C.muted, fontSize: 11, lineHeight: 15 },
  status: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  arrow: { color: C.faint, fontSize: 16, fontWeight: '700', paddingHorizontal: 6 },
  text: { color: C.text },
  border: { color: C.border },
});
