export interface Skill {
  id: string;
  name: string;
  category: string | null;
  usage_count: number;
  intake_count: number;
  created_at: string | null;
}

export interface CreateSkillInput {
  name: string;
  category?: string | null;
}

export interface BulkDeleteSkillsInput {
  ids: string[];
}

export interface BulkDeleteSkillsResult {
  deleted_count: number;
  skipped_count: number;
  skipped_ids: string[];
}

export interface SkillsListParams {
  search?: string | undefined;
  sort_by?: "name" | "created_at" | "usage_count";
  sort?: "asc" | "desc";
  limit?: number;
  offset?: number;
  category?: string | undefined;
}
