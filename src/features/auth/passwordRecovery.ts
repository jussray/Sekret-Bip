export const PASSWORD_RECOVERY_PATH = '/reset-password';
export const PASSWORD_MIN_LENGTH = 8;

export type RecoveryUrlResult =
  | {
      kind: 'tokens';
      accessToken: string;
      refreshToken: string;
      type: string | null;
    }
  | {
      kind: 'code';
      code: string;
      type: string | null;
    }
  | {
      kind: 'error';
      message: string;
    }
  | {
      kind: 'missing';
    };

export function normalizeRecoveryEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateRecoveryEmail(value: string): string | null {
  const email = normalizeRecoveryEmail(value);
  if (!email) return 'Enter the email connected to your Bip account.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function buildRecoveryRedirectUrl(options: {
  webOrigin?: string | null;
  nativeUrl?: string | null;
}): string {
  const webOrigin = options.webOrigin?.trim();
  if (webOrigin) return new URL(PASSWORD_RECOVERY_PATH, webOrigin).toString();

  const nativeUrl = options.nativeUrl?.trim();
  if (nativeUrl) return nativeUrl;

  throw new Error('A web origin or native recovery URL is required.');
}

function collectParams(url: string): URLSearchParams {
  const parsed = new URL(url, 'https://sekret.invalid');
  const params = new URLSearchParams(parsed.search);
  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const fragmentParams = new URLSearchParams(fragment);
  fragmentParams.forEach((value, key) => params.set(key, value));
  return params;
}

export function parseRecoveryUrl(url: string | null | undefined): RecoveryUrlResult {
  if (!url) return { kind: 'missing' };

  let params: URLSearchParams;
  try {
    params = collectParams(url);
  } catch {
    return { kind: 'error', message: 'This reset link is malformed. Request a new one.' };
  }

  const errorMessage =
    params.get('error_description')?.trim()
    || params.get('error')?.trim()
    || params.get('error_code')?.trim();
  if (errorMessage) {
    return {
      kind: 'error',
      message: 'This reset link is invalid or expired. Request a new one.',
    };
  }

  const type = params.get('type')?.trim().toLowerCase() || null;
  const accessToken = params.get('access_token')?.trim() || '';
  const refreshToken = params.get('refresh_token')?.trim() || '';
  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken, type };
  }

  const code = params.get('code')?.trim() || '';
  if (code) return { kind: 'code', code, type };

  return { kind: 'missing' };
}

export function isRecoveryCredential(result: RecoveryUrlResult): boolean {
  return (result.kind === 'tokens' || result.kind === 'code') && result.type === 'recovery';
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password !== confirm) return "Passwords don't match.";
  return null;
}
