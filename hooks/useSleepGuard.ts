/**
 * hooks/useSleepGuard.ts
 *
 * Existing user-chosen sleep hours are the schedule authority for Quiet Bip.
 * The hook keeps the historical AsyncStorage key for compatibility, but now
 * re-evaluates while the app stays open and synchronizes all mounted callers.
 */

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveDailyQuietMode } from '@/features/quiet/quietMode';

const SLEEP_KEY = 'sleepWindow';
const RECHECK_MS = 30_000;

export interface SleepWindow {
  start: string; // 'HH:MM' 24-hour
  end: string;
}

type SleepWindowListener = (window: SleepWindow | null) => void;
const listeners = new Set<SleepWindowListener>();

function isSleepWindow(value: unknown): value is SleepWindow {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SleepWindow>;
  return typeof candidate.start === 'string' && typeof candidate.end === 'string';
}

function publishSleepWindow(window: SleepWindow | null): void {
  for (const listener of listeners) listener(window);
}

function quietState(window: SleepWindow | null) {
  return resolveDailyQuietMode(window, new Date());
}

export function useSleepGuard() {
  const [sleepActive, setSleepActive] = useState(false);
  const [reopensAt, setReopensAt] = useState<string | null>(null);
  const [sleepLoaded, setSleepLoaded] = useState(false);
  const [window_, setWindow] = useState<SleepWindow | null>(null);

  useEffect(() => {
    let mounted = true;

    const applyWindow = (nextWindow: SleepWindow | null) => {
      if (!mounted) return;
      setWindow(nextWindow);
      const state = quietState(nextWindow);
      setSleepActive(state.status === 'quiet');
      setReopensAt(state.reopensAt);
      setSleepLoaded(true);
    };

    listeners.add(applyWindow);

    AsyncStorage.getItem(SLEEP_KEY)
      .then(raw => {
        if (!mounted) return;
        if (!raw) {
          applyWindow(null);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        applyWindow(isSleepWindow(parsed) ? parsed : null);
      })
      .catch(() => applyWindow(null));

    return () => {
      mounted = false;
      listeners.delete(applyWindow);
    };
  }, []);

  useEffect(() => {
    if (!sleepLoaded) return undefined;

    const refresh = () => {
      const state = quietState(window_);
      setSleepActive(state.status === 'quiet');
      setReopensAt(state.reopensAt);
    };

    refresh();
    const interval = setInterval(refresh, RECHECK_MS);
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [sleepLoaded, window_]);

  const setSleepWindow = async (window: SleepWindow | null) => {
    if (window === null) {
      await AsyncStorage.removeItem(SLEEP_KEY);
    } else {
      await AsyncStorage.setItem(SLEEP_KEY, JSON.stringify(window));
    }
    publishSleepWindow(window);
  };

  return {
    sleepActive,
    quietActive: sleepActive,
    reopensAt,
    sleepLoaded,
    sleepWindow: window_,
    setSleepWindow,
  };
}
