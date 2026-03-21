export interface NavChild {
  label: string;
  path: string;
  comingSoon?: boolean;
}

export interface NavItem {
  label: string;
  path: string;
  children?: NavChild[];
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard" },
  {
    label: "Employees",
    path: "/employees",
    children: [
      { label: "Employee Directory", path: "/employees" },
      { label: "Offboarding Hub", path: "/employees/offboarding" },
    ],
  },
  { label: "Assets", path: "/assets", comingSoon: true },
  { label: "Intake", path: "/intake", comingSoon: true },
  { label: "Onboarding", path: "/onboarding", comingSoon: true },
  { label: "Projects", path: "/projects", comingSoon: true },
  { label: "Timesheets", path: "/timesheets", comingSoon: true },
  {
    label: "Test Modules",
    path: "/test-nodes",
    children: [
      { label: "Templates", path: "/test-nodes" },
      { label: "New Template", path: "/test-nodes/new" },
    ],
  },
  {
    label: "Admin Settings",
    path: "/admin-settings",
    children: [
      { label: "Dropdown Settings", path: "/admin-settings/dropdowns" },
      { label: "Skill Management", path: "/admin-settings/skills" },
      { label: "Roles & Permissions", path: "/admin-settings/roles" },
      { label: "Entra Sync", path: "/admin-settings/entra-sync" },
      { label: "Notifications", path: "/admin-settings/notifications" },
      { label: "Audit Settings", path: "/admin-settings/audit", comingSoon: true },
      { label: "System Security", path: "/admin-settings/security", comingSoon: true },
    ],
  },
];
