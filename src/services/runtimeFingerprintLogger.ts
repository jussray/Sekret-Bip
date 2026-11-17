import type { AuditEvent } from '@/services/founderAudit';
import { logRuntimeAuditEvent } from '@/services/runtimeAudit';
import {
  buildRuntimeFingerprint,
  getRuntimeFingerprint,
  type RuntimeFingerprintKey,
} from '@/services/runtimeFingerprints';

export interface RuntimeFingerprintLogOptions {
  message?: string | null;
  screen?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Logs a known repo-level runtime fingerprint.
 *
 * Existing free-form runtime audit calls remain supported, while new code can
 * use this wrapper to avoid event-type and screen-name drift.
 */
export async function logRuntimeFingerprint(
  key: RuntimeFingerprintKey,
  options: RuntimeFingerprintLogOptions = {},
): Promise<AuditEvent | null> {
  const definition = getRuntimeFingerprint(key);
  if (!definition) {
    console.warn(`[runtimeFingerprintLogger] Unknown fingerprint key: ${key}`);
    return null;
  }

  const screen = options.screen ?? definition.screen;
  const fingerprint = buildRuntimeFingerprint(
    definition.source,
    definition.event_type,
    screen,
  );

  return logRuntimeAuditEvent(definition.source, {
    event_type: definition.event_type,
    screen,
    severity: definition.severity,
    message: options.message ?? definition.title,
    metadata: {
      ...(options.metadata ?? {}),
      fingerprint_key: definition.key,
      fingerprint,
      category: definition.category,
      suggested_fix: definition.suggested_fix,
    },
  });
}

export async function captureFingerprintedError(
  key: RuntimeFingerprintKey,
  error: unknown,
  options: Omit<RuntimeFingerprintLogOptions, 'message'> = {},
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await logRuntimeFingerprint(key, {
    ...options,
    message,
    metadata: {
      ...(options.metadata ?? {}),
      error_name: error instanceof Error ? error.name : 'UnknownError',
    },
  });
}
