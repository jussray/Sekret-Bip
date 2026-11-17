import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { BipCrewScreen } from '@screens/BipCrewScreen';
import { THEME_PACKS } from '@/constants/theme';
import { routeForSide } from '@/shared/routes';
import CircleScreen from '@screens/CircleScreen';

type Tab = 'circle' | 'crew';

export default function TeenCircleRoute() {
  const {
    theme, mood, selectedSekret,
    crewMembers, setCrewMembers,
    crewCheckIns, setCrewCheckIns,
  } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const [tab, setTab] = useState<Tab>('circle');

  return (
    <View style={s.root}>
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'circle' && s.tabActive]}
          onPress={() => setTab('circle')}
        >
          <Text style={[s.tabText, tab === 'circle' && s.tabTextActive]}>🌐 Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'crew' && s.tabActive]}
          onPress={() => setTab('crew')}
        >
          <Text style={[s.tabText, tab === 'crew' && s.tabTextActive]}>🤝 Crew</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        {tab === 'circle' ? (
          <CircleScreen />
        ) : (
          <BipCrewScreen
            t={t}
            mood={mood}
            selectedSekret={selectedSekret}
            crewMembers={crewMembers}
            setCrewMembers={setCrewMembers}
            crewCheckIns={crewCheckIns}
            setCrewCheckIns={setCrewCheckIns}
            setScreen={(screen: string) => router.push(routeForSide('teen', screen) as any)}
            BottomNav={null}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#0d0518' },
  tabs:          {
    flexDirection: 'row',
    backgroundColor: '#130828',
    borderBottomWidth: 1,
    borderBottomColor: '#2e1250',
  },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: '#a855f7' },
  tabText:       { color: '#5a3a78', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#e8dff5' },
  content:       { flex: 1 },
});
