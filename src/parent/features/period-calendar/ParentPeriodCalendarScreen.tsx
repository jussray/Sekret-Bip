// Parent-side period support tool.
// Completely separate from the teen's private cycle tracker.
// Teen cycle data is NEVER shown here unless the teen explicitly shares it.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Platform, Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarGrid } from '../../../shared/features/period-calendar/CalendarGrid';
import { predictNextPeriod } from '../../../shared/features/period-calendar/dateHelpers';
import type { MarkedDays } from '../../../shared/features/period-calendar/types';

interface ParentPeriodCalendarScreenProps {
  theme:       Record<string, any>;
  setScreen:   (screen: string) => void;
  backTarget?: string;
  BottomNav?:  React.ReactNode;
}

const SUPPLY_CHECKLIST = [
  'pads / tampons / period underwear',
  'pain reliever (ibuprofen or paracetamol)',
  'heating pad or hot water bottle',
  'dark chocolate & comforting snacks',
  'extra clean clothing for school bag',
  'gentle wipes / hand sanitiser',
];

const COMFORT_TIPS = [
  "Let them rest without guilt — don't push through it",
  "Ask what they need; don't assume",
  'Avoid making it a big deal in front of others',
  "Warm tea, a hot-water bottle, and quiet time go a long way",
  "\"I'm here\" is sometimes the only thing needed",
  'Keep supplies stocked and accessible without announcement',
];

const EDUCATION_NOTES = [
  'Average cycle: 21–45 days (teens vary more than adults)',
  'First periods can be irregular for 1–2 years — that\'s normal',
  'Cramping, fatigue, and mood shifts are real physical symptoms',
  'Hormonal changes affect sleep, focus, and emotional regulation',
  'Period poverty is real — keep supplies accessible, not conditional',
];

