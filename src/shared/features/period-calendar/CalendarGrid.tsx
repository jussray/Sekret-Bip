import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { MarkedDays } from './types';
import { buildCalendarCells, dayKey, isToday } from './dateHelpers';

interface CalendarGridProps {
  month: number;
  year: number;
  markedDays: MarkedDays;
  accentColor: string;
  markedColor: string;
  onToggleDay: (day: number) => void;
  readOnly?: boolean;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CalendarGrid({
  month, year, markedDays, accentColor, markedColor, onToggleDay, readOnly = false,
}: CalendarGridProps) {
  const cells = buildCalendarCells(month, year);

  return (
    <View>
      <View style={styles.dayHeaders}>
        {DAY_LABELS.map(d => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          const key = day ? dayKey(year, month, day) : null;
          const marked = key ? markedDays[key] : null;
          const today = isToday(day, month, year);
          return (
            <TouchableOpacity
              key={i}
              style={styles.cell}
              onPress={() => !readOnly && day && onToggleDay(day)}
              disabled={!day || readOnly}
              accessibilityRole="button"
              accessibilityLabel={day ? `${day}${marked ? ', marked' : ''}${today ? ', today' : ''}` : undefined}
            >
              <View
                style={[
                  styles.dayCircle,
                  marked ? { backgroundColor: markedColor } : null,
                  today && !marked ? { borderWidth: 2, borderColor: accentColor } : null,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: day ? (marked ? '#fff' : today ? accentColor : '#e9defc') : 'transparent' },
                    today && { fontWeight: '800' },
                  ]}
                >
                  {day || ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeader:  { flex: 1, textAlign: 'center', color: '#9d8ec7', fontSize: 11, fontWeight: '600' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell:       { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
  dayCircle:  { width: '80%', aspectRatio: 1, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  dayText:    { fontSize: 13, fontWeight: '500' },
});
