import { Platform } from 'react-native';
import type { AppCheck } from '@react-native-firebase/app-check';

const APP_CHECK_HEADER = 'X-Firebase-AppCheck';

// App Check client attachment is intentionally opt-in. Cloudflare remains the
// enforcement authority through FIREBASE_APPCHECK_MODE=off|observe|enforce.
const APP_CHECK_ENABLED = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_ENABLED === 'true';

// Browser-safe Firebase client configuration. These values identify a Firebase
// app but are not authorization credentials. Supabase remains user identity.
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() ?? '';
const FIREBASE_APP_ID = process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() ?? '';
const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '';
const FIREBASE_MESSAGING_SENDER_ID = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '';
const FIREBASE_APPCHECK_SITE_KEY = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_SITE_KEY?.trim() ?? '';

let appCheckPromise: Promise<AppCheck | null> | null = null;

function hasWebFirebaseConfig(): boolean {
  return Boolean(
    FIREBASE_API_KEY
    && FIREBASE_APP_ID
    && FIREBASE_PROJECT_ID
    && FIREBASE_MESSAGING_SENDER_ID
  );
}

async function resolveFirebaseApp() {
  const { getApp, getApps, initializeApp } = await import('@react-native-firebase/app');

  if (getApps().length > 0) return getApp();

  // Native apps are configured by GoogleService-Info.plist / google-services.json.
  // Until those provider-side files exist, native App Check stays absent rather
  // than inventing a second Firebase app or silently weakening the boundary.
  if (Platform.OS !== 'web' || !hasWebFirebaseConfig()) return null;

  return initializeApp({
    apiKey: FIREBASE_API_KEY,
    appId: FIREBASE_APP_ID,
    projectId: FIREBASE_PROJECT_ID,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  });
}

async function initializeClientAppCheck(): Promise<AppCheck | null> {
  if (!APP_CHECK_ENABLED) return null;
  if (Platform.OS === 'web' && !FIREBASE_APPCHECK_SITE_KEY) return null;

  const firebaseApp = await resolveFirebaseApp();
  if (!firebaseApp) return null;

  const {
    ReactNativeFirebaseAppCheckProvider,
    initializeAppCheck,
  } = await import('@react-native-firebase/app-check');

  const provider = new ReactNativeFirebaseAppCheckProvider();
  provider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
    },
    apple: {
      provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
    },
    web: {
      provider: 'reCaptchaEnterprise',
      siteKey: FIREBASE_APPCHECK_SITE_KEY,
    },
  });

  return initializeAppCheck(firebaseApp, {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}

async function getClientAppCheck(): Promise<AppCheck | null> {
  if (!APP_CHECK_ENABLED) return null;
  if (!appCheckPromise) {
    appCheckPromise = initializeClientAppCheck().catch(() => null);
  }
  return appCheckPromise;
}

/**
 * Returns the App Check request header when attestation is available.
 *
 * Client failure deliberately produces no header. The Cloudflare verifier owns
 * observe/enforce behavior and can therefore distinguish missing attestation
 * from invalid attestation without the client impersonating authorization.
 */
export async function firebaseAppCheckHeaders(): Promise<Record<string, string>> {
  const appCheck = await getClientAppCheck();
  if (!appCheck) return {};

  try {
    const { getToken } = await import('@react-native-firebase/app-check');
    const { token } = await getToken(appCheck);
    const normalized = token.trim();
    return normalized ? { [APP_CHECK_HEADER]: normalized } : {};
  } catch {
    return {};
  }
}

export function firebaseAppCheckClientEnabled(): boolean {
  return APP_CHECK_ENABLED;
}
