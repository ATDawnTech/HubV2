import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { assetService } from "@/services/asset.service";
import { queryKey } from "@/lib/queryKey";
import { toast } from "sonner";

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetService.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.getAssets] });
      toast.success("Asset deleted successfully");
    },
    onError: (error) => {
      console.error("Delete asset error:", error);
      toast.error("Failed to delete asset");
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => assetService.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.getAssets] });
      toast.success("Asset created successfully");
    },
    onError: (error) => {
      console.error("Create asset error:", error);
      toast.error("Failed to create asset");
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetService.updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.getAssets] });
      toast.success("Asset updated successfully");
    },
    onError: (error) => {
      console.error("Update asset error:", error);
      toast.error("Failed to update asset");
    },
  });
}

export function useAssets(limit = 20) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const params = { cursor, limit };

  const query = useQuery({
    queryKey: [queryKey.getAssets, params],
    queryFn: () => assetService.listAssets(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  function goToNextPage(): void {
    const next = query.data?.meta.next_cursor;
    if (next) setCursor(next);
  }

  function goToPrevPage(): void {
    setCursor(undefined); // Simple forward-only cursor for now
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
