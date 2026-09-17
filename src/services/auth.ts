import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AuthState, AuthStatus } from '@/types/auth';

export const GUEST_AUTH_STATUS: AuthStatus = {
  authState: 'guest', user: null, isLoading: false, isAuthenticated: false, authError: null,
};

export const LOADING_AUTH_STATUS: AuthStatus = {
  authState: 'loading', user: null, isLoading: true, isAuthenticated: false, authError: null,
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Unable to restore the authentication session.';
}

function actionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}

function statusFromSession(session: Session | null, authError: string | null = null): AuthStatus {
  const user: User | null = session?.user ?? null;
  const authState: AuthState = user ? 'authenticated' : 'guest';
  return { authState, user, isLoading: false, isAuthenticated: !!user, authError };
}

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return statusFromSession(null, errorMessage(error));
    return statusFromSession(data.session);
  } catch (error) {
    return statusFromSession(null, errorMessage(error));
  }
}

export interface AuthActionResult {
  ok: boolean;
  status: AuthStatus;
  error: string | null;
  confirmationRequired?: boolean;
  message?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeCredentials(email: string, password: string): { email: string; password: string } | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail) || password.length === 0) return null;
  return { email: normalizedEmail, password };
}

export async function signUp(email: string, password: string): Promise<AuthActionResult> {
  const credentials = normalizeCredentials(email, password);
  if (!credentials) return { ok: false, status: await getAuthStatus(), error: 'Enter a valid email address and password.' };

  try {
    const { data, error } = await supabase.auth.signUp(credentials);
    if (error) return { ok: false, status: await getAuthStatus(), error: actionErrorMessage(error, 'Unable to create the account.') };

    const status = statusFromSession(data.session);
    if (data.session?.user) return { ok: true, status, error: null, message: 'Account created successfully.' };
    return {
      ok: true,
      status,
      error: null,
      confirmationRequired: true,
      message: 'Account created. Check your email to confirm your account, then sign in.',
    };
  } catch (error) {
    return { ok: false, status: await getAuthStatus(), error: actionErrorMessage(error, 'Unable to create the account.') };
  }
}

export async function signIn(email: string, password: string): Promise<AuthActionResult> {
  const credentials = normalizeCredentials(email, password);
  if (!credentials) return { ok: false, status: await getAuthStatus(), error: 'Enter a valid email address and password.' };

  try {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) return { ok: false, status: await getAuthStatus(), error: actionErrorMessage(error, 'Unable to sign in.') };
    const status = statusFromSession(data.session);
    if (!data.session?.user) return { ok: false, status, error: 'Sign in did not return an active session.' };
    return { ok: true, status, error: null, message: 'Signed in successfully.' };
  } catch (error) {
    return { ok: false, status: await getAuthStatus(), error: actionErrorMessage(error, 'Unable to sign in.') };
  }
}

export async function requestPasswordReset(email: string): Promise<AuthActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return { ok: false, status: await getAuthStatus(), error: 'Enter a valid email address.' };

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    if (error) return { ok: false, status: await getAuthStatus(), error: 'Unable to request a password reset right now.' };
    return {
      ok: true,
      status: await getAuthStatus(),
      error: null,
      message: 'If an account uses this email, you will receive password reset instructions.',
    };
  } catch {
    return { ok: false, status: await getAuthStatus(), error: 'Unable to request a password reset right now.' };
  }
}

export async function refreshAuthSession(): Promise<AuthStatus> {
  return getAuthStatus();
}

export function subscribeToAuthState(listener: (status: AuthStatus) => void): () => void {
  let active = true;
  let revision = 0;
  const emit = (session: Session | null, authError: string | null = null) => {
    if (!active) return;
    revision += 1;
    listener(statusFromSession(session, authError));
  };

  const subscription = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    if (!active) return;
    void event;
    emit(session);
  });

  const initialRevision = revision;
  void supabase.auth.getSession().then(({ data, error }) => {
    if (!active || revision !== initialRevision) return;
    emit(error ? null : data.session, error ? errorMessage(error) : null);
  }).catch((error) => {
    if (!active || revision !== initialRevision) return;
    emit(null, errorMessage(error));
  });

  return () => {
    active = false;
    subscription.data.subscription.unsubscribe();
  };
}

export async function signOut(): Promise<AuthStatus> {
  try {
    const { error } = await supabase.auth.signOut();
    if (!error) return GUEST_AUTH_STATUS;
    const current = await getAuthStatus();
    return { ...current, authError: errorMessage(error) };
  } catch (error) {
    const current = await getAuthStatus();
    return { ...current, authError: errorMessage(error) };
  }
}
