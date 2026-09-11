import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ParentLinkState, VerificationSnapshot, VerificationState } from '@/types/verification';
import { INITIAL_VERIFICATION_SNAPSHOT } from '@/services/verificationState';
import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';

type Row = {
  verification_state: string;
  parent_link_state: string;
  verification_reason: string | null;
  verification_updated_at: string;
};

type Value = {
  verificationSnapshot: VerificationSnapshot;
  verificationState: VerificationState;
  isVerificationLoading: boolean;
  verificationError: string | null;
  isAuthResolved: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  refreshVerification: () => Promise<void>;
};

const Context = createContext<Value | null>(null);

const states = new Set<VerificationState>([
  'UNVERIFIED',
  'PENDING_PARENT',
  'PENDING_TRUSTED_ADULT',
  'LIMITED_MODE',
  'VERIFIED_TEEN',
  'EXPIRED',
  'MANUAL_REVIEW',
  'SUSPENDED',
  'VERIFIED_GUARDIAN',
  'PENDING_GUARDIAN_REVIEW',
  'GUARDIAN_REJECTED',
  'GUARDIAN_SUSPENDED',
]);
const linkStates = new Set<ParentLinkState>(['none','pending','active','expired','revoked','declined']);

function mapRow(row: Row): VerificationSnapshot {
  return {
    state: states.has(row.verification_state as VerificationState)
      ? row.verification_state as VerificationState
      : 'UNVERIFIED',
    parentLinkState: linkStates.has(row.parent_link_state as ParentLinkState)
      ? row.parent_link_state as ParentLinkState
      : 'none',
    updatedAt: row.verification_updated_at,
    reason: row.verification_reason ?? undefined,
  };
}

export function VerificationProvider({ children }: { children: ReactNode }) {
  const [verificationSnapshot, setSnapshot] = useState<VerificationSnapshot>(INITIAL_VERIFICATION_SNAPSHOT);
  const [isVerificationLoading, setLoading] = useState(isSupabaseConfigured);
  const [verificationError, setError] = useState<string | null>(null);
  const [isAuthResolved, setAuthResolved] = useState(!isSupabaseConfigured);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [authSession, setSession] = useState<Session | null>(null);

  const loadVerificationForSession = useCallback(async (session: Session | null) => {
    const permanentSession = Boolean(session && !session.user.is_anonymous);
    const userId = permanentSession ? session?.user.id : undefined;

    setSession(session);
    setAuthenticated(permanentSession);
    setAuthResolved(true);

    if (!userId) {
      setSnapshot(INITIAL_VERIFICATION_SNAPSHOT);
      setError(null);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setSnapshot(INITIAL_VERIFICATION_SNAPSHOT);
      return;
    }

    const { data, error } = await supabase
      .from('account_verification')
      .select('verification_state,parent_link_state,verification_reason,verification_updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;

    // Missing or malformed server data must fail closed. The local default is
    // only a locked fallback and is never treated as proof of verification.
    if (!data) {
      setSnapshot(INITIAL_VERIFICATION_SNAPSHOT);
      setError('Verification record unavailable.');
      return;
    }
    setSnapshot(mapRow(data as Row));
  }, []);

  const refreshVerification = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setSession(null);
      setSnapshot(INITIAL_VERIFICATION_SNAPSHOT);
      setAuthenticated(false);
      setAuthResolved(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Session restoration lives here so entry screens can consume one
      // resolved auth truth instead of each mounting their own getSession().
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      await loadVerificationForSession(sessionData.session);
    } catch (error) {
      setSession(null);
      setAuthenticated(false);
      setAuthResolved(true);
      setSnapshot(INITIAL_VERIFICATION_SNAPSHOT);
      setError(error instanceof Error ? error.message : 'Unable to load verification.');
    } finally {
      setLoading(false);
    }
  }, [loadVerificationForSession]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setSession(null);
      setAuthResolved(true);
      setLoading(false);
      return;
    }

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const removeVerificationChannel = () => {
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    };

    const subscribeToVerificationSignal = (userId: string) => {
      removeVerificationChannel();
      channel = supabase
        .channel(`account-verification-context-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'account_verification',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void refreshVerification();
          },
        )
        .subscribe();
    };

    // One explicit initial session read hydrates both auth truth and
    // verification state. The INITIAL_SESSION event below only attaches the
    // realtime witness and never performs a second startup getSession().
    void refreshVerification();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      const user = session?.user;
      const permanentSession = Boolean(session && !session.user.is_anonymous);
      setSession(session);
      setAuthResolved(true);
      setAuthenticated(permanentSession);
      removeVerificationChannel();

      if (!permanentSession) {
        setSnapshot(INITIAL_VERIFICATION_SNAPSHOT);
        setError(null);
        setLoading(false);
        return;
      }

      if (user) subscribeToVerificationSignal(user.id);
      if (event === 'INITIAL_SESSION') return;

      setLoading(true);
      setError(null);
      void loadVerificationForSession(session)
        .catch((error) => {
          if (!active) return;
          setSession(null);
          setAuthenticated(false);
          setSnapshot(INITIAL_VERIFICATION_SNAPSHOT);
          setError(error instanceof Error ? error.message : 'Unable to load verification.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
      removeVerificationChannel();
      subscription.unsubscribe();
    };
  }, [loadVerificationForSession, refreshVerification]);

  const value = useMemo<Value>(() => ({
    verificationSnapshot,
    verificationState: verificationSnapshot.state,
    isVerificationLoading,
    verificationError,
    isAuthResolved,
    isAuthenticated,
    session: authSession,
    refreshVerification,
  }), [
    verificationSnapshot,
    isVerificationLoading,
    verificationError,
    isAuthResolved,
    isAuthenticated,
    authSession,
    refreshVerification,
  ]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useVerificationContext(): Value {
  const value = useContext(Context);
  if (!value) throw new Error('useVerificationContext must be used inside VerificationProvider');
  return value;
}