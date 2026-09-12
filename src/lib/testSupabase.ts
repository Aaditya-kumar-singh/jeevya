import { supabase } from './supabase';

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name')
    .limit(1);

  console.log('Supabase exercises:', data);
  console.log('Supabase error:', error);

  return { data, error };
}
