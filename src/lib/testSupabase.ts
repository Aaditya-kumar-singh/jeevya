import { supabase } from './supabase';

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name')
    .limit(1);

  return { data, error };
}
