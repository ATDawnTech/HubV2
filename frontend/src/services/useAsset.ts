import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "./config";

interface NewAsset {
  category: string;
  model: string;
  asset_tag: string;
  procurement_date: string;
  vendor?: string;
  warranty_start_date: string;
  warranty_end_date: string;
  location: string;
  assigned_to: string | null;
  status: string;
  notes?: string;
  attachments?: string[];
}

export const useCreateNewAsset = () => {
  return useMutation({
    mutationFn: async (newAsset: NewAsset) => {
      const { data, error } = await supabase
        .from("assets")
        .insert(newAsset)
        .select()
        .single();
      if (error) {
        alert(error.message);
      }
      const user = await supabase.auth.getSession();
      const audit = {
        table_name: "assets",
        action: "CREATE",
        record_id: data?.id,
        new_value: JSON.stringify(newAsset),
        record_updated_at: data?.updated_at,
        created_by: user.data.session.user.id,
      };
      await supabase.from("audit_logs").insert(audit);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
};

export const useUpdateAsset = () => {
  return useMutation({
    mutationFn: async ({
      id,
      updatedAsset,
    }: {
      id: string;
      updatedAsset: Partial<NewAsset>;
    }) => {
      console.log("Updating asset with id:", id, "with data:", updatedAsset);
      const { data: currentAsset } = await supabase
        .from("assets")
        .select("*")
        .eq("id", id)
        .single();
      const { data, error } = await supabase
        .from("assets")
        .update(updatedAsset)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        alert(error.message);
        return;
      }
      const user = await supabase.auth.getSession();
      const audit = {
        table_name: "assets",
        action: "UPDATE",
        record_id: data?.id,
        new_value: JSON.stringify(updatedAsset),
        old_value: JSON.stringify(currentAsset),
        record_updated_at: data?.updated_at,
        created_by: user.data.session.user.id,
      };
      await supabase.from("audit_logs").insert(audit);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
};

export const useDeleteAsset = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: currentAsset } = await supabase
        .from("assets")
        .select("*")
        .eq("id", id)
        .single();
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) {
        throw error;
      }
      const user = await supabase.auth.getSession();
      const audit = {
        table_name: "assets",
        action: "DELETE",
        record_id: id,
        old_value: JSON.stringify(currentAsset),
        created_by: user.data.session.user?.id,
      };
      await supabase.from("audit_logs").insert(audit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
};
