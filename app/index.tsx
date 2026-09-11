import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { useVerificationContext } from '@/context/VerificationContext';
import { SplashScreen } from '@screens/SplashScreen';
import { WebWelcomeScreen } from '@screens/WebWelcomeScreen';
import { FrontDoorSceneArrival } from '@/components/FrontDoorSceneArrival';
import { getDevSplitViewSideOverride } from '@/utils/devSplitViewSide';
import { isSupabaseConfigured } from '@/utils/supabase';
import type { AccountProfile, AccountSide } from '@/features/identity/accountProfile';
import {
  resolveParentEntryState,
  routeForParentEntryState,
} from '@/services/parentEntryState';
import { getCurrentFounderProfile, isFounderProfile } from '@/services/founderAudit';

const isAccountServiceConfigured = isSupabaseConfigured;

function getBuildSide(): AccountSide | null {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT;
  if (variant === 'teen' || variant === 'parent') return variant;
  return null;
}

export default function Index() {
  const { userSide, setUserSide, isLoading } = useAppContext();
  const {
    verificationState,
    isVerificationLoading,
    isAuthResolved,
    session,
  } = useVerificationContext();
  const [authChecked, setAuthChecked] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [hasPermanentSession, setHasPermanentSession] = useState(false);
  const [requiresAccountUpgrade, setRequiresAccountUpgrade] = useState(false);
  const [requiredConsentsComplete, setRequiredConsentsComplete] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [splashEntered, setSplashEntered] = useState(false);
  const [selectedEntrySide, setSelectedEntrySide] = useState<AccountSide | null>(null);
  const [routed, setRouted] = useState(false);
  const buildSide = useMemo(getBuildSide, []);
  const previewSide = useMemo(getDevSplitViewSideOverride, []);
  const effectiveSide: AccountSide = accountProfile?.accountSide ?? buildSide ?? userSide ?? 'teen';
  const publicWelcomeSide: AccountSide = previewSide ?? buildSide ?? userSide ?? 'teen';
  const publicEntrySide: AccountSide = selectedEntrySide ?? previewSide ?? buildSide ?? userSide ?? 'teen';
  const canOfferSignIn = authChecked
    && profileResolved
    && !hasPermanentSession
    && !requiresAccountUpgrade
    && !bootstrapError;

  useEffect(() => {
    if (!isAuthResolved) {
      setAuthChecked(false);
      setProfileResolved(false);
      return;
    }

    let cancelled = false;
    let profileDeferred = false;

    async function bootstrap() {
      setBootstrapError(null);
      setProfileResolved(false);
      setRequiresAccountUpgrade(false);
      try {
        if (!isAccountServiceConfigured) {
          if (process.env.NODE_ENV !== 'production') {
            if (!cancelled) {
              setHasPermanentSession(false);
              setRequiredConsentsComplete(false);
              setAccountProfile(null);
            }
            return;
          }

          throw new Error(
            'Account service is not configured.\n\nCheck that EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy EXPO_PUBLIC_SUPABASE_ANON_KEY) are set correctly in your environment.'
          );
        }

        // VerificationProvider owns the single startup session restoration.
        // Entry consumes that resolved session instead of mounting another
        // Supabase getSession() call on the mobile critical path.
        const user = session?.user;

        if (!user) {
          if (!cancelled) {
            setHasPermanentSession(false);
            setRequiredConsentsComplete(false);
            setAccountProfile(null);
          }
          return;
        }

        if (user.is_anonymous) {
          if (!cancelled) {
            setHasPermanentSession(false);
            setRequiresAccountUpgrade(true);
            setRequiredConsentsComplete(false);
            setAccountProfile(null);
            router.replace('/(auth)/signup');
          }
          return;
        }

        setHasPermanentSession(true);

        // A signed-in web visitor should see the front door before profile,
        // consent, and founder routing modules compete for mobile startup time.
        // The exact same bootstrap resumes as soon as the person enters.
        if (Platform.OS === 'web' && !splashEntered) {
          profileDeferred = true;
          return;
        }

        const [profileModule, bootstrapModule] = await Promise.all([
          import('@/features/identity/accountProfile'),
          import('@/services/auth/postAuthBootstrap'),
        ]);
        const profile = await profileModule.hydrateAccountProfile(buildSide);
        const result = await bootstrapModule.fetchPostAuthBootstrap(profile?.accountSide ?? buildSide, profile);
        if (cancelled) return;
        setRequiredConsentsComplete(result.requiredConsentsComplete);
        setAccountProfile(result.profile);
        if (profile?.accountSide && profile.accountSide !== userSide) {
          setUserSide(profile.accountSide);
        } else if (result.accountSide !== userSide) {
          setUserSide(result.accountSide);
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(error instanceof Error ? error.message : 'Unable to load your Bip profile.');
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
          if (!profileDeferred) setProfileResolved(true);
        }
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, [
    bootstrapAttempt,
    buildSide,
    isAuthResolved,
    session,
    setUserSide,
    splashEntered,
    userSide,
  ]);

  useEffect(() => {
    if (
      isLoading
      || isVerificationLoading
      || !authChecked
      || !profileResolved
      || !splashEntered
      || routed
      || bootstrapError
    ) return;

    let active = true;
    setRouted(true);

    async function route() {
      if (!hasPermanentSession) {
        if (requiresAccountUpgrade) {
          router.replace(`/(auth)/signup?side=${publicEntrySide}` as never);
        } else {
          router.replace(publicEntrySide === 'parent' ? '/(onboarding)/parent-splash' : '/(onboarding)/welcome');
        }
        return;
      }

      if (!requiredConsentsComplete) {
        router.replace(`/(onboarding)/consent?side=${effectiveSide}` as never);
        return;
      }

      if (!accountProfile?.onboardingComplete) {
        router.replace(
          effectiveSide === 'parent'
            ? '/(onboarding)/parent-setup'
            : '/(onboarding)/name',
        );
        return;
      }

      try {
        const founderProfile = await getCurrentFounderProfile();
        if (active && isFounderProfile(founderProfile)) {
          router.replace('/(dev)/control-room' as never);
          return;
        }
      } catch (error) {
        // Founder-status lookup is a routing convenience only; any failure
        // (including a signed-in account with no app_profiles row yet)
        // falls through to the ordinary teen/parent front door below.
        console.warn('Founder-status lookup failed during front-door routing', error);
      }
      if (!active) return;

      if (accountProfile.accountSide === 'parent') {
        try {
          const parentEntry = await resolveParentEntryState();
          if (active) router.replace(routeForParentEntryState(parentEntry) as never);
        } catch (error) {
          if (active) {
            setBootstrapError(error instanceof Error ? error.message : 'Unable to verify Parent Side access.');
          }
        }
        return;
      }

      router.replace(
        verificationState === 'VERIFIED_TEEN'
          ? '/(teen)/room'
          : '/(auth)/limited-mode',
      );
    }

    void route();
    return () => {
      active = false;
    };
  }, [
    accountProfile,
    authChecked,
    bootstrapError,
    effectiveSide,
    hasPermanentSession,
    isLoading,
    isVerificationLoading,
    profileResolved,
    publicEntrySide,
    requiredConsentsComplete,
    requiresAccountUpgrade,
    routed,
    splashEntered,
    verificationState,
  ]);

  // This watched entrypoint intentionally participates in the exact-head release gate.
  if (Platform.OS === 'web' && !splashEntered) {
    return (
      <FrontDoorSceneArrival>
        <WebWelcomeScreen
          variant={publicWelcomeSide}
          showSignIn={canOfferSignIn}
          onEnter={(side) => {
            setRouted(false);
            setSelectedEntrySide(side);
            setUserSide(side);
            setSplashEntered(true);
          }}
        />
      </FrontDoorSceneArrival>
    );
  }

  if (bootstrapError) {
    return (
      <View style={styles.root}>
        <Text style={styles.errorTitle}>We could not restore your Bip profile.</Text>
        <Text style={styles.errorBody}>{bootstrapError}</Text>
        <TouchableOpacity
          style={styles.retry}
          onPress={() => {
            setRouted(false);
            setBootstrapAttempt(value => value + 1);
          }}
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (
    Platform.OS !== 'web'
    && !isLoading
    && !isVerificationLoading
    && authChecked
    && profileResolved
    && !splashEntered
  ) {
    return (
      <SplashScreen
        userSide={hasPermanentSession ? effectiveSide : buildSide ?? 'teen'}
        setScreen={() => setSplashEntered(true)}
      />
    );
  }

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Opening Se'kret Bip"
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator color="#c4b5fd" />
      <Text style={styles.loadingText}>Opening your Se’kret Bip space…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090711', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { color: '#b9afc5', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12 },
  errorTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  errorBody: { color: '#b9afc5', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  retry: { minWidth: 160, height: 52, borderRadius: 16, backgroundColor: '#6d28d9', alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});