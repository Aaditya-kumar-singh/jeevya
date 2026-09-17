import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const configuredSupabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabaseUrl = configuredSupabaseUrl || 'http://127.0.0.1:54321';
const supabaseKey = configuredSupabaseKey || 'offline-placeholder-anon-key';

if (!configuredSupabaseUrl || !configuredSupabaseKey) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY. Online sync remains unavailable until Supabase is configured.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
