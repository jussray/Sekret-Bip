// components/Analytics.web.tsx
// Cloudflare Pages owns the production web surface. The Vercel Analytics
// runtime requests /_vercel/insights/script.js, which is not a JavaScript
// resource on Cloudflare and must not be injected into the shipped app.
import React from 'react';

export function Analytics() {
  return null;
}
