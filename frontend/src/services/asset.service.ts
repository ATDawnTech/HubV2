import { z } from "zod";
import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type { Asset, AssetCategory } from "@/features/assets/types";
import { assetSchema, assetCategorySchema } from "@/features/assets/schemas";

export interface AssetsPage {
  items: Asset[];
  meta: PaginationMeta;
}

export interface CategoriesPage {
  items: AssetCategory[];
  meta: PaginationMeta;
}

export const assetService = {
  async listAssets(params: { cursor?: string | undefined; limit?: number | undefined } = {}): Promise<AssetsPage> {
    const res = await apiClient.get<ApiResponse<Asset[]>>("/v1/assets/", {
      params,
    });
    return {
      items: z.array(assetSchema).parse(res.data.data ?? []),
      meta: res.data.meta!,
    };
  },

  async listCategories(params: { cursor?: string | undefined; limit?: number | undefined } = {}): Promise<CategoriesPage> {
    const res = await apiClient.get<ApiResponse<AssetCategory[]>>("/v1/asset-categories/", {
      params,
    });
    return {
      items: z.array(assetCategorySchema).parse(res.data.data ?? []),
      meta: res.data.meta!,
    };
  },

  async deleteAsset(id: string): Promise<void> {
    await apiClient.delete(`/v1/assets/${id}`);
  },

  async createAsset(data: any): Promise<Asset> {
    const res = await apiClient.post<ApiResponse<Asset>>("/v1/assets/", data);
    return assetSchema.parse(res.data.data);
  },

  async updateAsset(id: string, data: any): Promise<Asset> {
    const res = await apiClient.patch<ApiResponse<Asset>>(`/v1/assets/${id}`, data);
    return assetSchema.parse(res.data.data);
  },

  async getNextAssetTag(location: string, categoryId: string): Promise<string> {
    const res = await apiClient.get<{ data: { asset_tag: string } }>("/v1/assets/next-tag", {
      params: { location, category_id: categoryId },
    });
    return res.data.data.asset_tag;
  },

  async createCategory(data: { name: string; code: string; description?: string | undefined }): Promise<AssetCategory> {
    const res = await apiClient.post<ApiResponse<AssetCategory>>("/v1/asset-categories/", data);
    return assetCategorySchema.parse(res.data.data);
  },

  async updateCategory(id: string, data: { name?: string; code?: string; description?: string | undefined }): Promise<AssetCategory> {
    const res = await apiClient.patch<ApiResponse<AssetCategory>>(`/v1/asset-categories/${id}`, data);
    return assetCategorySchema.parse(res.data.data);
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/v1/asset-categories/${id}`);
  },
};