export function ParentPeriodCalendarScreen({
  theme,
  setScreen,
  backTarget = 'home',
  BottomNav,
}: ParentPeriodCalendarScreenProps) {
  const today = new Date();
  const [tab, setTab] = useState<'support' | 'mycycle'>('support');

  // Parent's own optional cycle tracking (separate from teen)
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [myMarkedDays, setMyMarkedDays] = useState<MarkedDays>({});
  const [myLastStart, setMyLastStart] = useState<string | null>(null);

  // Teen shared data — empty unless teen explicitly shares (gated by future bridge feature)
  const [teenSharedDays] = useState<MarkedDays>({});
  const [teenSharedNextPrediction] = useState<string | null>(null);

  const card1 = useRef(new Animated.Value(0)).current;
  const card2 = useRef(new Animated.Value(0)).current;
  const card3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('parentOwnCycleDays').then(v => {
      try { if (v) setMyMarkedDays(JSON.parse(v)); } catch { /* ignore */ }
    });
    AsyncStorage.getItem('parentOwnCycleStart').then(v => {
      if (v) setMyLastStart(v);
    });
  }, []);

  useEffect(() => {
    const stagger = (val: Animated.Value, delay: number) =>
      Animated.timing(val, {
        toValue: 1, duration: 360, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
    Animated.parallel([stagger(card1, 0), stagger(card2, 120), stagger(card3, 240)]).start();
  }, [card1, card2, card3]);

  const cardStyle = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long', year: 'numeric',
  });

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const toggleMyDay = async (day: number) => {
    const key = `${currentYear}-${currentMonth + 1}-${day}`;
    const next = { ...myMarkedDays };
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = 'period';
      if (!myLastStart) {
        setMyLastStart(key);
        await AsyncStorage.setItem('parentOwnCycleStart', key);
      }
    }
    setMyMarkedDays(next);
    await AsyncStorage.setItem('parentOwnCycleDays', JSON.stringify(next));
  };

  const myPrediction = useMemo(() => predictNextPeriod(myLastStart), [myLastStart]);

  const accentGreen = '#5ebd8a';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(15,28,20,0.98)', 'rgba(8,20,14,0.99)']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View style={cardStyle(card1)}>
          <TouchableOpacity
            onPress={() => setScreen(backTarget)}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backText}>← back</Text>
          </TouchableOpacity>

          <Text style={styles.logo}>cycle support 🌿</Text>
          <Text style={styles.subtitle}>tools to help you show up well</Text>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'support' && { borderColor: accentGreen, backgroundColor: accentGreen + '22' }]}
              onPress={() => setTab('support')}
            >
              <Text style={[styles.tabBtnText, tab === 'support' && { color: accentGreen }]}>Support Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'mycycle' && { borderColor: accentGreen, backgroundColor: accentGreen + '22' }]}
              onPress={() => setTab('mycycle')}
            >
              <Text style={[styles.tabBtnText, tab === 'mycycle' && { color: accentGreen }]}>My Cycle (optional)</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {tab === 'support' ? (
          <>
            <Animated.View style={[cardStyle(card2), styles.card]}>
              <Text style={styles.sectionTitle}>📦 supply checklist</Text>
              {SUPPLY_CHECKLIST.map(item => (
                <Text key={item} style={styles.listItem}>· {item}</Text>
              ))}
            </Animated.View>

            <Animated.View style={[cardStyle(card2), styles.card]}>
              <Text style={styles.sectionTitle}>💬 comfort tips for parents</Text>
              {COMFORT_TIPS.map(tip => (
                <Text key={tip} style={styles.listItem}>· {tip}</Text>
              ))}
            </Animated.View>

            <Animated.View style={[cardStyle(card3), styles.card]}>
              <Text style={styles.sectionTitle}>📚 know the basics</Text>
              {EDUCATION_NOTES.map(note => (
                <Text key={note} style={styles.listItem}>· {note}</Text>
              ))}
            </Animated.View>

            {/* Teen shared data — only visible if teen has shared */}
            {Object.keys(teenSharedDays).length > 0 || teenSharedNextPrediction ? (
              <Animated.View style={[cardStyle(card3), styles.card, styles.sharedCard]}>
                <Text style={styles.sectionTitle}>💜 teen shared with you</Text>
                {teenSharedNextPrediction && (
                  <Text style={styles.sharedNote}>
                    Next predicted period: ~{teenSharedNextPrediction}
                  </Text>
                )}
                <Text style={styles.sharedSub}>
                  Your teen chose to share this. Their full calendar stays private to them.
                </Text>
              </Animated.View>
            ) : (
              <Animated.View style={[cardStyle(card3), styles.card, styles.mutedCard]}>
                <Text style={styles.mutedTitle}>teen's calendar is private</Text>
                <Text style={styles.mutedNote}>
                  If your teen ever chooses to share their cycle info with you, it will appear here.
                  Until then, this space stays empty — and that's okay.
                </Text>
              </Animated.View>
            )}
          </>
        ) : (
          <>
            <Animated.View style={[cardStyle(card2), styles.card]}>
              <Text style={styles.sectionTitle}>your own cycle (optional)</Text>
              <Text style={styles.mutedNote}>
                Track your own cycle separately. This data is yours alone — it never links to your teen's calendar.
              </Text>

              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} accessibilityRole="button" accessibilityLabel="Previous month">
                  <Text style={[styles.navArrow, { color: accentGreen }]}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthName}>{monthName}</Text>
                <TouchableOpacity onPress={nextMonth} accessibilityRole="button" accessibilityLabel="Next month">
                  <Text style={[styles.navArrow, { color: accentGreen }]}>›</Text>
                </TouchableOpacity>
              </View>

              <CalendarGrid
                month={currentMonth}
                year={currentYear}
                markedDays={myMarkedDays}
                accentColor={accentGreen}
                markedColor="#3d9b6e"
                onToggleDay={toggleMyDay}
              />

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3d9b6e' }]} />
                  <Text style={styles.legendText}>period day</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { borderWidth: 2, borderColor: accentGreen }]} />
                  <Text style={styles.legendText}>today</Text>
                </View>
              </View>
            </Animated.View>

            {myPrediction && (
              <Animated.View style={[cardStyle(card3), styles.card]}>
                <Text style={styles.softLabel}>next predicted period</Text>
                <Text style={styles.predictionDate}>~{myPrediction}</Text>
                <Text style={styles.predictionSub}>based on a 28-day average · just an estimate</Text>
              </Animated.View>
            )}
          </>
        )}

        <View style={{ height: 36 }} />
        {BottomNav}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#0a1a10' },
  container:     { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 36, paddingBottom: 60 },
  backBtn:       { marginBottom: 8, alignSelf: 'flex-start' },
  backText:      { color: '#5ebd8a', fontSize: 14 },
  logo:          { fontSize: 26, fontWeight: '900', color: '#e8f5ee', textAlign: 'center', marginBottom: 4 },
  subtitle:      { fontSize: 13, color: '#7aad8e', textAlign: 'center', marginBottom: 20 },
  tabRow:        { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tabBtn:        { flex: 1, borderWidth: 1.5, borderColor: '#2d4a38', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  tabBtnText:    { color: '#7aad8e', fontSize: 13, fontWeight: '700' },
  card:          { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: '#1e3a28', backgroundColor: 'rgba(20,40,28,0.88)' },
  sectionTitle:  { color: '#e8f5ee', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  listItem:      { color: '#a8d4b8', fontSize: 13, lineHeight: 22 },
  sharedCard:    { borderColor: '#6d28d988' },
  sharedNote:    { color: '#c4b5fd', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  sharedSub:     { color: '#9d8ec7', fontSize: 12 },
  mutedCard:     { borderColor: '#1e3a28' },
  mutedTitle:    { color: '#7aad8e', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  mutedNote:     { color: '#5a8a6a', fontSize: 12, lineHeight: 18 },
  monthNav:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 12 },
  navArrow:      { fontSize: 28, fontWeight: '300', paddingHorizontal: 8 },
  monthName:     { color: '#e8f5ee', fontSize: 16, fontWeight: '700' },
  legendRow:     { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:     { width: 12, height: 12, borderRadius: 6 },
  legendText:    { color: '#7aad8e', fontSize: 11 },
  softLabel:     { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1, color: '#7aad8e' },
  predictionDate: { color: '#e8f5ee', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  predictionSub: { color: '#7aad8e', fontSize: 11 },
});
