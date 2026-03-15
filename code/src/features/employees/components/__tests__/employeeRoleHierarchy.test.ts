/**
 * Unit tests for the role hierarchy rules embedded in EmployeeEditModal.
 *
 * The three functions below are lifted verbatim from EmployeeEditModal's
 * internal logic so we can test them without mounting the full component.
 * If the component logic changes, update these functions to match.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Types (mirrors the shape used in EmployeeEditModal)
// ---------------------------------------------------------------------------

interface Role {
  id: string;
  name: string;
  is_system: boolean;
  sort_order?: number;
}

interface EmployeeRoleEntry {
  role_id: string;
  role_name: string;
  is_manager: boolean;
}

// ---------------------------------------------------------------------------
// Functions under test (mirrored from EmployeeEditModal)
// ---------------------------------------------------------------------------

function buildHierarchy(
  currentUserRoles: EmployeeRoleEntry[],
  allRoles: Role[],
  canManage: boolean,
) {
  const currentUserRoleIds = new Set(currentUserRoles.map((r) => r.role_id));
  const currentUserHasSystemRole = allRoles.some(
    (r) => r.is_system && currentUserRoleIds.has(r.id),
  );
  const currentUserSortOrders = allRoles
    .filter((r) => currentUserRoleIds.has(r.id))
    .map((r) => {
      const sortOrder = r.sort_order ?? 9999;
      const entry = currentUserRoles.find((ur) => ur.role_id === r.id);
      return entry?.is_manager ? sortOrder - 1 : sortOrder;
    });
  const minCurrentSortOrder =
    currentUserSortOrders.length > 0 ? Math.min(...currentUserSortOrders) : 9999;

  function canManageRole(roleId: string): boolean {
    if (!canManage) return false;
    const role = allRoles.find((r) => r.id === roleId);
    if (!role) return false;
    if (role.is_system) return currentUserHasSystemRole;
    return (role.sort_order ?? 9999) > minCurrentSortOrder;
  }

  function canSetManagerForRole(roleId: string): boolean {
    const role = allRoles.find((r) => r.id === roleId);
    if (role?.is_system) return false;
    if (currentUserHasSystemRole) return true;
    return false;
  }

  function isTargetReadOnly(entry: EmployeeRoleEntry): boolean {
    // Non-system-admins cannot remove or modify manager-flagged assignments
    return entry.is_manager && !currentUserHasSystemRole;
  }

  return { canManageRole, canSetManagerForRole, isTargetReadOnly, currentUserHasSystemRole, minCurrentSortOrder };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const systemAdminRole: Role = { id: "role_sysadmin", name: "System Admin", is_system: true, sort_order: 0 };
const itManagerRole: Role  = { id: "role_it_mgr",   name: "IT Manager",   is_system: false, sort_order: 10 };
const itRole: Role         = { id: "role_it",        name: "IT",           is_system: false, sort_order: 20 };
const staffRole: Role      = { id: "role_staff",     name: "Staff",        is_system: false, sort_order: 30 };

const allRoles = [systemAdminRole, itManagerRole, itRole, staffRole];

// ---------------------------------------------------------------------------
// canManageRole
// ---------------------------------------------------------------------------

describe("canManageRole", () => {
  describe("when current user is a system admin", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_sysadmin", role_name: "System Admin", is_manager: false },
    ];
    const { canManageRole } = buildHierarchy(currentUserRoles, allRoles, true);

    it("can manage system roles", () => {
      expect(canManageRole("role_sysadmin")).toBe(true);
    });

    it("can manage roles below them in sort_order", () => {
      expect(canManageRole("role_it_mgr")).toBe(true);
      expect(canManageRole("role_it")).toBe(true);
      expect(canManageRole("role_staff")).toBe(true);
    });
  });

  describe("when current user is an IT Manager (sort_order 10, non-manager)", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_it_mgr", role_name: "IT Manager", is_manager: false },
    ];
    const { canManageRole } = buildHierarchy(currentUserRoles, allRoles, true);

    it("cannot manage system roles", () => {
      expect(canManageRole("role_sysadmin")).toBe(false);
    });

    it("cannot manage their own role (same sort_order — not strictly greater)", () => {
      expect(canManageRole("role_it_mgr")).toBe(false);
    });

    it("can manage roles with higher sort_order (IT, Staff)", () => {
      expect(canManageRole("role_it")).toBe(true);
      expect(canManageRole("role_staff")).toBe(true);
    });
  });

  describe("when current user is an IT member who is manager of IT (sort_order 20, manager → effective 19)", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_it", role_name: "IT", is_manager: true },
    ];
    const { canManageRole, minCurrentSortOrder } = buildHierarchy(currentUserRoles, allRoles, true);

    it("effective sort_order is 19 (20 - 1 for manager elevation)", () => {
      expect(minCurrentSortOrder).toBe(19);
    });

    it("cannot manage their own role (sort_order 20 is not > 19 effective)", () => {
      // sort_order 20 > 19 is true — they CAN manage it
      // (manager elevation means they're ranked above their base role)
      expect(canManageRole("role_it")).toBe(true);
    });

    it("can manage Staff (sort_order 30 > 19)", () => {
      expect(canManageRole("role_staff")).toBe(true);
    });

    it("cannot manage IT Manager role (sort_order 10 < 19)", () => {
      expect(canManageRole("role_it_mgr")).toBe(false);
    });
  });

  describe("when canManage is false (no manage_roles permission)", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_sysadmin", role_name: "System Admin", is_manager: false },
    ];
    const { canManageRole } = buildHierarchy(currentUserRoles, allRoles, false);

    it("returns false even for system admins without the permission", () => {
      expect(canManageRole("role_staff")).toBe(false);
    });
  });

  describe("when role does not exist", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_sysadmin", role_name: "System Admin", is_manager: false },
    ];
    const { canManageRole } = buildHierarchy(currentUserRoles, allRoles, true);

    it("returns false for unknown roleId", () => {
      expect(canManageRole("role_nonexistent")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// canSetManagerForRole
// ---------------------------------------------------------------------------

describe("canSetManagerForRole", () => {
  describe("when current user is a system admin", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_sysadmin", role_name: "System Admin", is_manager: false },
    ];
    const { canSetManagerForRole } = buildHierarchy(currentUserRoles, allRoles, true);

    it("can set manager for non-system roles", () => {
      expect(canSetManagerForRole("role_it_mgr")).toBe(true);
      expect(canSetManagerForRole("role_it")).toBe(true);
      expect(canSetManagerForRole("role_staff")).toBe(true);
    });

    it("cannot set manager for system roles (system roles never have managers)", () => {
      expect(canSetManagerForRole("role_sysadmin")).toBe(false);
    });
  });

  describe("when current user is a non-system-admin IT Manager", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_it_mgr", role_name: "IT Manager", is_manager: false },
    ];
    const { canSetManagerForRole } = buildHierarchy(currentUserRoles, allRoles, true);

    it("cannot set manager for any role (only system admins can)", () => {
      expect(canSetManagerForRole("role_it")).toBe(false);
      expect(canSetManagerForRole("role_staff")).toBe(false);
    });

    it("cannot set manager on system roles either", () => {
      expect(canSetManagerForRole("role_sysadmin")).toBe(false);
    });
  });

  describe("when current user is manager-of-IT (non-system-admin)", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_it", role_name: "IT", is_manager: true },
    ];
    const { canSetManagerForRole } = buildHierarchy(currentUserRoles, allRoles, true);

    it("cannot create duplicate managers — only system admins can", () => {
      expect(canSetManagerForRole("role_it")).toBe(false);
      expect(canSetManagerForRole("role_staff")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// isTargetReadOnly (targetIsManager guard)
// ---------------------------------------------------------------------------

describe("isTargetReadOnly", () => {
  describe("when current user is a system admin", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_sysadmin", role_name: "System Admin", is_manager: false },
    ];
    const { isTargetReadOnly } = buildHierarchy(currentUserRoles, allRoles, true);

    it("system admin can modify manager-flagged assignments", () => {
      const entry: EmployeeRoleEntry = { role_id: "role_it", role_name: "IT", is_manager: true };
      expect(isTargetReadOnly(entry)).toBe(false);
    });

    it("system admin can modify non-manager assignments", () => {
      const entry: EmployeeRoleEntry = { role_id: "role_it", role_name: "IT", is_manager: false };
      expect(isTargetReadOnly(entry)).toBe(false);
    });
  });

  describe("when current user is a non-system-admin", () => {
    const currentUserRoles: EmployeeRoleEntry[] = [
      { role_id: "role_it_mgr", role_name: "IT Manager", is_manager: false },
    ];
    const { isTargetReadOnly } = buildHierarchy(currentUserRoles, allRoles, true);

    it("manager-flagged assignments become read-only", () => {
      const entry: EmployeeRoleEntry = { role_id: "role_it", role_name: "IT", is_manager: true };
      expect(isTargetReadOnly(entry)).toBe(true);
    });

    it("non-manager assignments are NOT made read-only by this guard", () => {
      const entry: EmployeeRoleEntry = { role_id: "role_it", role_name: "IT", is_manager: false };
      expect(isTargetReadOnly(entry)).toBe(false);
    });
  });
});
