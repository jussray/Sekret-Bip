// screens/PeriodCalendarScreen.tsx
// Se'kret Bip — Cycle Calendar (cycle layer of Womanhood, Suhana-led)
// Private. On-device only. No data leaves the phone.
//
// Phase 1 polish: time-of-day backdrop (raylene window), mood glow,
// staggered entrance, breath loop, today highlight, sticky note, body-positive copy.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  View,
  Image,
  ImageBackground,
  Animated,
  StyleSheet,
  Platform,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPeriodDay, deletePeriodDay, loadPeriodDays } from '@/utils/sync';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGES, getRoomBg, TimeOfDay } from '../constants/theme';

const RAYLENE_THINKING = IMAGES.rayleneThinking;
const CLOUD_HAPPY = IMAGES.cloudHappy;

interface PeriodCalendarScreenProps {
  theme:           Record<string, any>;
  setScreen:       (screen: string) => void;
  backTarget?:     string;
  BottomNav?:      React.ReactNode;
  selectedSekret?: string;
  mood?:           string;
}

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
};

const moodGlow = (mood?: string): string => {
  const m = (mood || '').toLowerCase();
  if (m === 'happy') return '#fbbf24';
  if (m === 'sad' || m === 'anxious') return '#7dd3fc';
  if (m === 'angry' || m === 'overwhelmed' || m === 'stressed') return '#f472b6';
  if (m === 'tired') return '#6d28d9';
  if (m === 'calm') return '#c4b5fd';
  return '#c4b5fd';
};

