import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import { useCapabilities } from '@/hooks/useCapabilities';
import {
  ACCOUNT_SIGN_IN_ROUTE,
  ACCOUNT_SIGN_UP_ROUTE,
  buildAccountAuthRoute,
  createAccountGateState,
  getAccountGateDecision,
  isSafeReturnPath,
} from '@/services/accountGate';
import type { AccountGateRequest, AccountGateState } from '@/services/accountGate';

export type { AccountGateDecision, AccountGateRequest, AccountGateState } from '@/services/accountGate';
export {
  ACCOUNT_SIGN_IN_ROUTE,
  ACCOUNT_SIGN_UP_ROUTE,
  buildAccountAuthRoute,
  createAccountGateState,
  getAccountGateDecision,
  isSafeReturnPath,
} from '@/services/accountGate';

const CLOSED_GATE: AccountGateState = {
  visible: false,
  feature: '',
  title: '',
  explanation: '',
};

export function useAccountGate() {
  const { authState, checkAccess } = useCapabilities();
  const [gate, setGate] = useState<AccountGateState>(CLOSED_GATE);

  const dismiss = useCallback(() => setGate(CLOSED_GATE), []);

  const attempt = useCallback(
    (feature: string, action: () => void | Promise<void>, request?: Partial<Omit<AccountGateRequest, 'feature'>>): boolean => {
      const access = checkAccess(feature);
      const decision = getAccountGateDecision(feature, authState);
      if (decision === 'wait' || !access.accessLevel) return false;
      if (decision === 'allow') {
        try {
          void Promise.resolve(action()).catch(() => undefined);
        } catch {
          // Action failures leave the existing auth and guest state unchanged.
        }
        return true;
      }
      if (decision === 'gate') {
        setGate(createAccountGateState({
          feature,
          title: request?.title ?? 'Account required',
          explanation: request?.explanation ?? 'Create a free Jeevya account to use this feature.',
        }));
      }
      return false;
    },
    [authState, checkAccess],
  );

  const signIn = useCallback((returnTo?: string) => {
    setGate(CLOSED_GATE);
    try {
      router.push(buildAccountAuthRoute(ACCOUNT_SIGN_IN_ROUTE, isSafeReturnPath(returnTo) ? returnTo : undefined) as never);
    } catch {
      // Navigation failures leave the user in the existing guest state.
    }
  }, []);

  const createAccount = useCallback((returnTo?: string) => {
    setGate(CLOSED_GATE);
    try {
      router.push(buildAccountAuthRoute(ACCOUNT_SIGN_UP_ROUTE, isSafeReturnPath(returnTo) ? returnTo : undefined) as never);
    } catch {
      // Navigation failures leave the user in the existing guest state.
    }
  }, []);

  return {
    authState,
    gate,
    attempt,
    dismiss,
    signIn,
    createAccount,
  };
}
