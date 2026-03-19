import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api.types";

export interface SyncStatus {
  synced_at?: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  next_run_at?: string | null;
}

export const entraSyncService = {
  async triggerSync(): Promise<SyncStatus> {
    const res = await apiClient.post<ApiResponse<SyncStatus>>("/v1/admin/entra/sync");
    return res.data.data!;
  },

  async getSyncStatus(): Promise<SyncStatus | null> {
    const res = await apiClient.get<ApiResponse<SyncStatus | null>>("/v1/admin/entra/sync/status");
    return res.data.data ?? null;
  },
};
