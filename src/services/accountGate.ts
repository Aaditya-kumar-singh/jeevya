import { checkAccess } from '@/services/capabilities';
import type { AuthState } from '@/types/auth';

export const ACCOUNT_SIGN_IN_ROUTE = '/auth/sign-in';
export const ACCOUNT_SIGN_UP_ROUTE = '/auth/sign-up';

export interface AccountGateRequest {
  feature: string;
  title: string;
  explanation: string;
}

export interface AccountGateState extends AccountGateRequest {
  visible: boolean;
}

export type AccountGateDecision = 'allow' | 'gate' | 'wait' | 'deny';

export function buildAccountAuthRoute(
  path: typeof ACCOUNT_SIGN_IN_ROUTE | typeof ACCOUNT_SIGN_UP_ROUTE,
  returnTo?: string,
): string {
  if (!returnTo) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function isSafeReturnPath(value: string | undefined): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/auth/');
}

export function createAccountGateState(request: AccountGateRequest): AccountGateState {
  return { visible: true, ...request };
}

export function getAccountGateDecision(feature: string, authState: AuthState): AccountGateDecision {
  const access = checkAccess(feature, authState);
  if (authState === 'loading') return 'wait';
  if (access.allowed) return 'allow';
  if (access.requiresAuthentication && authState === 'guest') return 'gate';
  return 'deny';
}

export function isAccountCapability(feature: string): boolean {
  return checkAccess(feature, 'guest').accessLevel === 'account';
}
