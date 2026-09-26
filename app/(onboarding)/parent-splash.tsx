import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Deprecated compatibility route.
 *
 * Se’kret Bip no longer has a canonical splash step. Preserve this route for
 * stale links/history, but immediately continue to the parent destination.
 */
export default function ParentOnboardingSplash() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const destination = next === 'room' ? '/(parent)/room' : '/(onboarding)/parent-welcome';

  useEffect(() => {
    router.replace(destination);
  }, [destination]);

  return null;
}
