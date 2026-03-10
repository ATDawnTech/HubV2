import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export const createNewProfile = async (profile: Database['public']['Tables']['profiles']['Row']) => {
    const { data, error } = await supabase.from('profiles').insert([profile]);
    if (error) throw error;
    return data;
}