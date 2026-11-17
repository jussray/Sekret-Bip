import type { DayKey, ISODay, MarkedDays } from './types';

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 1).getDay();
}

export function buildCalendarCells(month: number, year: number): (number | null)[] {
  const days = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  return Array(firstDay).fill(null).concat(Array.from({ length: days }, (_, i) => i + 1));
}

export function dayKey(year: number, month: number, day: number): DayKey {
  return `${year}-${month + 1}-${day}`;
}

export function toISODay(year: number, month: number, day: number): ISODay {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function predictNextPeriod(lastPeriodStart: string | null, cycleDays = 28): string | null {
  if (!lastPeriodStart) return null;
  const [y, m, d] = lastPeriodStart.split('-').map(Number);
  const next = new Date(y, m - 1, d + cycleDays);
  return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function getDaysSinceLastPeriod(lastPeriodStart: string | null): number | null {
  if (!lastPeriodStart) return null;
  const [y, m, d] = lastPeriodStart.split('-').map(Number);
  const last = new Date(y, m - 1, d);
  const today = new Date();
  const ms = today.getTime() - last.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function isToday(day: number | null, month: number, year: number): boolean {
  if (!day) return false;
  const today = new Date();
  return (
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()
  );
}

export function mergeMarkedDays(local: MarkedDays, cloudDays: ISODay[]): MarkedDays {
  const merged = { ...local };
  cloudDays.forEach(isoDay => {
    const [y, m, d] = isoDay.split('-').map(Number);
    merged[`${y}-${m}-${d}`] = 'period';
  });
  return merged;
}
