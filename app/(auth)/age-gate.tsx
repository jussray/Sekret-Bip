/**
 * app/(auth)/age-gate.tsx
 *
 * COPPA age verification — must complete before any data is stored.
 *
 * Flow:
 *   1. User selects birth month + year.
 *   2. < 13  → COPPA block screen (parent must set up the account).
 *   3. 13-17 → route to consent screen as 'teen'.
 *   4. 18+   → route to consent screen as 'parent'.
 *
 * We store dob as month/year only (day defaults to 1st) — enough for age
 * calculation, minimises data collection.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

function computeAge(month: number, year: number): number {
  const today = new Date();
  const dob   = new Date(year, month - 1, 1);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

type Screen = 'picker' | 'blocked';

export default function AgeGate() {
  const [screen, setScreen]         = useState<Screen>('picker');
  const [selectedMonth, setMonth]   = useState<number | null>(null);
  const [selectedYear, setYear]     = useState<number | null>(null);
  const [showYears, setShowYears]   = useState(false);

  function handleContinue() {
    if (selectedMonth === null || selectedYear === null) return;
    const age = computeAge(selectedMonth, selectedYear);

    if (age < 13) {
      setScreen('blocked');
      return;
    }

    const accountType = age < 18 ? 'teen' : 'parent';
    const dob = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    router.replace({
      pathname: '/(auth)/consent',
      params: { dob, accountType },
    });
  }

  if (screen === 'blocked') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.blockedContainer}>
          <Text style={s.blockedEmoji}>🔒</Text>
          <Text style={s.blockedTitle}>This space isn't ready for you yet</Text>
          <Text style={s.blockedBody}>
            Se'kret Bip is built for teens 13 and up. If you're younger,
            ask a parent or guardian to set up your space — they can create
            the parent side first and then invite you in.
          </Text>
          <TouchableOpacity style={s.backBtn} onPress={() => setScreen('picker')}>
            <Text style={s.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ready = selectedMonth !== null && selectedYear !== null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        <Text style={s.kicker}>BEFORE WE START</Text>
        <Text style={s.title}>When were you born?</Text>
        <Text style={s.sub}>
          We ask this once to make sure your experience is right for your age.
          We don't store your exact date.
        </Text>

        {/* Month picker */}
        <Text style={s.label}>Month</Text>
        <View style={s.monthGrid}>
          {MONTHS.map((name, idx) => {
            const m = idx + 1;
            const active = selectedMonth === m;
            return (
              <TouchableOpacity
                key={m}
                style={[s.monthChip, active && s.monthChipActive]}
                onPress={() => setMonth(m)}
                activeOpacity={0.78}
              >
                <Text style={[s.monthChipText, active && s.monthChipTextActive]}>
                  {name.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Year picker */}
        <Text style={s.label}>Year</Text>
        <TouchableOpacity
          style={s.yearSelector}
          onPress={() => setShowYears(v => !v)}
          activeOpacity={0.82}
        >
          <Text style={s.yearSelectorText}>
            {selectedYear !== null ? String(selectedYear) : 'Select year'}
          </Text>
          <Text style={s.yearCaret}>{showYears ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showYears && (
          <ScrollView
            style={s.yearDropdown}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {YEARS.map(yr => {
              const active = selectedYear === yr;
              return (
                <TouchableOpacity
                  key={yr}
                  style={[s.yearRow, active && s.yearRowActive]}
                  onPress={() => { setYear(yr); setShowYears(false); }}
                  activeOpacity={0.78}
                >
                  <Text style={[s.yearRowText, active && s.yearRowTextActive]}>
                    {yr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[s.cta, !ready && s.ctaDisabled]}
          disabled={!ready}
          onPress={handleContinue}
          activeOpacity={0.82}
        >
          <Text style={s.ctaText}>Continue</Text>
        </TouchableOpacity>

        <Text style={s.legalNote}>
          By continuing you confirm this information is accurate.
          Children under 13 are not permitted without verifiable parental consent.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0d0820' },
  content: { padding: 24, paddingTop: Platform.OS === 'android' ? 48 : 24, paddingBottom: 60 },

  kicker:  { color: '#c4b5fd', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  title:   { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 10 },
  sub:     { color: '#a99fb1', fontSize: 13, lineHeight: 20, marginBottom: 28 },
  label:   { color: '#eee7f2', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10, marginTop: 20 },

  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthChip: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff14',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  monthChipActive:     { borderColor: '#c4b5fd', backgroundColor: 'rgba(196,181,253,0.16)' },
  monthChipText:       { color: '#a99fb1', fontSize: 13, fontWeight: '700' },
  monthChipTextActive: { color: '#c4b5fd' },

  yearSelector: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffffff18',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearSelectorText: { color: '#fff', fontSize: 16 },
  yearCaret:        { color: '#888', fontSize: 12 },

  yearDropdown: {
    maxHeight: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffffff14',
    backgroundColor: '#130d22',
    marginTop: 4,
  },
  yearRow:         { paddingVertical: 12, paddingHorizontal: 16 },
  yearRowActive:   { backgroundColor: 'rgba(196,181,253,0.12)' },
  yearRowText:     { color: '#a99fb1', fontSize: 15 },
  yearRowTextActive:{ color: '#c4b5fd', fontWeight: '700' },

  cta: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#c4b5fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText:     { color: '#160b24', fontSize: 16, fontWeight: '900' },

  legalNote: { color: '#4a4158', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 20 },

  // Blocked screen
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  blockedEmoji: { fontSize: 56, marginBottom: 24 },
  blockedTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  blockedBody:  { color: '#a99fb1', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 36 },
  backBtn:      { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff22' },
  backBtnText:  { color: '#888', fontSize: 15 },
});
