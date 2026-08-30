import { type Session, type User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { isBackendConfigured, requireSupabase, supabase } from '@/data/supabase/client';
import { type DevelopmentAuthAdapter } from '@/features/boot/development-preview-adapter';
import { type AuthFlowState } from '@/features/boot/resolve-initial-route';
import { extractAuthCallbackParameters, isTrustedAuthCallbackUrl } from './auth-callback';

export type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'unconfigured' | 'error';
export type AuthContinuationRoute = '/' | '/(app)/today';

type AuthContextValue = {
  authFlow: AuthFlowState;
  deleteAccount(): Promise<void>;
  developmentPreview: boolean;
  refreshSession(): Promise<AuthContinuationRoute | null>;
  requestPasswordReset(email: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
  session: Session | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  signUp(email: string, password: string, fullName: string): Promise<void>;
  status: AuthStatus;
  updatePassword(password: string): Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const authRedirectUrl = Linking.createURL('auth/callback');
const passwordResetRedirectUrl = Linking.createURL('auth/reset-password');
const trustedAuthRedirectUrls = [authRedirectUrl, passwordResetRedirectUrl];

type AuthProviderProps = PropsWithChildren<{
  developmentAdapter: DevelopmentAuthAdapter;
}>;

async function consumeAuthUrl(url: string): Promise<void> {
  const client = requireSupabase();
  const { code } = extractAuthCallbackParameters(url);

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}

export function AuthProvider({ children, developmentAdapter }: AuthProviderProps) {
  const [authFlow, setAuthFlow] = useState<AuthFlowState>('standard');
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    isBackendConfigured ? 'loading' : 'unconfigured',
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let mounted = true;

    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setSession(null);
        setStatus('error');
        return;
      }
      setSession(data.session);
      setStatus(data.session ? 'authenticated' : 'guest');
    });

    const { data: authSubscription } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setAuthFlow('passwordRecovery');
      if (event === 'SIGNED_OUT') setAuthFlow('standard');
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'guest');
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (isTrustedAuthCallbackUrl(url, trustedAuthRedirectUrls)) {
        void consumeAuthUrl(url).catch(() => {
          setSession(null);
          setStatus('error');
        });
      }
    });

    void Linking.getInitialURL().then((url) => {
      if (url && isTrustedAuthCallbackUrl(url, trustedAuthRedirectUrls)) {
        void consumeAuthUrl(url).catch(() => {
          if (!mounted) return;
          setSession(null);
          setStatus('error');
        });
      }
    });

    return () => {
      mounted = false;
      authSubscription.subscription.unsubscribe();
      appStateSubscription.remove();
      linkingSubscription.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authFlow,
      async deleteAccount() {
        const client = requireSupabase();
        const { error } = await client.functions.invoke('delete-account');
        if (error) throw error;
        await client.auth.signOut({ scope: 'local' });
      },
      developmentPreview: developmentAdapter.enabled,
      async refreshSession() {
        if (developmentAdapter.handle('refreshSession')) {
          return developmentAdapter.continuationAfter('refreshSession');
        }
        const { data, error } = await requireSupabase().auth.getSession();
        if (error) throw error;
        setSession(data.session);
        setStatus(data.session ? 'authenticated' : 'guest');
        return data.session?.user.email_confirmed_at ? '/' : null;
      },
      async requestPasswordReset(email) {
        const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: passwordResetRedirectUrl,
        });
        if (error) throw error;
      },
      async resendVerification(email) {
        if (developmentAdapter.handle('resendVerification')) return;
        const { error } = await requireSupabase().auth.resend({
          email,
          options: { emailRedirectTo: authRedirectUrl },
          type: 'signup',
        });
        if (error) throw error;
      },
      session,
      async signIn(email, password) {
        const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthFlow('standard');
      },
      async signOut() {
        const { error } = await requireSupabase().auth.signOut();
        if (error) throw error;
      },
      async signUp(email, password, fullName) {
        if (developmentAdapter.handle('signUp')) {
          setAuthFlow('standard');
          return;
        }
        const { error } = await requireSupabase().auth.signUp({
          email,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: authRedirectUrl,
          },
          password,
        });
        if (error) throw error;
        setAuthFlow('standard');
      },
      status,
      async updatePassword(password) {
        const { error } = await requireSupabase().auth.updateUser({ password });
        if (error) throw error;
        setAuthFlow('standard');
      },
      user: session?.user ?? null,
    }),
    [authFlow, developmentAdapter, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
