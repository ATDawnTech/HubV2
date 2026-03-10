import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AuditLogQuery {
  table_name: string;
  record_id: string;
}

export const useGetAuditLogs = ({ query }: { query: AuditLogQuery }) => {
  return useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .match(query)
        .order("created_at", { ascending: false });
      if (error) {
        alert(error.message);
      }
      return data;
    },
  });
};
