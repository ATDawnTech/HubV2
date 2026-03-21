import { useDebounce } from "@/lib/hooks/useDebounce";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { EmployeeListParams } from "../types/employee.types";

/**
 * Manages all employee list filter state, persisted to localStorage.
 * Does not own pagination — callers call resetPage() after any setter they need.
 *
 * P3: extracted from EmployeeListPage to keep that component single-responsibility.
 */
export function useEmployeeFilters() {
  const [activeStatuses, setActiveStatuses] = useLocalStorage<string[]>("emp-filter-statuses", []);
  const [selectedDepts, setSelectedDepts] = useLocalStorage<string[]>("emp-filter-depts", []);
  const [selectedLocations, setSelectedLocations] = useLocalStorage<string[]>("emp-filter-locations", []);
  const [selectedHireTypes, setSelectedHireTypes] = useLocalStorage<string[]>("emp-filter-hire-types", []);
  const [selectedWorkModes, setSelectedWorkModes] = useLocalStorage<string[]>("emp-filter-work-modes", []);
  const [jobTitleInput, setJobTitleInput] = useLocalStorage("emp-filter-job-title", "");
  const debouncedJobTitle = useDebounce(jobTitleInput, 300);
  const [hireDateFrom, setHireDateFrom] = useLocalStorage("emp-filter-date-from", "");
  const [hireDateTo, setHireDateTo] = useLocalStorage("emp-filter-date-to", "");
  const [selectedRoles, setSelectedRoles] = useLocalStorage<string[]>("emp-filter-roles", []);

  const filterCount =
    (activeStatuses.length > 0 ? 1 : 0) +
    selectedDepts.length +
    selectedLocations.length +
    selectedHireTypes.length +
    selectedWorkModes.length +
    (debouncedJobTitle ? 1 : 0) +
    (hireDateFrom ? 1 : 0) +
    (hireDateTo ? 1 : 0) +
    selectedRoles.length;

  /** Build the params object to pass to useEmployees / useAllEmployeeIds. */
  function buildFilterParams(
    debouncedSearch: string,
  ): Omit<EmployeeListParams, "cursor" | "limit"> {
    return {
      ...(debouncedSearch ? { q: debouncedSearch.toLowerCase() } : {}),
      status: activeStatuses.length > 0 ? activeStatuses : ["active"],
      ...(selectedDepts.length ? { department: selectedDepts } : {}),
      ...(selectedLocations.length ? { location: selectedLocations } : {}),
      ...(selectedHireTypes.length ? { hire_type: selectedHireTypes } : {}),
      ...(selectedWorkModes.length ? { work_mode: selectedWorkModes } : {}),
      ...(debouncedJobTitle ? { job_title: debouncedJobTitle.toLowerCase() } : {}),
      ...(hireDateFrom ? { hire_date_from: hireDateFrom } : {}),
      ...(hireDateTo ? { hire_date_to: hireDateTo } : {}),
      ...(selectedRoles.length ? { role_id: selectedRoles } : {}),
    };
  }

  function toggleStatus(s: string): void {
    setActiveStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function toggleDept(v: string): void {
    setSelectedDepts((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  function toggleLocation(v: string): void {
    setSelectedLocations((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  function toggleHireType(v: string): void {
    setSelectedHireTypes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  function toggleWorkMode(v: string): void {
    setSelectedWorkModes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  function toggleRole(v: string): void {
    setSelectedRoles((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  function clearAll(): void {
    setActiveStatuses([]);
    setSelectedDepts([]);
    setSelectedLocations([]);
    setSelectedHireTypes([]);
    setSelectedWorkModes([]);
    setJobTitleInput("");
    setHireDateFrom("");
    setHireDateTo("");
    setSelectedRoles([]);
  }

  return {
    // State (read-only — use the functions below to mutate)
    activeStatuses,
    selectedDepts,
    selectedLocations,
    selectedHireTypes,
    selectedWorkModes,
    jobTitleInput,
    hireDateFrom,
    hireDateTo,
    selectedRoles,
    debouncedJobTitle,
    filterCount,
    // Helpers
    buildFilterParams,
    // Mutators (callers are responsible for also calling resetPage)
    toggleStatus,
    toggleDept,
    toggleLocation,
    toggleHireType,
    toggleWorkMode,
    toggleRole,
    setJobTitleInput,
    setHireDateFrom,
    setHireDateTo,
    clearAll,
  };
}
