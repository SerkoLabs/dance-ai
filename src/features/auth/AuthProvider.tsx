import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useSupabase } from '@/lib/supabase/context';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  errorMessage: string | null;
  retryBootstrap: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const previousUserId = useRef<string | null>(null);

  const applySession = useCallback(
    (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (previousUserId.current !== null && previousUserId.current !== nextUserId) {
        queryClient.clear();
      }
      previousUserId.current = nextUserId;
      setSession(nextSession);
      setErrorMessage(null);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
    },
    [queryClient],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setStatus('loading');
      setErrorMessage(null);

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setSession(null);
        setStatus('error');
        setErrorMessage('Oturum bilgisi okunamadı. Bağlantını kontrol edip tekrar deneyebilirsin.');
        return;
      }

      if (!data.session) {
        applySession(null);
        return;
      }

      const { error: claimsError } = await supabase.auth.getClaims();
      if (!active) return;

      if (claimsError) {
        setSession(null);
        setStatus('error');
        setErrorMessage('Oturum doğrulanamadı. Tekrar dene veya yeniden giriş yap.');
        return;
      }

      applySession(data.session);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      applySession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession, bootstrapAttempt, supabase]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    previousUserId.current = null;
    queryClient.clear();
    applySession(null);
  }, [applySession, queryClient, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      errorMessage,
      retryBootstrap: () => setBootstrapAttempt((attempt) => attempt + 1),
      signOut,
    }),
    [errorMessage, session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing.');
  return value;
}
