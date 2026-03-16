export interface Area {
  key: string;
  label: string;
  module: string;
  category: string;
}

export interface AreaGroup {
  groupLabel: string;
  areas: Area[];
}

export const AREA_GROUPS: AreaGroup[] = [
  {
    groupLabel: "Global",
    areas: [
      { key: "location",  label: "Locations",  module: "global", category: "location" },
      { key: "work_mode", label: "Work Modes", module: "global", category: "work_mode" },
      { key: "hire_type", label: "Hire Types",  module: "global", category: "hire_type" },
    ],
  },
  {
    groupLabel: "Employees",
    areas: [
      { key: "department", label: "Departments", module: "employees", category: "department" },
    ],
  },
  {
    groupLabel: "Intake",
    areas: [
      { key: "req_status", label: "Requisition Statuses",  module: "intake", category: "requisition_status" },
      { key: "hire_for",   label: "Type of Hire",          module: "intake", category: "hire_for" },
      { key: "int_dept",   label: "Department / Function", module: "intake", category: "department_function" },
      { key: "currency",   label: "Currency",              module: "intake", category: "currency" },
    ],
  },
  {
    groupLabel: "Onboarding",
    areas: [
      { key: "task_cat",   label: "Task Categories",     module: "onboarding", category: "task_category" },
      { key: "prov_stage", label: "Provisioning Stages", module: "onboarding", category: "provisioning_stage" },
    ],
  },
  {
    groupLabel: "Assets",
    areas: [
      { key: "item_type",    label: "Asset Item Types", module: "assets", category: "item_type" },
      { key: "asset_status", label: "Asset Statuses",   module: "assets", category: "asset_status" },
      { key: "manufacturer", label: "Manufacturers",    module: "assets", category: "manufacturer" },
      { key: "condition",    label: "Conditions",       module: "assets", category: "condition" },
    ],
  },
  {
    groupLabel: "Audit & Logging",
    areas: [
      { key: "event_sev", label: "Event Severities", module: "audit", category: "event_severity" },
      { key: "log_cat",   label: "Log Categories",   module: "audit", category: "log_category" },
    ],
  },
];
