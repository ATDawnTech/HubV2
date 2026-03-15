import { describe, it, expect } from "vitest";
import {
  GROUPED,
  isSelected,
  hasOtherPermsInModule,
  ACTION_DEPS,
  isLockedByActionDep,
  getModuleLevel,
} from "../permissionVerbUtils";
import type { Permission } from "../../types/role.types";

// ---------------------------------------------------------------------------
// GROUPED
// ---------------------------------------------------------------------------

describe("GROUPED", () => {
  it("groups permissions by module", () => {
    expect(GROUPED["employees"]).toBeDefined();
    expect(GROUPED["admin"]).toBeDefined();
  });

  it("includes view_module as one of the employee actions", () => {
    expect(GROUPED["employees"]).toContain("view_module");
  });

  it("includes all admin actions", () => {
    expect(GROUPED["admin"]).toContain("manage_roles");
    expect(GROUPED["admin"]).toContain("manage_dropdowns");
    expect(GROUPED["admin"]).toContain("manage_skills");
    expect(GROUPED["admin"]).toContain("manage_notifications");
    expect(GROUPED["admin"]).toContain("assign_roles");
  });

  it("does not mix actions across modules", () => {
    expect(GROUPED["employees"]).not.toContain("manage_roles");
    expect(GROUPED["admin"]).not.toContain("create_employee");
  });
});

// ---------------------------------------------------------------------------
// isSelected
// ---------------------------------------------------------------------------

describe("isSelected", () => {
  const perms: Permission[] = [
    { module: "employees", action: "view_module" },
    { module: "admin", action: "manage_roles" },
  ];

  it("returns true when the permission exists in the list", () => {
    expect(isSelected(perms, "employees", "view_module")).toBe(true);
    expect(isSelected(perms, "admin", "manage_roles")).toBe(true);
  });

  it("returns false when module matches but action does not", () => {
    expect(isSelected(perms, "employees", "create_employee")).toBe(false);
  });

  it("returns false when action matches but module does not", () => {
    expect(isSelected(perms, "assets", "view_module")).toBe(false);
  });

  it("returns false for an empty permissions list", () => {
    expect(isSelected([], "employees", "view_module")).toBe(false);
  });

  it("returns false when neither module nor action match", () => {
    expect(isSelected(perms, "intake", "create_requisition")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasOtherPermsInModule
// ---------------------------------------------------------------------------

describe("hasOtherPermsInModule", () => {
  it("returns false when only view_module is granted for the module", () => {
    const perms: Permission[] = [{ module: "employees", action: "view_module" }];
    expect(hasOtherPermsInModule(perms, "employees")).toBe(false);
  });

  it("returns true when a non-view_module permission exists for the module", () => {
    const perms: Permission[] = [
      { module: "employees", action: "view_module" },
      { module: "employees", action: "create_employee" },
    ];
    expect(hasOtherPermsInModule(perms, "employees")).toBe(true);
  });

  it("returns false when the module has no permissions at all", () => {
    const perms: Permission[] = [{ module: "admin", action: "manage_roles" }];
    expect(hasOtherPermsInModule(perms, "employees")).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(hasOtherPermsInModule([], "employees")).toBe(false);
  });

  it("ignores permissions from other modules", () => {
    const perms: Permission[] = [{ module: "admin", action: "create_employee" }];
    // "create_employee" is in "admin" here, not "employees" — should be false
    expect(hasOtherPermsInModule(perms, "employees")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ACTION_DEPS
// ---------------------------------------------------------------------------

describe("ACTION_DEPS", () => {
  it("defines dependencies for access_employee_admin_mode", () => {
    expect(ACTION_DEPS["access_employee_admin_mode"]).toEqual(
      expect.arrayContaining(["archive_employee", "export_employees"]),
    );
  });
});

// ---------------------------------------------------------------------------
// isLockedByActionDep
// ---------------------------------------------------------------------------

describe("isLockedByActionDep", () => {
  it("returns false for an action with no defined dependencies", () => {
    const perms: Permission[] = [{ module: "employees", action: "view_module" }];
    expect(isLockedByActionDep(perms, "employees", "view_module")).toBe(false);
  });

  it("returns true when a dependency of the action is in the selected list", () => {
    const perms: Permission[] = [
      { module: "employees", action: "archive_employee" },
    ];
    expect(isLockedByActionDep(perms, "employees", "access_employee_admin_mode")).toBe(true);
  });

  it("returns true when the other dependency is selected", () => {
    const perms: Permission[] = [
      { module: "employees", action: "export_employees" },
    ];
    expect(isLockedByActionDep(perms, "employees", "access_employee_admin_mode")).toBe(true);
  });

  it("returns false when none of the dependencies are selected", () => {
    const perms: Permission[] = [
      { module: "employees", action: "view_module" },
      { module: "employees", action: "create_employee" },
    ];
    expect(isLockedByActionDep(perms, "employees", "access_employee_admin_mode")).toBe(false);
  });

  it("returns false with an empty permissions list", () => {
    expect(isLockedByActionDep([], "employees", "access_employee_admin_mode")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getModuleLevel
// ---------------------------------------------------------------------------

describe("getModuleLevel", () => {
  const allEmployeeActions = ["view_module", "create_employee", "edit_employee", "archive_employee"];

  it("returns 'none' when no permissions exist for the module", () => {
    const perms: Permission[] = [{ module: "admin", action: "manage_roles" }];
    expect(getModuleLevel(perms, "employees", allEmployeeActions)).toBe("none");
  });

  it("returns 'none' for empty permissions list", () => {
    expect(getModuleLevel([], "employees", allEmployeeActions)).toBe("none");
  });

  it("returns 'view' when only view_module is granted", () => {
    const perms: Permission[] = [{ module: "employees", action: "view_module" }];
    expect(getModuleLevel(perms, "employees", allEmployeeActions)).toBe("view");
  });

  it("returns 'full' when all actions for the module are granted", () => {
    const perms: Permission[] = allEmployeeActions.map((action) => ({
      module: "employees",
      action,
    }));
    expect(getModuleLevel(perms, "employees", allEmployeeActions)).toBe("full");
  });

  it("returns 'custom' when some but not all actions are granted", () => {
    const perms: Permission[] = [
      { module: "employees", action: "view_module" },
      { module: "employees", action: "create_employee" },
    ];
    expect(getModuleLevel(perms, "employees", allEmployeeActions)).toBe("custom");
  });

  it("returns 'full' for a single-action module when that action is granted", () => {
    const perms: Permission[] = [{ module: "onboarding", action: "manage_onboarding" }];
    expect(getModuleLevel(perms, "onboarding", ["manage_onboarding"])).toBe("full");
  });
});
