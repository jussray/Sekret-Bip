import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { BipCrewScreen } from '@screens/BipCrewScreen';
import { MessagesScreen } from '@screens/MessagesScreen';
import { THEME_PACKS } from '@/constants/theme';
import { routeForSide } from '@/shared/routes';
import ParentCircle from './feed';

type Tab = 'circle' | 'crew' | 'messages';

export default function ParentCircleRoute() {
  const {
    theme, parentMood, parentRoomStyle,
    parentCrewMembers, setParentCrewMembers,
    parentCrewCheckIns, setParentCrewCheckIns,
  } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const [tab, setTab] = useState<Tab>('circle');

  const companion = parentRoomStyle === 'dad' ? 'rylane' : 'raylene';
  const goTo = (screen: string) => router.push(routeForSide('parent', screen) as any);

  return (
    <View style={s.root}>
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'circle' && s.tabActive]}
          onPress={() => setTab('circle')}
        >
          <Text style={[s.tabText, tab === 'circle' && s.tabTextActive]}>🤝 Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'crew' && s.tabActive]}
          onPress={() => setTab('crew')}
        >
          <Text style={[s.tabText, tab === 'crew' && s.tabTextActive]}>🌿 Crew</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'messages' && s.tabActive]}
          onPress={() => setTab('messages')}
        >
          <Text style={[s.tabText, tab === 'messages' && s.tabTextActive]}>💜 Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.weatherBtn}
          onPress={() => router.push('/(parent)/circle/weather' as any)}
        >
          <Text style={s.weatherBtnText}>🌤️</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        {tab === 'circle' ? (
          <ParentCircle />
        ) : tab === 'crew' ? (
          <BipCrewScreen
            t={t}
            mood={parentMood}
            selectedSekret={companion}
            crewMembers={parentCrewMembers}
            setCrewMembers={setParentCrewMembers}
            crewCheckIns={parentCrewCheckIns}
            setCrewCheckIns={setParentCrewCheckIns}
            setScreen={goTo}
            BottomNav={null}
          />
        ) : (
          <MessagesScreen
            side="parent"
            setScreen={goTo}
            BottomNav={null}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#0a1a14' },
  tabs:          {
    flexDirection: 'row',
    backgroundColor: '#0d1f18',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a2f',
  },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: '#34d399' },
  tabText:       { color: '#3d6b54', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#d1fae5' },
  weatherBtn:    { paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  weatherBtnText: { color: '#6b8f77', fontSize: 11, fontWeight: '700' },
  content:       { flex: 1 },
});
