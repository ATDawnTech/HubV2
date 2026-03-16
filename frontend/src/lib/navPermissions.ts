interface NavPermissionRule {
  /** Require a specific (module, action) pair. */
  permission?: { module: string; action: string };
  /** Require any permission within this module. */
  anyInModule?: string;
}

/**
 * Map from nav item path prefix to permission requirement.
 * Items not listed here are visible to everyone.
 */
export const NAV_PERMISSION_MAP: Record<string, NavPermissionRule> = {
  "/employees": { permission: { module: "employees", action: "view_module" } },
  "/employees/offboarding": { permission: { module: "offboarding", action: "view_module" } },
  "/assets": { permission: { module: "assets", action: "view_module" } },
  "/intake": { permission: { module: "intake", action: "view_module" } },
  "/onboarding": { permission: { module: "onboarding", action: "view_module" } },
  "/projects": { permission: { module: "project_management", action: "view_module" } },
  "/timesheets": { permission: { module: "timesheets", action: "view_module" } },
  "/admin-settings": { permission: { module: "admin", action: "view_module" } },
};
