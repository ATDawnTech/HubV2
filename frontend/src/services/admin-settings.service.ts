import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type {
  CreateDropdownInput,
  DropdownOption,
  ReassignEmployeesInput,
  UpdateDropdownInput,
} from "@/features/admin-settings/types/admin-settings.types";

export interface DropdownsPage {
  options: DropdownOption[];
  meta: PaginationMeta;
}

export const adminSettingsService = {
  /** Lightweight options list — used by consumer forms (employee create/edit). */
  async getOptions(module: string, category?: string): Promise<DropdownOption[]> {
    const params: Record<string, string> = { module };
    if (category) params.category = category;
    const res = await apiClient.get<ApiResponse<DropdownOption[]>>(
      "/v1/admin/dropdowns/options",
      { params },
    );
    return res.data.data ?? [];
  },

  /** Paginated list for admin management UI. */
  async listDropdowns(params: {
    module?: string;
    category?: string;
    active_only?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<DropdownsPage> {
    const res = await apiClient.get<ApiResponse<DropdownOption[]>>(
      "/v1/admin/dropdowns",
      { params },
    );
    return {
      options: res.data.data ?? [],
      meta: res.data.meta!,
    };
  },

  async createDropdown(input: CreateDropdownInput): Promise<DropdownOption> {
    const res = await apiClient.post<ApiResponse<DropdownOption>>(
      "/v1/admin/dropdowns",
      input,
    );
    return res.data.data!;
  },

  async updateDropdown(id: string, input: UpdateDropdownInput): Promise<DropdownOption> {
    const res = await apiClient.patch<ApiResponse<DropdownOption>>(
      `/v1/admin/dropdowns/${id}`,
      input,
    );
    return res.data.data!;
  },

  async deleteDropdown(id: string): Promise<void> {
    await apiClient.delete(`/v1/admin/dropdowns/${id}`);
  },

  async reassignEmployees(input: ReassignEmployeesInput): Promise<{ affected: number }> {
    const res = await apiClient.post<ApiResponse<{ affected: number }>>(
      "/v1/admin/dropdowns/reassign-employees",
      input,
    );
    return res.data.data!;
  },
};
