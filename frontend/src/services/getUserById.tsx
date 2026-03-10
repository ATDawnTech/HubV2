import { supabase } from '@/integrations/supabase/client';

export const getUserById = async (id: string) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) {
    throw error;
  }
  return data;
};
