import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Public Circle no longer exposes the unfinished reply/comment surface.
 * Old post-detail links return to the canonical reactions-only feed.
 */
export default function LegacyCirclePostRedirect() {
  return <Redirect href="/(teen)/circle" />;
}
