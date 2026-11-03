import { Platform } from 'react-native';
import type { AppCheck } from '@react-native-firebase/app-check';
import { registerAppCheckTokenProvider } from '../appCheckToken';

const APP_CHECK_ENABLED = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_ENABLED === 'true';
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

  // Native Firebase apps must come from provider-returned platform config.
  // Web may initialize from browser-safe public identifiers.
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

async function readFreshAppCheckToken(): Promise<string | null> {
  const appCheck = await getClientAppCheck();
  if (!appCheck) return null;

  try {
    const { getToken } = await import('@react-native-firebase/app-check');
    const { token } = await getToken(appCheck);
    const normalized = token.trim();
    return normalized || null;
  } catch {
    return null;
  }
}

/**
 * Installs Firebase as the request-scoped App Check token provider only.
 * It never becomes auth, RLS, consent, relationship, or durable-data authority.
 * The disabled default registers no provider and does not load native Firebase.
 */
export function installFirebaseAppCheckTokenProvider(): () => void {
  if (!APP_CHECK_ENABLED) {
    registerAppCheckTokenProvider(null);
    return () => registerAppCheckTokenProvider(null);
  }

  registerAppCheckTokenProvider(readFreshAppCheckToken);
  return () => registerAppCheckTokenProvider(null);
}

export function firebaseAppCheckClientEnabled(): boolean {
  return APP_CHECK_ENABLED;
}
