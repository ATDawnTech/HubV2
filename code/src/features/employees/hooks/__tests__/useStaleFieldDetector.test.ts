/**
 * Tests for useStaleFieldDetector.
 *
 * The hook's public surface is `getStaleFields(employee)`, which returns a
 * Record<field, reason> of any fields that are missing, disabled, or removed.
 * We mock useDropdownOptions to control the active/all option sets.
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStaleFieldDetector } from "../useStaleFieldDetector";
import type { Employee } from "../../types/employee.types";

// ---------------------------------------------------------------------------
// Mock useDropdownOptions
// ---------------------------------------------------------------------------

vi.mock("@/features/admin-settings/hooks/useDropdownOptions", () => ({
  useDropdownOptions: vi.fn(),
}));

import { useDropdownOptions } from "@/features/admin-settings/hooks/useDropdownOptions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type OptionEntry = { value: string; is_active: boolean };

function makeOptions(items: OptionEntry[]) {
  return { data: items, isSuccess: true };
}

/** Preset: options not yet loaded */
function loadingOptions() {
  return { data: undefined, isSuccess: false };
}

function setupDropdownOptions(overrides: {
  department?: OptionEntry[];
  hire_type?: OptionEntry[];
  work_mode?: OptionEntry[];
  location?: OptionEntry[];
} = {}) {
  const dept = overrides.department ?? [
    { value: "Engineering", is_active: true },
    { value: "HR", is_active: true },
    { value: "OldDept", is_active: false },
  ];
  const hireType = overrides.hire_type ?? [
    { value: "full_time", is_active: true },
    { value: "contract", is_active: true },
    { value: "old_type", is_active: false },
  ];
  const workMode = overrides.work_mode ?? [
    { value: "hybrid", is_active: true },
    { value: "remote", is_active: true },
    { value: "old_mode", is_active: false },
  ];
  const location = overrides.location ?? [
    { value: "New York", is_active: true },
    { value: "London", is_active: true },
    { value: "OldCity", is_active: false },
  ];

  (useDropdownOptions as ReturnType<typeof vi.fn>).mockImplementation(
    (_module: string, key: string) => {
      if (key === "department") return makeOptions(dept);
      if (key === "hire_type") return makeOptions(hireType);
      if (key === "work_mode") return makeOptions(workMode);
      if (key === "location") return makeOptions(location);
      return loadingOptions();
    },
  );
}

function baseEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp_1",
    first_name: "Jane",
    last_name: "Smith",
    work_email: "Jane.Smith@AtDawnTech.com",
    department: "Engineering",
    hire_type: "full_time",
    work_mode: "hybrid",
    location: "New York",
    status: "active",
    employee_code: null,
    job_title: null,
    hire_date: null,
    manager_id: null,
    skills: [],
    ...overrides,
  } as Employee;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useStaleFieldDetector — getStaleFields", () => {
  describe("when options are not yet loaded", () => {
    it("returns empty object (no false positives while loading)", () => {
      (useDropdownOptions as ReturnType<typeof vi.fn>).mockReturnValue(loadingOptions());
      const { result } = renderHook(() => useStaleFieldDetector());
      expect(result.current.getStaleFields(baseEmployee())).toEqual({});
    });
  });

  describe("when options are loaded and employee fields are valid", () => {
    it("returns empty object for a fully valid employee", () => {
      setupDropdownOptions();
      const { result } = renderHook(() => useStaleFieldDetector());
      expect(result.current.getStaleFields(baseEmployee())).toEqual({});
    });
  });

  describe("missing fields", () => {
    beforeEach(() => setupDropdownOptions());

    it("flags null department as Missing", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ department: null }));
      expect(stale["department"]).toBe("Missing");
    });

    it("flags empty-string department as Missing", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ department: "" }));
      expect(stale["department"]).toBe("Missing");
    });

    it("flags whitespace-only department as Missing", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ department: "   " }));
      expect(stale["department"]).toBe("Missing");
    });

    it("flags null hire_type, work_mode, and location as Missing", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(
        baseEmployee({ hire_type: null, work_mode: null, location: null }),
      );
      expect(stale["hire_type"]).toBe("Missing");
      expect(stale["work_mode"]).toBe("Missing");
      expect(stale["location"]).toBe("Missing");
    });

    it("can flag all four required fields at once", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(
        baseEmployee({ department: null, hire_type: null, work_mode: null, location: null }),
      );
      expect(Object.keys(stale)).toHaveLength(4);
    });
  });

  describe("disabled options", () => {
    beforeEach(() => setupDropdownOptions());

    it("flags department that is in all options but not active as Disabled", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ department: "OldDept" }));
      expect(stale["department"]).toBe("Disabled");
    });

    it("flags hire_type that is disabled as Disabled", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ hire_type: "old_type" }));
      expect(stale["hire_type"]).toBe("Disabled");
    });

    it("flags work_mode that is disabled as Disabled", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ work_mode: "old_mode" }));
      expect(stale["work_mode"]).toBe("Disabled");
    });

    it("flags location that is disabled as Disabled", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ location: "OldCity" }));
      expect(stale["location"]).toBe("Disabled");
    });
  });

  describe("removed options (not in allSet at all)", () => {
    beforeEach(() => setupDropdownOptions());

    it("flags department with a value not in any option list as Removed", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ department: "DeletedDept" }));
      expect(stale["department"]).toBe("Removed");
    });

    it("flags location not in any option as Removed", () => {
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ location: "Mars" }));
      expect(stale["location"]).toBe("Removed");
    });
  });

  describe("activeSet is empty (options list cleared)", () => {
    it("returns no stale reason when activeSet is empty (prevents false positives with empty lists)", () => {
      // activeSet empty = no active options loaded → staleReason returns undefined
      setupDropdownOptions({ department: [] });
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(baseEmployee({ department: "Engineering" }));
      // With empty activeSet, staleReason returns undefined (no comparison possible)
      expect(stale["department"]).toBeUndefined();
    });
  });

  describe("mixed stale and clean fields", () => {
    it("reports only the stale fields, not clean ones", () => {
      setupDropdownOptions();
      const { result } = renderHook(() => useStaleFieldDetector());
      const stale = result.current.getStaleFields(
        baseEmployee({ department: "OldDept", hire_type: "full_time" }),
      );
      expect(stale["department"]).toBe("Disabled");
      expect(stale["hire_type"]).toBeUndefined();
    });
  });
});
