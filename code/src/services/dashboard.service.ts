/**
 * Dashboard API service — thin wrapper around the HTTP layer.
 *
 * All return types are validated against Zod schemas before being returned.
 * Callers receive typed domain objects, not raw API responses.
 */

import { z } from "zod";
import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type { DashboardTask, ModuleSummary } from "@/features/dashboard/types/dashboard.types";
import {
  dashboardTaskSchema,
  moduleSummarySchema,
} from "@/features/dashboard/schemas/dashboard.schemas";

export interface TasksPage {
  tasks: DashboardTask[];
  meta: PaginationMeta;
}

export const dashboardService = {
  async getModules(): Promise<ModuleSummary[]> {
    const res = await apiClient.get<ApiResponse<ModuleSummary[]>>(
      "/v1/dashboard/modules",
    );
    return z.array(moduleSummarySchema).parse(res.data.data);
  },

  async getTasks(cursor?: string, limit = 20): Promise<TasksPage> {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;

    const res = await apiClient.get<ApiResponse<DashboardTask[]>>(
      "/v1/dashboard/tasks",
      { params },
    );

    return {
      tasks: z.array(dashboardTaskSchema).parse(res.data.data),
      meta: res.data.meta!,
    };
  },

  async completeTask(taskId: string): Promise<DashboardTask> {
    const res = await apiClient.patch<ApiResponse<DashboardTask>>(
      `/v1/dashboard/tasks/${taskId}/complete`,
    );
    return dashboardTaskSchema.parse(res.data.data);
  },

  async createTestTask(): Promise<DashboardTask> {
    const res = await apiClient.post<ApiResponse<DashboardTask>>(
      "/v1/dashboard/tasks/test",
    );
    return dashboardTaskSchema.parse(res.data.data);
  },
};
