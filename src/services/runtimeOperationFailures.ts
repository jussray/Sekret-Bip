import {
  captureFingerprintedError,
  logRuntimeFingerprint,
  type RuntimeFingerprintLogOptions,
} from '@/services/runtimeFingerprintLogger';

export type AuthFailureKind = 'login' | 'signup' | 'session_restore';
export type AssetFailureKind = 'missing' | 'image_decode' | 'room_scene';

const AUTH_FINGERPRINTS = {
  login: 'auth.login_failed',
  signup: 'auth.signup_failed',
  session_restore: 'auth.session_restore_failed',
} as const;

const ASSET_FINGERPRINTS = {
  missing: 'asset.missing',
  image_decode: 'asset.image_decode_failed',
  room_scene: 'asset.room_scene_missing',
} as const;

export async function reportAuthFailure(
  kind: AuthFailureKind,
  error: unknown,
  options: Omit<RuntimeFingerprintLogOptions, 'message'> = {},
): Promise<void> {
  await captureFingerprintedError(AUTH_FINGERPRINTS[kind], error, {
    ...options,
    screen: options.screen ?? 'Auth',
  });
}

export async function reportAssetFailure(
  kind: AssetFailureKind,
  options: RuntimeFingerprintLogOptions = {},
): Promise<void> {
  await logRuntimeFingerprint(ASSET_FINGERPRINTS[kind], options);
}

export async function reportSupabaseOperationFailure(input: {
  operation: string;
  error: unknown;
  screen?: string | null;
  table?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await captureFingerprintedError('sync.device_failed', input.error, {
    screen: input.screen ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      operation: input.operation,
      table: input.table ?? null,
      source_system: 'supabase',
    },
  });
}
