/**
 * src/utils/navigation.ts
 *
 * Shared legacy setScreen() bridge. New architecture routes through side
 * domains: /(teen) and /(parent). Defaults to teen for older callers that do
 * not pass a side yet.
 */
import { router } from 'expo-router';
import { routeForSide } from '@/shared/routes';

export function navigateTo(screen: string, side: 'teen' | 'parent' = 'teen'): void {
  router.push(routeForSide(side, screen) as Parameters<typeof router.push>[0]);
}

export const SCREEN_MAP: Record<string, string> = {
  home: routeForSide('teen', 'home'),
  room: routeForSide('teen', 'room'),
  pages: routeForSide('teen', 'pages'),
  calm: routeForSide('teen', 'calm'),
  circle: routeForSide('teen', 'circle'),
  sekret: routeForSide('teen', 'sekret'),
  voiceBip: routeForSide('teen', 'voiceBip'),
  voicebip: routeForSide('teen', 'voicebip'),
  bridge: routeForSide('teen', 'bridge'),
  parentBridge: routeForSide('parent', 'parentBridge'),
  cloudThoughts: routeForSide('teen', 'cloudThoughts'),
  discover: routeForSide('teen', 'discover'),
  settings: routeForSide('teen', 'settings'),
  profile: routeForSide('teen', 'profile'),
};
