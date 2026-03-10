import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useGetProfiles = () => {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").eq("is_active", true);

      const { data, error } = await query.order("full_name");
      if (error) {
        throw error;
      }
      return data;
    },
  });
};

export const useGetProfileById = (id: string) => {
  return useQuery({
    queryKey: ["profiles", id],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").eq("id", id).single();
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!id,
  });
};
