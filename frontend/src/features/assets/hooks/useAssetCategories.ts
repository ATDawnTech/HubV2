import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { assetService } from "@/services/asset.service";
import { queryKey } from "@/lib/queryKey";
import { toast } from "sonner";

export function useAssetCategories(limit = 20) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const params = { cursor, limit };

  const query = useQuery({
    queryKey: [queryKey.getAssetCategories, params],
    queryFn: () => assetService.listCategories(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  function goToNextPage(): void {
    const next = query.data?.meta.next_cursor;
    if (next) setCursor(next);
  }

  function goToPrevPage(): void {
    setCursor(undefined);
  }

  function resetPage(): void {
    setCursor(undefined);
  }

  return {
    ...query,
    goToNextPage,
    goToPrevPage,
    resetPage,
    hasNextPage: Boolean(query.data?.meta.next_cursor),
    hasPrevPage: Boolean(cursor),
  };
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string | undefined }) =>
      assetService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.getAssetCategories] });
      toast.success("Category created successfully");
    },
    onError: () => {
      toast.error("Failed to create category");
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string; description?: string | undefined } }) =>
      assetService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.getAssetCategories] });
      toast.success("Category updated successfully");
    },
    onError: () => {
      toast.error("Failed to update category");
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.getAssetCategories] });
      toast.success("Category deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete category");
    },
  });
}
