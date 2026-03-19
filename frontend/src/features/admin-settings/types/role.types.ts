// ---------------------------------------------------------------------------
// Core types — mirror backend schemas/roles.py
// ---------------------------------------------------------------------------

export interface EntraGroupMapping {
  id: string;
  entra_group_id: string;
  entra_group_name: string;
  role_id: string;
  created_at: string | null;
}

export interface CreateEntraGroupMappingInput {
  entra_group_id: string;
  entra_group_name: string;
  role_id: string;
}

export interface Permission {
  module: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  /** Hierarchy position — lower value = higher authority; system roles are always 0 */
  sort_order: number;
  /** Department values from config_dropdowns that trigger auto-assignment */
  auto_assign_departments: string[];
  dashboard_config: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  /** Additive permissions granted to employees assigned this role with is_manager=true */
  manager_permissions: Permission[];
}

export interface RoleAssignment {
  employee_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  is_manager: boolean;
  manager_permissions: Permission[];
}

// ---------------------------------------------------------------------------
// Write types
// ---------------------------------------------------------------------------

export interface CreateRoleInput {
  name: string;
  description?: string | undefined;
  auto_assign_departments?: string[];
  dashboard_config?: Record<string, unknown>;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | undefined;
  auto_assign_departments?: string[];
  dashboard_config?: Record<string, unknown>;
}

export interface SetPermissionsInput {
  permissions: Permission[];
}

export interface AssignRoleInput {
  employee_id: string;
  is_manager?: boolean;
  manager_permissions?: Permission[];
}

export interface UpdateAssignmentInput {
  is_manager: boolean;
  manager_permissions: Permission[];
}

// ---------------------------------------------------------------------------
// Well-known permission constants (mirrors _VALID_PERMISSIONS in role_service.py)
// ---------------------------------------------------------------------------

export const VERB_PERMISSIONS: Permission[] = [
  // Module visibility
  { module: "employees", action: "view_module" },
  { module: "assets", action: "view_module" },
  { module: "intake", action: "view_module" },
  { module: "onboarding", action: "view_module" },
  { module: "offboarding", action: "view_module" },
  { module: "admin", action: "view_module" },
  { module: "project_management", action: "view_module" },
  { module: "audit", action: "view_module" },
  { module: "timesheets", action: "view_module" },
  { module: "productivity", action: "view_module" },
  { module: "ats", action: "view_module" },
  // Employees
  { module: "employees", action: "create_employee" },
  { module: "employees", action: "archive_employee" },
  { module: "employees", action: "edit_employee" },
  { module: "employees", action: "manage_attachments" },
  { module: "employees", action: "edit_project_history" },
  { module: "employees", action: "access_employee_admin_mode" },
  { module: "employees", action: "export_employees" },
  // Assets
  { module: "assets", action: "create_asset" },
  { module: "assets", action: "assign_asset" },
  { module: "assets", action: "retire_asset" },
  { module: "assets", action: "edit_asset_metadata" },
  { module: "assets", action: "view_asset_valuation" },
  { module: "assets", action: "access_asset_edit_mode" },
  // Intake
  { module: "intake", action: "create_requisition" },
  { module: "intake", action: "approve_requisition" },
  { module: "intake", action: "edit_requisition" },
  // Onboarding
  { module: "onboarding", action: "manage_onboarding" },
  // Offboarding
  { module: "offboarding", action: "manage_offboarding" },
  { module: "offboarding", action: "initiate_offboarding" },
  { module: "offboarding", action: "complete_tasks" },
  { module: "offboarding", action: "reassign_tasks" },
  // Project Management
  { module: "project_management", action: "create_project" },
  { module: "project_management", action: "edit_project" },
  { module: "project_management", action: "manage_members" },
  { module: "project_management", action: "archive_project" },
  // Audit & Logging
  { module: "audit", action: "view_audit_logs" },
  { module: "audit", action: "export_audit_logs" },
  // Timesheets
  { module: "timesheets", action: "submit_timesheet" },
  { module: "timesheets", action: "approve_timesheet" },
  { module: "timesheets", action: "edit_timesheet" },
  { module: "timesheets", action: "export_timesheets" },
  // Productivity
  { module: "productivity", action: "view_reports" },
  { module: "productivity", action: "manage_goals" },
  { module: "productivity", action: "export_reports" },
  // ATS (Applicant Tracking)
  { module: "ats", action: "create_candidate" },
  { module: "ats", action: "manage_interviews" },
  { module: "ats", action: "make_hiring_decisions" },
  { module: "ats", action: "manage_job_postings" },
  // Admin (sub-modules)
  { module: "admin", action: "manage_roles" },
  { module: "admin", action: "manage_dropdowns" },
  { module: "admin", action: "manage_skills" },
  { module: "admin", action: "manage_notifications" },
  { module: "admin", action: "assign_roles" },
  { module: "admin", action: "manage_entra_sync" },
];