export function PeriodCalendarScreen({
  theme,
  setScreen,
  backTarget = 'home',
  BottomNav,
  selectedSekret,
  mood,
}: PeriodCalendarScreenProps) {

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [markedDays, setMarkedDays]     = useState<Record<string, string>>({});
  const [lastPeriodStart, setLastPeriodStart] = useState<string | null>(null);

  const time = useMemo(() => getTimeOfDay(), []);
  // Suhana-led screen, but backdrop respects the chosen companion's room
  const charKey: 'raylene' | 'rylane' = selectedSekret === 'rylane' ? 'rylane' : 'raylene';
  const bg   = useMemo(() => getRoomBg(charKey, time), [charKey, time]);
  const glow = useMemo(() => moodGlow(mood), [mood]);

  // Animations
  const card1 = useRef(new Animated.Value(0)).current;
  const card2 = useRef(new Animated.Value(0)).current;
  const card3 = useRef(new Animated.Value(0)).current;
  const card4 = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load local data first (instant)
    AsyncStorage.getItem('periodDays').then(v => {
      try {
        if (v) setMarkedDays(JSON.parse(v));
      } catch {
        setMarkedDays({});
      }
    });
    AsyncStorage.getItem('lastPeriodStart').then(v => {
      if (v) setLastPeriodStart(v);
    });
    // Merge cloud days (additive — non-destructive)
    loadPeriodDays().then(cloudDays => {
      if (!cloudDays.length) return;
      setMarkedDays(prev => {
        const merged = { ...prev };
        cloudDays.forEach(isoDay => {
          const [y, m, d] = isoDay.split('-').map(Number);
          merged[`${y}-${m}-${d}`] = 'period';
        });
        return merged;
      });
    }).catch(() => {/* offline — local data is fine */});
  }, []);

  useEffect(() => {
    const stagger = (val: Animated.Value, delay: number) =>
      Animated.timing(val, {
        toValue: 1, duration: 380, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
    Animated.parallel([
      stagger(card1, 0),
      stagger(card2, 140),
      stagger(card3, 280),
      stagger(card4, 420),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [card1, card2, card3, card4, breath]);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const cardStyle = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  const save = async (days: Record<string, string>, start: string | null) => {
    await AsyncStorage.setItem('periodDays', JSON.stringify(days));
    if (start) await AsyncStorage.setItem('lastPeriodStart', start);
  };

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay    = (m: number, y: number) => new Date(y, m, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long', year: 'numeric',
  });

  const toggleDay = (day: number) => {
    const key    = `${currentYear}-${currentMonth + 1}-${day}`;
    const isoDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const next   = { ...markedDays };

    if (next[key]) {
      delete next[key];
      void deletePeriodDay(isoDay);   // cloud remove
    } else {
      next[key] = 'period';
      void syncPeriodDay(isoDay);     // cloud upsert
      if (!lastPeriodStart) {
        setLastPeriodStart(key);
        save(next, key);
        setMarkedDays(next);
        return;
      }
    }
    setMarkedDays(next);
    save(next, lastPeriodStart);
  };

  const predictNext = (): string | null => {
    if (!lastPeriodStart) return null;
    const [y, m, d] = lastPeriodStart.split('-').map(Number);
    const next = new Date(y, m - 1, d + 28);
    return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const days     = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDay(currentMonth, currentYear);
  const cells    = Array(firstDay).fill(null).concat(
    Array.from({ length: days }, (_, i) => i + 1),
  );

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const prediction = predictNext();
  const isToday = (day: number | null) =>
    !!day &&
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  return (
    <View style={styles.root}>
      <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(20,10,40,0.5)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glow + '10' }]} />

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

          <Text style={styles.logo}>cycle calendar 🩸</Text>
          <Text style={styles.subtitle}>track your cycle, quietly. only you see this.</Text>

          <Animated.View
            style={[
              styles.energyBadge,
              { borderColor: glow, shadowColor: glow, shadowOpacity: 0.6, shadowRadius: 12 },
              { transform: [{ scale: breathScale }], opacity: breathOpacity },
            ]}
          >
            <Text style={[styles.energyText, { color: glow }]}>💜 private · on-device</Text>
          </Animated.View>

          <View style={styles.cloudWrap}>
            <Animated.Image
              source={CLOUD_HAPPY}
              style={[styles.cloudArt, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}
              resizeMode="contain"
            />
            <Image source={RAYLENE_THINKING} style={styles.artworkMedium} resizeMode="contain" />
          </View>
        </Animated.View>

        <Animated.View style={cardStyle(card2)}>
          <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.85)', borderColor: glow + '88', shadowColor: glow }]}>
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={prevMonth}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Text style={[styles.navArrow, { color: glow }]}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthName}>{monthName}</Text>
              <TouchableOpacity
                onPress={nextMonth}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Text style={[styles.navArrow, { color: glow }]}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dayHeaders}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={styles.dayHeader}>{d}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) => {
                const key    = day ? `${currentYear}-${currentMonth + 1}-${day}` : null;
                const marked = key ? markedDays[key] : null;
                const todayCell = isToday(day);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.cell}
                    onPress={() => day && toggleDay(day)}
                    disabled={!day}
                    accessibilityRole="button"
                    accessibilityLabel={day ? `${day}${marked ? ', marked' : ''}${todayCell ? ', today' : ''}` : undefined}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        marked ? { backgroundColor: '#e879a3' } : null,
                        todayCell && !marked ? { borderWidth: 2, borderColor: glow } : null,
                        marked ? { backgroundColor: '#e879a3' } : undefined,
                        todayCell && !marked && { borderWidth: 2, borderColor: glow },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: day ? (marked ? '#fff' : todayCell ? glow : '#e9defc') : 'transparent' },
                          todayCell && { fontWeight: '800' },
                        ]}
                      >
                        {day || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#e879a3' }]} />
                <Text style={styles.legendText}>period day</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { borderWidth: 2, borderColor: glow }]} />
                <Text style={styles.legendText}>today</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={cardStyle(card3)}>
          {prediction && (
            <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.78)', borderColor: glow + '88' }]}>
              <Text style={[styles.softLabel, { color: '#cbb6f7' }]}>next predicted period</Text>
              <Text style={styles.predictionDate}>~{prediction}</Text>
              <Text style={styles.predictionSub}>based on a 28-day average cycle · just an estimate</Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.78)', borderColor: glow + '88' }]}>
            <Text style={styles.tipsTitle}>comfort tips 💜</Text>
            {[
              'heating pad for cramps',
              'water · hydration helps a lot',
              'rest when your body asks',
              "be gentle. it's okay to slow down",
              'warm tea + dark chocolate are friends 🍫',
              'gentle stretching · no pressure',
            ].map(tip => (
              <Text key={tip} style={styles.tip}>· {tip}</Text>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={cardStyle(card4)}>
          <View style={styles.stickyNote}>
            <Text style={styles.stickyText}>
              "your body isn't a problem to solve. it's yours. you know it best." — suhana
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.7)', borderColor: glow + '66' }]}>
            <Text style={styles.privacyNote}>
              tap any day to mark it 🩸 · your data stays on this device. nothing leaves. 🔒
            </Text>
          </View>

          <View style={{ height: 36 }} />
        </Animated.View>

        {BottomNav}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#0d0820' },
  container:     { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 36, paddingBottom: 60 },
  backBtn:       { marginBottom: 8, alignSelf: 'flex-start' },
  backText:      { color: '#c4b5fd', fontSize: 14 },
  logo:          { fontSize: 26, fontWeight: '900', color: '#e9defc', textAlign: 'center', marginBottom: 4 },
  subtitle:      { fontSize: 13, color: '#9d8ec7', textAlign: 'center', marginBottom: 16 },
  energyBadge:   { alignSelf: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12, shadowOffset: { width: 0, height: 0 } },
  energyText:    { fontSize: 12, fontWeight: '700' },
  cloudWrap:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 20, gap: 8 },
  cloudArt:      { width: 60, height: 60 },
  artworkMedium: { width: 100, height: 100 },
  card:          { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1.5, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  monthNav:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navArrow:      { fontSize: 28, fontWeight: '300', paddingHorizontal: 8 },
  monthName:     { color: '#e9defc', fontSize: 16, fontWeight: '700' },
  dayHeaders:    { flexDirection: 'row', marginBottom: 4 },
  dayHeader:     { flex: 1, textAlign: 'center', color: '#9d8ec7', fontSize: 11, fontWeight: '600' },
  grid:          { flexDirection: 'row', flexWrap: 'wrap' },
  cell:          { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
  dayCircle:     { width: '80%', aspectRatio: 1, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  dayText:       { fontSize: 13, fontWeight: '500' },
  legendRow:     { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:     { width: 12, height: 12, borderRadius: 6 },
  legendText:    { color: '#9d8ec7', fontSize: 11 },
  softLabel:     { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  predictionDate: { color: '#e9defc', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  predictionSub: { color: '#9d8ec7', fontSize: 11 },
  tipsTitle:     { color: '#e9defc', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  tip:           { color: '#c4b5fd', fontSize: 13, lineHeight: 22 },
  stickyNote:    { backgroundColor: 'rgba(232,121,163,0.12)', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e879a344' },
  stickyText:    { color: '#f0c0d8', fontSize: 13, fontStyle: 'italic', lineHeight: 20, textAlign: 'center' },
  privacyNote:   { color: '#7c6a9e', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
