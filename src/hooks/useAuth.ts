import { useCallback, useEffect, useState } from 'react';
import { refreshAuthSession, requestPasswordReset, signIn, signOut, signUp, subscribeToAuthState } from '@/services/auth';
import type { AuthStatus } from '@/types/auth';

const INITIAL_STATUS: AuthStatus = {
  authState: 'loading',
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authError: null,
};

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(INITIAL_STATUS);

  const refreshSession = useCallback(async () => {
    const next = await refreshAuthSession();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuthState((next) => {
      if (active) setStatus(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const runAction = useCallback(async (action: () => Promise<import('@/services/auth').AuthActionResult>) => {
    const result = await action();
    setStatus(result.status);
    return result;
  }, []);

  const createAccount = useCallback((email: string, password: string) => runAction(() => signUp(email, password)), [runAction]);
  const authenticate = useCallback((email: string, password: string) => runAction(() => signIn(email, password)), [runAction]);
  const endSession = useCallback(async () => {
    const next = await signOut();
    setStatus(next);
    return next;
  }, []);
  const resetPassword = useCallback((email: string) => runAction(() => requestPasswordReset(email)), [runAction]);

  return {
    authState: status.authState,
    user: status.user,
    isLoading: status.isLoading,
    isAuthenticated: status.isAuthenticated,
    authError: status.authError,
    refreshSession,
    signUp: createAccount,
    signIn: authenticate,
    signOut: endSession,
    requestPasswordReset: resetPassword,
  };
}