export const NOUN_PERMISSIONS: Permission[] = [
  { module: "visibility", action: "reveal_pii" },
  { module: "visibility", action: "reveal_financials" },
  { module: "visibility", action: "reveal_audit_trails" },
];

/** Formats a raw permission key (snake_case) into Title Case with spaces. */
export function formatPermissionLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Human-readable labels for permission modules
export const MODULE_LABELS: Record<string, string> = {
  employees: "Employees",
  assets: "Assets",
  intake: "Intake",
  onboarding: "Onboarding",
  offboarding: "Offboarding",
  project_management: "Project Management",
  audit: "Audit & Logging",
  timesheets: "Timesheets",
  productivity: "Productivity",
  ats: "ATS (Applicant Tracking)",
  admin: "Administration",
  visibility: "Visibility",
};

// Human-readable labels for permission actions
export const ACTION_LABELS: Record<string, string> = {
  view_module: "View Module",
  // Employees
  create_employee: "Create Employee",
  archive_employee: "Archive Employee",
  edit_employee: "Edit Employee",
  manage_attachments: "Manage Attachments",
  edit_project_history: "Edit Project History",
  access_employee_admin_mode: "Admin Mode",
  export_employees: "Export Employees",
  // Assets
  create_asset: "Create Asset",
  assign_asset: "Assign Asset",
  retire_asset: "Retire Asset",
  edit_asset_metadata: "Edit Metadata",
  view_asset_valuation: "View Valuation",
  access_asset_edit_mode: "Edit Mode",
  // Intake
  create_requisition: "Create Requisition",
  approve_requisition: "Approve Requisition",
  edit_requisition: "Edit Requisition",
  // Onboarding
  manage_onboarding: "Manage Onboarding",
  // Offboarding
  manage_offboarding: "Manage Offboarding",
  initiate_offboarding: "Initiate Offboarding",
  complete_tasks: "Complete Tasks",
  reassign_tasks: "Reassign Tasks",
  // Project Management
  create_project: "Create Project",
  edit_project: "Edit Project",
  manage_members: "Manage Members",
  archive_project: "Archive Project",
  // Audit & Logging
  view_audit_logs: "View Audit Logs",
  export_audit_logs: "Export Audit Logs",
  // Timesheets
  submit_timesheet: "Submit Timesheet",
  approve_timesheet: "Approve Timesheet",
  edit_timesheet: "Edit Timesheet",
  export_timesheets: "Export Timesheets",
  // Productivity
  view_reports: "View Reports",
  manage_goals: "Manage Goals",
  export_reports: "Export Reports",
  // ATS
  create_candidate: "Create Candidate",
  manage_interviews: "Manage Interviews",
  make_hiring_decisions: "Hiring Decisions",
  manage_job_postings: "Manage Job Postings",
  // Admin
  manage_roles: "Manage Roles",
  manage_dropdowns: "Manage Dropdowns",
  manage_skills: "Manage Skills",
  manage_notifications: "Manage Notifications",
  assign_roles: "Assign Roles",
  manage_entra_sync: "Manage Entra Sync",
  // Visibility
  reveal_pii: "Reveal PII",
  reveal_financials: "Reveal Financials",
  reveal_audit_trails: "Reveal Audit Trails",
};
