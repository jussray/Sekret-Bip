export type AppCheckTokenProvider = () => Promise<string | null>;

let tokenProvider: AppCheckTokenProvider | null = null;

/**
 * Register a runtime App Check token provider without making Firebase an auth or data authority.
 * Providers should return a fresh token when available and null when App Check is unavailable.
 */
export function registerAppCheckTokenProvider(provider: AppCheckTokenProvider | null): void {
  tokenProvider = provider;
}

/**
 * Read the current App Check token for one backend request.
 * Tokens are intentionally not persisted in AsyncStorage, SecureStore, cookies, or module caches.
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (!tokenProvider) return null;

  try {
    const token = await tokenProvider();
    const normalized = token?.trim() ?? '';
    return normalized || null;
  } catch {
    return null;
  }
}
