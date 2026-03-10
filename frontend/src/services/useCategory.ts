import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "./config";

interface NewCategory {
    name: string;
    description?: string;
    code?: string;
}

export const useCreateCategory = () => {
    return useMutation({
        mutationFn: async (newCategory: NewCategory) => {
            const { data, error } = await supabase
                .from("asset_categories")
                .insert(newCategory)
                .select()
                .single();
            if (error) {
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["asset_categories"] });
        },
    });
};

export const useGetCategories = () => {
    return useQuery({
        queryKey: ["asset_categories"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("asset_categories")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) {
                throw error;
            }
            return data;
        },
    });
};

export const useUpdateCategory = () => {
    return useMutation({
        mutationFn: async ({ id, updatedCategory }: { id: string; updatedCategory: Partial<NewCategory> }) => {
            const { data, error } = await supabase
                .from("asset_categories")
                .update(updatedCategory)
                .eq("id", id)
                .select()
                .single();

            if (error) {
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["asset_categories"] });
        },
    });
};

export const useDeleteCategory = () => {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("asset_categories")
                .delete()
                .eq("id", id);
            if (error) {
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["asset_categories"] });
        },
    });
};
