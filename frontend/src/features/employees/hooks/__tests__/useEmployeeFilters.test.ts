import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useEmployeeFilters } from "../useEmployeeFilters";

describe("useEmployeeFilters", () => {
  beforeEach(() => localStorage.clear());

  // ── Initial state ───────────────────────────────────────────────────────────

  it("starts with all filter arrays empty and filterCount zero", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    expect(result.current.activeStatuses).toEqual([]);
    expect(result.current.selectedDepts).toEqual([]);
    expect(result.current.selectedLocations).toEqual([]);
    expect(result.current.selectedHireTypes).toEqual([]);
    expect(result.current.selectedWorkModes).toEqual([]);
    expect(result.current.jobTitleInput).toBe("");
    expect(result.current.hireDateFrom).toBe("");
    expect(result.current.hireDateTo).toBe("");
    expect(result.current.filterCount).toBe(0);
  });

  // ── buildFilterParams ───────────────────────────────────────────────────────

  it("buildFilterParams defaults to status ['active'] when no statuses are selected", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    const params = result.current.buildFilterParams("");

    expect(params.status).toEqual(["active"]);
  });

  it("buildFilterParams uses selected statuses when any are active", () => {
    const { result } = renderHook(() => useEmployeeFilters());
    act(() => { result.current.toggleStatus("archived"); });

    const params = result.current.buildFilterParams("");

    expect(params.status).toEqual(["archived"]);
  });

  it("buildFilterParams includes search query as lowercase q param", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    const params = result.current.buildFilterParams("JANE");

    expect(params.q).toBe("jane");
  });

  it("buildFilterParams omits q when search string is empty", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    const params = result.current.buildFilterParams("");

    expect(params).not.toHaveProperty("q");
  });

  it("buildFilterParams includes selected department array", () => {
    const { result } = renderHook(() => useEmployeeFilters());
    act(() => {
      result.current.toggleDept("Engineering");
      result.current.toggleDept("Design");
    });

    const params = result.current.buildFilterParams("");

    expect(params.department).toEqual(["Engineering", "Design"]);
  });

  it("buildFilterParams omits department when none selected", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    expect(result.current.buildFilterParams("")).not.toHaveProperty("department");
  });

  it("buildFilterParams includes hire_date_from and hire_date_to when set", () => {
    const { result } = renderHook(() => useEmployeeFilters());
    act(() => {
      result.current.setHireDateFrom("2024-01-01");
      result.current.setHireDateTo("2024-12-31");
    });

    const params = result.current.buildFilterParams("");

    expect(params.hire_date_from).toBe("2024-01-01");
    expect(params.hire_date_to).toBe("2024-12-31");
  });

  // ── Toggle functions ────────────────────────────────────────────────────────

  it("toggleStatus adds a status on first call and removes it on second call", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    act(() => { result.current.toggleStatus("archived"); });
    expect(result.current.activeStatuses).toContain("archived");

    act(() => { result.current.toggleStatus("archived"); });
    expect(result.current.activeStatuses).not.toContain("archived");
  });

  it("toggleDept accumulates multiple departments", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    act(() => {
      result.current.toggleDept("Engineering");
      result.current.toggleDept("Design");
    });

    expect(result.current.selectedDepts).toEqual(["Engineering", "Design"]);
  });

  it("toggleLocation adds then removes a location", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    act(() => { result.current.toggleLocation("New York"); });
    expect(result.current.selectedLocations).toContain("New York");

    act(() => { result.current.toggleLocation("New York"); });
    expect(result.current.selectedLocations).not.toContain("New York");
  });

  it("toggleHireType adds and removes correctly", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    act(() => { result.current.toggleHireType("full_time"); });
    expect(result.current.selectedHireTypes).toContain("full_time");

    act(() => { result.current.toggleHireType("full_time"); });
    expect(result.current.selectedHireTypes).not.toContain("full_time");
  });

  it("toggleWorkMode adds and removes correctly", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    act(() => { result.current.toggleWorkMode("remote"); });
    expect(result.current.selectedWorkModes).toContain("remote");

    act(() => { result.current.toggleWorkMode("remote"); });
    expect(result.current.selectedWorkModes).not.toContain("remote");
  });

  // ── filterCount ─────────────────────────────────────────────────────────────

  it("filterCount counts one point per active status group, plus one per selected item in other categories", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    act(() => {
      result.current.toggleStatus("archived");   // +1 (status group counts as 1)
      result.current.toggleDept("Engineering");   // +1
      result.current.toggleDept("Design");        // +1
      result.current.toggleLocation("New York");  // +1
    });

    expect(result.current.filterCount).toBe(4);
  });

  it("filterCount returns to zero after clearAll", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    act(() => {
      result.current.toggleStatus("archived");
      result.current.toggleDept("Engineering");
      result.current.toggleHireType("full_time");
    });
    expect(result.current.filterCount).toBeGreaterThan(0);

    act(() => { result.current.clearAll(); });

    expect(result.current.filterCount).toBe(0);
  });

  // ── clearAll ────────────────────────────────────────────────────────────────

  it("clearAll resets all filter state to empty defaults", () => {
    const { result } = renderHook(() => useEmployeeFilters());

    act(() => {
      result.current.toggleStatus("archived");
      result.current.toggleDept("Engineering");
      result.current.toggleLocation("New York");
      result.current.toggleHireType("full_time");
      result.current.toggleWorkMode("remote");
      result.current.setJobTitleInput("Engineer");
      result.current.setHireDateFrom("2024-01-01");
      result.current.setHireDateTo("2024-12-31");
    });

    act(() => { result.current.clearAll(); });

    expect(result.current.activeStatuses).toEqual([]);
    expect(result.current.selectedDepts).toEqual([]);
    expect(result.current.selectedLocations).toEqual([]);
    expect(result.current.selectedHireTypes).toEqual([]);
    expect(result.current.selectedWorkModes).toEqual([]);
    expect(result.current.jobTitleInput).toBe("");
    expect(result.current.hireDateFrom).toBe("");
    expect(result.current.hireDateTo).toBe("");
  });
});
