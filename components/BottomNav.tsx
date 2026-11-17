import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

interface BottomNavProps {
  screen: string;
  setScreen: (screen: string) => void;
  userSide: 'teen' | 'parent';
}

export function BottomNav({ screen, setScreen, userSide }: BottomNavProps) {
  const items = userSide === 'parent'
    ? [
        ['home',         '🏠', 'Parent Room'],
        ['pages',        '📔', 'Pages'],
        ['parentBridge', '🌉', 'Bridge'],
        ['circle',       '🌐', 'Parent Circle'],
        ['more',         '☰',  'More'],
      ]
    : [
        ['home',   '🏠', 'Room'],
        ['pages',  '📖', 'Pages'],
        ['calm',   '🌙', 'Calm'],
        ['circle', '🌐', 'Circle'],
        ['more',   '☰',  'More'],
      ];

  return (
    <View style={styles.bottomNav}>
      {items.map(([id, icon, label]: any) => (
        <TouchableOpacity
          key={id}
          onPress={() => setScreen(id)}
          style={styles.navItem}
        >
          <Text style={styles.navIcon}>{icon}</Text>
          <Text
            style={[
              styles.navText,
              screen === id && styles.activeNavText,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: '#111827',
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
    ...(Platform.OS === 'web' ? { maxWidth: 500, width: '100%', alignSelf: 'center' as const } : {}),
  },
  navItem: {
    alignItems: 'center',
    minWidth: 52,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  navText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  activeNavText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});