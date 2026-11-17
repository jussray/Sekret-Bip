declare module '@vercel/analytics/react' {
  import React from 'react';
  export function Analytics(props?: Record<string, unknown>): React.ReactElement | null;
}
