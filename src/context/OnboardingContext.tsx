/**
 * Canonical onboarding context.
 *
 * `advance()` waits for the current user's onboarding write attempt to finish,
 * so screens that use `await advance(...)` do not race navigation against the
 * database. It returns whether the server accepted the write, keeping failures
 * observable without turning onboarding telemetry into an authorization gate.
 */
import React, { createContext, useCallback, useContext } from 'react';
import { advanceStage, type OnboardingStage } from '@/services/onboarding';
import { getSupabase } from '@/utils/supabase';

interface OnboardingContextValue {
  advance: (
    stage: OnboardingStage,
    payload?: Record<string, unknown>,
  ) => Promise<boolean>;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  advance: async () => false,
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const advance = useCallback(async (
    stage: OnboardingStage,
    payload?: Record<string, unknown>,
  ): Promise<boolean> => {
    const client = getSupabase();
    if (!client) return false;

    try {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data.user) return false;

      await advanceStage(data.user.id, stage, payload);
      return true;
    } catch (cause) {
      console.warn(
        `[OnboardingContext] Could not record stage "${stage}":`,
        cause instanceof Error ? cause.message : 'unknown error',
      );
      return false;
    }
  }, []);

  return (
    <OnboardingContext.Provider value={{ advance }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  return useContext(OnboardingContext);
}
