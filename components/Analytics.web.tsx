// Web-specific Analytics component
// This file is only loaded on web platform (Expo/Metro automatically uses .web.tsx files on web)
import React from 'react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';

export function Analytics() {
  return <VercelAnalytics />;
}
