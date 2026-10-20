import { useEffect, useState } from 'react';
import { loadSekretMemory } from '../../services/sekretMemory';

export function useStreak(): { streakDays: number } {
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    loadSekretMemory().then(mem => setStreakDays(mem.streaks.current));
  }, []);

  return { streakDays };
}
