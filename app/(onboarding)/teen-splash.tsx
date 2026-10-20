import React, { useEffect } from 'react';
import { router } from 'expo-router';

/**
 * Deprecated compatibility route.
 *
 * Se’kret Bip no longer has a canonical splash step. Preserve this route for
 * stale links/history, but immediately continue to the current teen onboarding
 * entry instead of rendering a splash surface.
 */
export default function TeenOnboardingSplash() {
  useEffect(() => {
    router.replace('/(onboarding)/welcome');
  }, []);

  return null;
}
