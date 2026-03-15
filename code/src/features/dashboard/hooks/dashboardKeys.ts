/**
 * TanStack Query key factory for all dashboard queries.
 *
 * Using a key factory ensures query keys are consistent and makes targeted
 * cache invalidation (e.g. invalidate all dashboard queries, or just tasks)
 * straightforward from any mutation hook.
 */

export const dashboardKeys = {
  all: ["dashboard"] as const,
  modules: () => [...dashboardKeys.all, "modules"] as const,
  tasks: (cursor?: string) => [...dashboardKeys.all, "tasks", cursor ?? "first"] as const,
} as const;
