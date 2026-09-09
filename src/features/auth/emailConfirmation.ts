import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { AccountSide } from '@/features/identity/accountProfile';

export type EmailConfirmationUrlResult =
  | {
      kind: 'tokens';
      accessToken: string;
      refreshToken: string;
    }
  | {
      kind: 'error';
      message: string;
    }
  | {
      kind: 'missing';
    };

export function buildEmailConfirmationRedirectUrl(side: AccountSide): string {
  const queryParams = { emailConfirmed: '1', side };

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const redirect = new URL('/login', window.location.origin);
    redirect.searchParams.set('emailConfirmed', '1');
    redirect.searchParams.set('side', side);
    return redirect.toString();
  }

  return Linking.createURL('/login', { queryParams });
}

function collectParams(url: string): URLSearchParams {
  const parsed = new URL(url, 'https://sekret.invalid');
  const params = new URLSearchParams(parsed.search);
  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const fragmentParams = new URLSearchParams(fragment);
  fragmentParams.forEach((value, key) => params.set(key, value));
  return params;
}

export function parseEmailConfirmationUrl(
  url: string | null | undefined,
): EmailConfirmationUrlResult {
  if (!url) return { kind: 'missing' };

  let params: URLSearchParams;
  try {
    params = collectParams(url);
  } catch {
    throw new Error('This confirmation link is malformed.');
  }

  const errorMessage =
    params.get('error_description')?.trim()
    || params.get('error')?.trim()
    || params.get('error_code')?.trim();
  if (errorMessage) {
    return { kind: 'error', message: 'This confirmation link is invalid or expired.' };
  }

  const accessToken = params.get('access_token')?.trim() || '';
  const refreshToken = params.get('refresh_token')?.trim() || '';
  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken };
  }

  return { kind: 'missing' };
}

export function clearEmailConfirmationUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, '/login');
}
