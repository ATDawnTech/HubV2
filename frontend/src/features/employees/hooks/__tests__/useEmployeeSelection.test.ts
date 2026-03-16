import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetchAllIds = vi.hoisted(() => vi.fn());

vi.mock("../useAllEmployeeIds", () => ({
  useAllEmployeeIds: () => ({ execute: mockFetchAllIds, isLoading: false }),
}));

import { useEmployeeSelection } from "../useEmployeeSelection";
import type { Employee } from "../../types/employee.types";

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-default",
    employee_code: "EMP-001",
    first_name: "Jane",
    last_name: "Smith",
    work_email: "Jane.Smith@AtDawnTech.com",
    job_title: "Engineer",
    department: "Engineering",
    manager_id: null,
    hire_date: "2024-01-15",
    hire_type: "full_time",
    work_mode: "hybrid",
    status: "active",
    location: "New York",
    archived_at: null,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    ...overrides,
  };
}

const filterParams = { status: ["active"] as string[] };

describe("useEmployeeSelection", () => {
  beforeEach(() => {
    mockFetchAllIds.mockReset();
  });

  // ── Initial state ───────────────────────────────────────────────────────────

  it("starts with no selected IDs", () => {
    const { result } = renderHook(() => useEmployeeSelection([], 0, filterParams));

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.someSelected).toBe(false);
    expect(result.current.allPagesSelected).toBe(false);
  });

  // ── toggleOne ───────────────────────────────────────────────────────────────

  it("toggleOne adds an employee ID to the selection", () => {
    const employees = [makeEmployee({ id: "emp-1" })];
    const { result } = renderHook(() => useEmployeeSelection(employees, 1, filterParams));

    act(() => { result.current.toggleOne("emp-1"); });

    expect(result.current.selectedIds.has("emp-1")).toBe(true);
    expect(result.current.someSelected).toBe(true);
  });

  it("toggleOne removes an already-selected ID", () => {
    const employees = [makeEmployee({ id: "emp-1" })];
    const { result } = renderHook(() => useEmployeeSelection(employees, 1, filterParams));

    act(() => { result.current.toggleOne("emp-1"); });
    act(() => { result.current.toggleOne("emp-1"); });

    expect(result.current.selectedIds.has("emp-1")).toBe(false);
    expect(result.current.someSelected).toBe(false);
  });

  it("toggleOne can select multiple distinct IDs independently", () => {
    const employees = [
      makeEmployee({ id: "emp-1" }),
      makeEmployee({ id: "emp-2" }),
      makeEmployee({ id: "emp-3" }),
    ];
    const { result } = renderHook(() => useEmployeeSelection(employees, 3, filterParams));

    act(() => {
      result.current.toggleOne("emp-1");
      result.current.toggleOne("emp-3");
    });

    expect(result.current.selectedIds.has("emp-1")).toBe(true);
    expect(result.current.selectedIds.has("emp-2")).toBe(false);
    expect(result.current.selectedIds.has("emp-3")).toBe(true);
  });

  // ── clearSelection ──────────────────────────────────────────────────────────

  it("clearSelection empties all selected IDs", () => {
    const employees = [makeEmployee({ id: "emp-1" }), makeEmployee({ id: "emp-2" })];
    const { result } = renderHook(() => useEmployeeSelection(employees, 2, filterParams));

    act(() => {
      result.current.toggleOne("emp-1");
      result.current.toggleOne("emp-2");
    });
    act(() => { result.current.clearSelection(); });

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.someSelected).toBe(false);
  });

  // ── allPagesSelected ────────────────────────────────────────────────────────

  it("allPagesSelected is true when selectedIds.size equals total", () => {
    const employees = [makeEmployee({ id: "emp-1" }), makeEmployee({ id: "emp-2" })];
    const { result } = renderHook(() => useEmployeeSelection(employees, 2, filterParams));

    act(() => {
      result.current.toggleOne("emp-1");
      result.current.toggleOne("emp-2");
    });

    expect(result.current.allPagesSelected).toBe(true);
  });

  it("allPagesSelected is false when only some IDs are selected", () => {
    const employees = [makeEmployee({ id: "emp-1" }), makeEmployee({ id: "emp-2" })];
    const { result } = renderHook(() => useEmployeeSelection(employees, 2, filterParams));

    act(() => { result.current.toggleOne("emp-1"); });

    expect(result.current.allPagesSelected).toBe(false);
  });

  it("allPagesSelected is false when total is 0", () => {
    const { result } = renderHook(() => useEmployeeSelection([], 0, filterParams));

    expect(result.current.allPagesSelected).toBe(false);
  });

  // ── archivableSelected ──────────────────────────────────────────────────────

  it("archivableSelected includes only active and new_onboard employees from the selection", () => {
    const employees = [
      makeEmployee({ id: "emp-active", status: "active" }),
      makeEmployee({ id: "emp-new", status: "new_onboard" }),
      makeEmployee({ id: "emp-archiving", status: "archiving" }),
      makeEmployee({ id: "emp-archived", status: "archived" }),
    ];
    const { result } = renderHook(() => useEmployeeSelection(employees, 4, filterParams));

    act(() => {
      result.current.toggleOne("emp-active");
      result.current.toggleOne("emp-new");
      result.current.toggleOne("emp-archiving");
      result.current.toggleOne("emp-archived");
    });

    const archivableIds = result.current.archivableSelected.map((e) => e.id);
    expect(archivableIds).toContain("emp-active");
    expect(archivableIds).toContain("emp-new");
    expect(archivableIds).not.toContain("emp-archiving");
    expect(archivableIds).not.toContain("emp-archived");
  });

  it("archivableSelected is empty when no employees are selected", () => {
    const employees = [makeEmployee({ id: "emp-1", status: "active" })];
    const { result } = renderHook(() => useEmployeeSelection(employees, 1, filterParams));

    expect(result.current.archivableSelected).toHaveLength(0);
  });

  // ── toggleAll ───────────────────────────────────────────────────────────────

  it("toggleAll fetches all IDs and selects them when not all pages selected", async () => {
    mockFetchAllIds.mockResolvedValue(new Set(["emp-1", "emp-2", "emp-3"]));
    const employees = [makeEmployee({ id: "emp-1" })];

    const { result } = renderHook(() => useEmployeeSelection(employees, 3, filterParams));

    await act(async () => { await result.current.toggleAll(); });

    expect(mockFetchAllIds).toHaveBeenCalledWith(filterParams);
    expect(result.current.selectedIds.size).toBe(3);
    expect(result.current.selectedIds.has("emp-1")).toBe(true);
    expect(result.current.selectedIds.has("emp-2")).toBe(true);
    expect(result.current.selectedIds.has("emp-3")).toBe(true);
  });

  it("toggleAll clears the entire selection when all pages are already selected", async () => {
    const employees = [makeEmployee({ id: "emp-1" })];
    const { result } = renderHook(() => useEmployeeSelection(employees, 1, filterParams));

    act(() => { result.current.toggleOne("emp-1"); });
    expect(result.current.allPagesSelected).toBe(true);

    await act(async () => { await result.current.toggleAll(); });

    expect(result.current.selectedIds.size).toBe(0);
    expect(mockFetchAllIds).not.toHaveBeenCalled(); // no fetch needed when clearing
  });
});
