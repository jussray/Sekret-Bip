// screens/PeriodCalendarScreen.tsx
// Se'kret Bip — Cycle Calendar (cycle layer of Womanhood, Raylene-led)
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
  // Raylene-led screen, but backdrop respects the chosen companion's room
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
    AsyncStorage.getItem('periodDays').then(v => {
      try {
        if (v) setMarkedDays(JSON.parse(v));
      } catch {
        setMarkedDays({});
      }
    }).catch(() => {});
    AsyncStorage.getItem('lastPeriodStart').then(v => {
      if (v) setLastPeriodStart(v);
    }).catch(() => {});
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

  const save = (days: Record<string, string>, start: string | null) => {
    AsyncStorage.setItem('periodDays', JSON.stringify(days)).catch(() => {});
    if (start) AsyncStorage.setItem('lastPeriodStart', start).catch(() => {});
  };

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay    = (m: number, y: number) => new Date(y, m, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long', year: 'numeric',
  });

  const toggleDay = (day: number) => {
    const key  = `${currentYear}-${currentMonth + 1}-${day}`;
    const next = { ...markedDays };

    if (next[key]) {
      delete next[key];
    } else {
      next[key] = 'period';
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
              “your body isn’t a problem to solve. it’s yours. you know it best.” — raylene
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
  root: { flex: 1, backgroundColor: '#0e0820' },
  container:      { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  logo:           { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 6, letterSpacing: 0.3 },
  subtitle:       { fontSize: 14, color: '#cbb6f7', textAlign: 'center', marginBottom: 14, fontStyle: 'italic' },
  energyBadge:    { alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
  energyText:     { fontSize: 13, fontWeight: '600' },

  cloudWrap: { alignItems: 'center', marginBottom: 12 },
  cloudArt: { width: 60, height: 60, marginBottom: 6 },

  card:           { padding: 18, borderRadius: 20, marginBottom: 14, borderWidth: 1, shadowOpacity: 0.35, shadowRadius: 14 },
  backBtn:        { marginBottom: 12 },
  backText:       { color: '#cbb6f7', fontSize: 14 },
  monthNav:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navArrow:       { fontSize: 26, fontWeight: 'bold' },
  monthName:      { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  dayHeaders:     { flexDirection: 'row', marginBottom: 8 },
  dayHeader:      { flex: 1, textAlign: 'center', color: '#cbb6f7', fontSize: 12, fontWeight: 'bold' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap' },
  cell:           { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dayCircle:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayText:        { fontSize: 14 },

  legendRow:      { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:      { width: 12, height: 12, borderRadius: 6 },
  legendText:     { color: '#cbb6f7', fontSize: 11 },

  softLabel:      { fontSize: 13, marginBottom: 4 },
  predictionDate: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  predictionSub:  { color: '#cbb6f7', fontSize: 12, marginTop: 4 },
  tipsTitle:      { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  tip:            { color: '#e9defc', fontSize: 14, marginBottom: 6, lineHeight: 21 },
  privacyNote:    { fontSize: 13, fontStyle: 'italic', textAlign: 'center', color: '#cbb6f7', lineHeight: 19 },
  artworkMedium:  { width: 180, height: 180, marginBottom: 12, borderRadius: 16 },

  stickyNote: { backgroundColor: '#fff8e7', borderColor: '#7c3aed', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12, marginBottom: 14, transform: [{ rotate: '-2deg' }] },
  stickyText: { color: '#3a2461', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 19 },
});
