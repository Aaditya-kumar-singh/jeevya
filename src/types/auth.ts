import type { User } from '@supabase/supabase-js';

export type AuthState = 'loading' | 'guest' | 'authenticated';

export interface AuthStatus {
  authState: AuthState;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
}
