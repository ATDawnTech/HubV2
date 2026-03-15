import { useState } from "react";
import { employeeService } from "@/services/employee.service";
import type { EmployeeListParams } from "../types/employee.types";

/**
 * Imperatively fetches all employee IDs matching a set of filter params
 * by walking every cursor page. Used by bulk-select-all (R4: no direct
 * service calls in components).
 */
export function useAllEmployeeIds() {
  const [isLoading, setIsLoading] = useState(false);

  async function execute(
    params: Omit<EmployeeListParams, "cursor" | "limit">,
  ): Promise<Set<string>> {
    setIsLoading(true);
    const allIds = new Set<string>();
    let cursor: string | undefined = undefined;
    try {
      do {
        const page = await employeeService.listEmployees({ ...params, limit: 100, cursor });
        page.employees.forEach((e) => allIds.add(e.id));
        cursor = page.meta.next_cursor ?? undefined;
      } while (cursor);
    } finally {
      setIsLoading(false);
    }
    return allIds;
  }

  return { execute, isLoading };
}
