import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type RoomGuideSide = 'teen' | 'parent';

type RoomGuideItem = {
  label: string;
  route: string;
  description: string;
};

const TEEN_ITEMS: RoomGuideItem[] = [
  { label: 'Journal', route: 'pages', description: 'Write, save, and look back.' },
  { label: 'Voice Bip', route: 'voiceBip', description: 'Talk out loud with your companion.' },
  { label: 'Calm', route: 'calm', description: 'Breathe, ground, or wind down.' },
  { label: 'Bridge', route: 'bridge', description: 'Share intentionally with your linked parent.' },
  { label: 'Circle', route: 'circle', description: 'Go to your community space.' },
  { label: 'Growth', route: 'bippin2', description: 'See progress, points, and growth tools.' },
];

const PARENT_ITEMS: RoomGuideItem[] = [
  { label: 'Bridge', route: 'bridge', description: 'Open intentionally shared connection.' },
  { label: 'Parent Pages', route: 'pages', description: 'Write private reflections and repair notes.' },
  { label: 'Pause Before Replying', route: 'calm', description: 'Regulate before answering.' },
  { label: 'Parent Circle', route: 'circle', description: 'Open parent-to-parent community.' },
  { label: 'More', route: 'more', description: 'Connection tools, settings, and resources.' },
];

interface RoomExploreGuideProps {
  side: RoomGuideSide;
  onNavigate: (route: string) => void;
}

export function RoomExploreGuide({ side, onNavigate }: RoomExploreGuideProps) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => (side === 'parent' ? PARENT_ITEMS : TEEN_ITEMS), [side]);
  const accent = side === 'parent' ? '#a7f3d0' : '#c4b5fd';
  const panelBackground = side === 'parent' ? 'rgba(4,16,12,0.96)' : 'rgba(18,8,36,0.96)';

  return (
    <View pointerEvents="box-none" style={styles.shell}>
      <TouchableOpacity
        testID="room-explore-guide-button"
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide room shortcuts' : 'Show room shortcuts'}
        accessibilityHint="Shows the main places you can reach from this room."
        activeOpacity={0.84}
        onPress={() => setOpen(value => !value)}
        style={[styles.trigger, { borderColor: `${accent}66`, backgroundColor: panelBackground }]}
      >
        <Text style={[styles.triggerText, { color: accent }]}>{open ? 'Hide shortcuts' : '✦ What can I tap?'}</Text>
      </TouchableOpacity>

      {open ? (
        <View
          testID="room-explore-guide-panel"
          accessibilityRole="summary"
          style={[styles.panel, { borderColor: `${accent}55`, backgroundColor: panelBackground }]}
        >
          <Text style={styles.title}>Room shortcuts</Text>
          <Text style={styles.body}>Tap objects in the room, or use a shortcut here.</Text>
          {items.map(item => (
            <TouchableOpacity
              key={item.route}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label}`}
              activeOpacity={0.82}
              onPress={() => {
                setOpen(false);
                onNavigate(item.route);
              }}
              style={styles.row}
            >
              <View style={styles.rowText}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
              <Text style={[styles.arrow, { color: accent }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    top: 54,
    right: 14,
    zIndex: 70,
    alignItems: 'flex-end',
  },
  trigger: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  panel: {
    width: 272,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  body: {
    color: '#bdb4c7',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 9,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 8,
  },
  rowText: { flex: 1, paddingRight: 10 },
  label: { color: '#fff', fontSize: 13, fontWeight: '800' },
  description: { color: '#9e94aa', fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  arrow: { fontSize: 23, fontWeight: '700' },
});
