export type QuietModeStatus = 'open' | 'quiet';

/**
 * The habit/schedule layer owns when a quiet window starts and ends.
 * Quiet mode deliberately does not invent bedtime or wake-time policy.
 */
export interface QuietModeWindow {
  enabled: boolean;
  startsAt: string;
  reopensAt: string;
}

export interface DailyQuietSchedule {
  start: string;
  end: string;
}

export interface QuietModeState {
  status: QuietModeStatus;
  reopensAt: string | null;
  reason: 'disabled' | 'invalid_window' | 'before_window' | 'active_window' | 'window_ended';
}

export interface QuietRouteContext {
  pathname: string;
  companion?: string | string[] | null;
}

export const QUIET_PRIMARY_DESTINATIONS = Object.freeze({
  pages: '/(teen)/pages',
  bridge: '/(teen)/bridge',
  night: '/(teen)/companion-chat?companion=night',
});

function timestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clockMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
}

function localTimeOnDay(now: Date, dayOffset: number, minuteOfDay: number): Date {
  const date = new Date(now.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setMinutes(minuteOfDay);
  return date;
}

/**
 * Resolve the persisted recurring sleep-window format into today's concrete
 * quiet state. Local calendar time is intentional because the setting itself
 * is expressed as local HH:MM rather than an absolute UTC schedule.
 */
export function resolveDailyQuietMode(
  schedule: DailyQuietSchedule | null | undefined,
  now: Date = new Date(),
): QuietModeState {
  if (!schedule) {
    return { status: 'open', reopensAt: null, reason: 'disabled' };
  }

  const startMinutes = clockMinutes(schedule.start);
  const endMinutes = clockMinutes(schedule.end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes || Number.isNaN(now.getTime())) {
    return { status: 'open', reopensAt: null, reason: 'invalid_window' };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let startDayOffset = 0;
  let endDayOffset = 0;

  if (startMinutes < endMinutes) {
    if (currentMinutes >= endMinutes) {
      startDayOffset = 1;
      endDayOffset = 1;
    }
  } else if (currentMinutes >= startMinutes) {
    endDayOffset = 1;
  } else if (currentMinutes < endMinutes) {
    startDayOffset = -1;
  } else {
    endDayOffset = 1;
  }

  const startsAt = localTimeOnDay(now, startDayOffset, startMinutes);
  const reopensAt = localTimeOnDay(now, endDayOffset, endMinutes);

  return resolveQuietMode({
    enabled: true,
    startsAt: startsAt.toISOString(),
    reopensAt: reopensAt.toISOString(),
  }, now.getTime());
}

/**
 * Resolve a concrete window supplied by the habit/schedule layer.
 * Invalid or absent scheduling fails open so a malformed preference cannot
 * trap a teen inside a broken route boundary.
 */
export function resolveQuietMode(
  window: QuietModeWindow | null | undefined,
  nowMs: number = Date.now(),
): QuietModeState {
  if (!window?.enabled) {
    return { status: 'open', reopensAt: null, reason: 'disabled' };
  }

  const startsAt = timestamp(window.startsAt);
  const reopensAt = timestamp(window.reopensAt);
  if (startsAt === null || reopensAt === null || reopensAt <= startsAt) {
    return { status: 'open', reopensAt: null, reason: 'invalid_window' };
  }

  if (nowMs < startsAt) {
    return { status: 'open', reopensAt: window.reopensAt, reason: 'before_window' };
  }

  if (nowMs >= reopensAt) {
    return { status: 'open', reopensAt: null, reason: 'window_ended' };
  }

  return { status: 'quiet', reopensAt: window.reopensAt, reason: 'active_window' };
}

function normalizePathname(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || '/';
  const withoutGroup = pathOnly.replace(/^\/\(teen\)(?=\/|$)/, '');
  if (!withoutGroup) return '/';
  return withoutGroup.startsWith('/') ? withoutGroup : `/${withoutGroup}`;
}

function firstParam(value: QuietRouteContext['companion']): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Quiet Bip has a deliberately tiny primary surface: Pages, Bridge, and Night.
 * /quiet is the internal reduced-state shell, not a fourth primary destination.
 * Companion chat is not generally allowed; the companion must resolve to Night.
 */
export function isQuietRouteAllowed(context: QuietRouteContext): boolean {
  const pathname = normalizePathname(context.pathname);

  if (pathname === '/quiet') return true;
  if (pathname === '/pages' || pathname.startsWith('/pages/')) return true;
  if (pathname === '/bridge') return true;
  if (pathname === '/companion-chat') {
    return firstParam(context.companion)?.trim().toLowerCase() === 'night';
  }

  return false;
}
