import { router } from 'expo-router';
import { routeForSide } from '@/shared/routes';

export function parentNavigateTo(screen: string): void {
  const path = routeForSide('parent', screen);
  router.push(path as Parameters<typeof router.push>[0]);
}
