import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { Analytics } from '@/components/shared/Analytics';
import { NotificationBootstrap } from '@/components/shared/NotificationBootstrap';
import { AppProvider, useAppContext } from '@/context/AppContext';
import { VerificationProvider, useVerificationContext } from '@/context/VerificationContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { installSekretBipGuardrailRuntime } from '@/config/visionGuardrails';
import { isFounderPreviewEnabled } from '@/constants/founderPreview';
import { decideRouteAccess } from '@/services/routeAccess';
import { validateEnv } from '@/utils/env';
import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';
import { clearPrivateAccountCache } from '@/utils/storage';
import { clearProfileIdentityCache } from '@/features/identity/clearProfileIdentityCache';
import { getDevSplitViewSideOverride } from '@/utils/devSplitViewSide';

void validateEnv();

const SOCIAL_SEGMENTS = new Set(['circle', 'crew', 'bip-crew', 'discover']);
const PUBLIC_ONBOARDING_SEGMENTS = new Set([
  'welcome',
  'age',
  'parental-consent',
  'parent-splash',
  'parent-welcome',
]);

function RouteBoundary() {
  const { userSide, isLoading } = useAppContext();
  const {
    verificationState,
    isVerificationLoading,
    isAuthResolved,
    isAuthenticated,
  } = useVerificationContext();
  const segments = useSegments();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    if (!sb) return;

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (session || event !== 'SIGNED_OUT') return;

      void (async () => {
        try {
          await clearPrivateAccountCache();
          await clearProfileIdentityCache();
        } finally {
          router.replace('/(auth)/login');
        }
      })();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const routeSegments = Array.from(segments) as string[];
    const first = String(routeSegments[0] ?? '');
    const second = String(routeSegments[1] ?? '');

    if (!isAuthResolved || isLoading || isVerificationLoading) return;

    if (isSupabaseConfigured && !isAuthenticated) {
      const isPublicRoot = first === '';
      const isPublicOnboarding = first === '(onboarding)' && PUBLIC_ONBOARDING_SEGMENTS.has(second);
      if (!isPublicRoot && first !== '(auth)' && !isPublicOnboarding) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Founder Preview is a development-only route-inspection mode. It may
    // bypass onboarding/verification routing after the normal auth boundary,
    // but it never grants a Supabase session, relationship, RLS permission,
    // or screen-level data capability.
    if (isFounderPreviewEnabled()) return;

    const effectiveUserSide = getDevSplitViewSideOverride() ?? userSide;
    if (!effectiveUserSide) return;

    const firstSegment = first === '(teen)' && SOCIAL_SEGMENTS.has(second) ? '(social)' : first;
    const decision = decideRouteAccess({
      firstSegment,
      userSide: effectiveUserSide,
      verificationState,
    });

    if (!decision.allowed && decision.redirectTo) {
      router.replace(decision.redirectTo);
    }
  }, [
    isAuthResolved,
    isAuthenticated,
    isLoading,
    isVerificationLoading,
    segments,
    userSide,
    verificationState,
  ]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    installSekretBipGuardrailRuntime();
  }, []);

  return (
    <VerificationProvider>
      <AppProvider>
        {/* OnboardingProvider sits inside AppProvider so it has access to
            useAuth/useAppContext, but wraps everything below so all screens
            can call useOnboarding() without prop-drilling. */}
        <OnboardingProvider>
          <RouteBoundary />
          <NotificationBootstrap />
          <Analytics />
          <Stack screenOptions={{ headerShown: false }} />
        </OnboardingProvider>
      </AppProvider>
    </VerificationProvider>
  );
}
