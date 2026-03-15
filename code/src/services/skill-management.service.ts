import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type {
  BulkDeleteSkillsInput,
  BulkDeleteSkillsResult,
  CreateSkillInput,
  Skill,
  SkillsListParams,
} from "@/features/admin-settings/types/skill-management.types";

export interface SkillsPage {
  skills: Skill[];
  meta: PaginationMeta;
}

export const skillManagementService = {
  async listSkills(params: SkillsListParams): Promise<SkillsPage> {
    const res = await apiClient.get<ApiResponse<Skill[]>>("/v1/admin/skills", { params });
    return {
      skills: res.data.data ?? [],
      meta: res.data.meta!,
    };
  },

  async listCategories(): Promise<string[]> {
    const res = await apiClient.get<ApiResponse<string[]>>("/v1/admin/skills/categories");
    return res.data.data ?? [];
  },

  async createSkill(input: CreateSkillInput): Promise<Skill> {
    const res = await apiClient.post<ApiResponse<Skill>>("/v1/admin/skills", input);
    if (res.data.error) throw new Error(res.data.error.message);
    return res.data.data!;
  },

  async deleteSkill(id: string): Promise<void> {
    await apiClient.delete(`/v1/admin/skills/${id}`);
  },

  async bulkDeleteSkills(input: BulkDeleteSkillsInput): Promise<BulkDeleteSkillsResult> {
    const res = await apiClient.post<ApiResponse<BulkDeleteSkillsResult>>(
      "/v1/admin/skills/bulk-delete",
      input,
    );
    return res.data.data!;
  },

  async bulkRecategorize(fromCategory: string | null, toCategory: string | null): Promise<{ updated_count: number }> {
    const res = await apiClient.post<ApiResponse<{ updated_count: number }>>(
      "/v1/admin/skills/bulk-recategorize",
      { from_category: fromCategory, to_category: toCategory },
    );
    return res.data.data!;
  },
};
