import type { EmployeeListParams } from "../types/employee.types";

export const employeeKeys = {
  all: ["employees"] as const,
  lists: () => [...employeeKeys.all, "list"] as const,
  list: (params?: EmployeeListParams) =>
    [...employeeKeys.lists(), params ?? {}] as const,
  details: () => [...employeeKeys.all, "detail"] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  offboarding: () => [...employeeKeys.all, "offboarding"] as const,
  offboardingList: (cursor?: string) =>
    [...employeeKeys.offboarding(), cursor ?? "first"] as const,
  offboardingTasks: (employeeId: string) =>
    [...employeeKeys.offboarding(), "tasks", employeeId] as const,
  // "roles-v2" busts stale string[] cache from the old endpoint shape
  roles: (employeeId: string) =>
    [...employeeKeys.all, "roles-v2", employeeId] as const,
} as const;
