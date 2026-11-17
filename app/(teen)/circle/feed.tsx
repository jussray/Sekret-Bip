import React from 'react';
import { Redirect } from 'expo-router';

/**
 * The repaired Circle lives at /(teen)/circle and owns the only public feed
 * implementation. Keep the old deep link working without reviving its
 * optimistic IDs, decorative tabs, or direct reaction writes.
 */
export function CircleFeed() {
  return <Redirect href="/(teen)/circle" />;
}

export default CircleFeed;
