import { getSupabase } from '@/utils/supabase';
import { captureFingerprintedError } from '@/services/runtimeFingerprintLogger';

export async function invokeWorker<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const sb = getSupabase();
  if (!sb) {
    const error = new Error('Supabase not configured');
    await captureFingerprintedError('worker.request_failed', error, {
      screen: functionName,
      metadata: {
        functionName,
        failure_stage: 'client_not_configured',
      },
    });
    throw error;
  }

  try {
    const { data, error } = await sb.functions.invoke(functionName, { body });
    if (error) throw error;
    return data as T;
  } catch (error) {
    await captureFingerprintedError('worker.request_failed', error, {
      screen: functionName,
      metadata: {
        functionName,
        failure_stage: 'invoke',
      },
    });
    throw error;
  }
}
