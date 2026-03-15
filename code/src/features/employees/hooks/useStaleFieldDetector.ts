import { useMemo } from "react";
import { useDropdownOptions } from "@/features/admin-settings/hooks/useDropdownOptions";
import type { Employee } from "../types/employee.types";

const REQUIRED_FIELDS: (keyof Employee)[] = ["department", "hire_type", "work_mode", "location"];

function staleReason(value: string | null | undefined, activeSet: Set<string>, allSet: Set<string>): string | undefined {
  if (!value || activeSet.size === 0) return undefined;
  if (activeSet.has(value)) return undefined;
  return allSet.has(value) ? "Disabled" : "Removed";
}

export function useStaleFieldDetector() {
  const deptOptions = useDropdownOptions("employees", "department");
  const hireTypeOptions = useDropdownOptions("global", "hire_type");
  const workModeOptions = useDropdownOptions("global", "work_mode");
  const locationOptions = useDropdownOptions("global", "location");

  const activeValueSets = useMemo(() => ({
    department: new Set(deptOptions.data?.filter((o) => o.is_active).map((o) => o.value) ?? []),
    hire_type: new Set(hireTypeOptions.data?.filter((o) => o.is_active).map((o) => o.value) ?? []),
    work_mode: new Set(workModeOptions.data?.filter((o) => o.is_active).map((o) => o.value) ?? []),
    location: new Set(locationOptions.data?.filter((o) => o.is_active).map((o) => o.value) ?? []),
  }), [deptOptions.data, hireTypeOptions.data, workModeOptions.data, locationOptions.data]);

  const allValueSets = useMemo(() => ({
    department: new Set(deptOptions.data?.map((o) => o.value) ?? []),
    hire_type: new Set(hireTypeOptions.data?.map((o) => o.value) ?? []),
    work_mode: new Set(workModeOptions.data?.map((o) => o.value) ?? []),
    location: new Set(locationOptions.data?.map((o) => o.value) ?? []),
  }), [deptOptions.data, hireTypeOptions.data, workModeOptions.data, locationOptions.data]);

  const optionsLoaded =
    deptOptions.isSuccess &&
    hireTypeOptions.isSuccess &&
    workModeOptions.isSuccess &&
    locationOptions.isSuccess;

  function getStaleFields(emp: Employee): Record<string, string> {
    if (!optionsLoaded) return {};
    const result: Record<string, string> = {};

    for (const field of REQUIRED_FIELDS) {
      const val = emp[field] as string | null | undefined;
      if (!val || !val.trim()) {
        result[field] = "Missing";
        continue;
      }
    }

    if (!result["department"]) {
      const dept = staleReason(emp.department, activeValueSets.department, allValueSets.department);
      if (dept) result["department"] = dept;
    }
    if (!result["hire_type"]) {
      const hire = staleReason(emp.hire_type, activeValueSets.hire_type, allValueSets.hire_type);
      if (hire) result["hire_type"] = hire;
    }
    if (!result["work_mode"]) {
      const mode = staleReason(emp.work_mode, activeValueSets.work_mode, allValueSets.work_mode);
      if (mode) result["work_mode"] = mode;
    }
    if (!result["location"]) {
      const loc = staleReason(emp.location, activeValueSets.location, allValueSets.location);
      if (loc) result["location"] = loc;
    }
    return result;
  }

  return { getStaleFields };
}
