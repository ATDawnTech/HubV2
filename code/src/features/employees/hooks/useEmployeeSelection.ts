import { useState } from "react";
import type { Employee, EmployeeListParams } from "../types/employee.types";
import { useAllEmployeeIds } from "./useAllEmployeeIds";

/**
 * Manages row-level and bulk selection for the employee table.
 * Uses useAllEmployeeIds (R4) to fetch all pages when selecting all.
 *
 * P3: extracted from EmployeeListPage.
 */
export function useEmployeeSelection(
  employeeList: Employee[],
  total: number,
  filterParams: Omit<EmployeeListParams, "cursor" | "limit">,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { execute: fetchAllIds, isLoading: isSelectingAll } = useAllEmployeeIds();

  const allPagesSelected = total > 0 && selectedIds.size >= total;
  const allSelected =
    employeeList.length > 0 && employeeList.every((e) => selectedIds.has(e.id));
  const someSelected = selectedIds.size > 0;
  const archivableSelected = employeeList.filter(
    (e) => selectedIds.has(e.id) && (e.status === "active" || e.status === "new_onboard"),
  );

  async function toggleAll(): Promise<void> {
    if (allPagesSelected) {
      setSelectedIds(new Set());
      return;
    }
    const allIds = await fetchAllIds(filterParams);
    setSelectedIds(allIds);
  }

  function toggleOne(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function clearSelection(): void {
    setSelectedIds(new Set());
  }

  return {
    selectedIds,
    allPagesSelected,
    allSelected,
    someSelected,
    archivableSelected,
    isSelectingAll,
    toggleAll,
    toggleOne,
    clearSelection,
  };
}
