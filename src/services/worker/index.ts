/**
 * src/services/worker/index.ts
 *
 * Cloudflare Worker helpers.
 * These are thin wrappers around the Worker's HTTP API.
 *
 * All AI calls go through src/services/ai/chat.ts instead.
 * This file handles non-AI Worker routes (health, moderation, etc.).
 */
import { backendAuthHeaders } from '../../utils/backendAuth';

const BASE_URL = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_BACKEND_URL ?? '';

/** Check that the Cloudflare Worker is reachable */
export async function checkWorkerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Run a quick content moderation check on user-submitted text.
 * Returns true if the text is safe to display.
 */
export async function moderateContent(text: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/moderate`, {
      method:  'POST',
      headers: await backendAuthHeaders(),
      body:    JSON.stringify({ text }),
    });
    if (!res.ok) return true; // fail open on network error
    const data = await res.json();
    return data.safe ?? true;
  } catch {
    return true;
  }
}
