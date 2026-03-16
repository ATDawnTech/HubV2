export interface DropdownOption {
  id: string;
  module: string;
  category: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateDropdownInput {
  module: string;
  category: string;
  value: string;
  sort_order?: number;
}

export interface UpdateDropdownInput {
  value?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReassignEmployeesInput {
  module: string;
  category: string;
  from_value: string;
  to_value: string;
}

/** Well-known module identifiers (Epic 3.1) */
export type DropdownModule =
  | "global"
  | "employees"
  | "intake"
  | "onboarding"
  | "assets"
  | "audit";

/** Well-known category identifiers within each module */
export type DropdownCategory =
  // global
  | "location"
  // employees
  | "department"
  | "hire_type"
  | "work_mode"
  | "role_level"
  // intake
  | "requisition_status"
  | "reason_for_hire"
  | "hiring_priority"
  // onboarding
  | "task_category"
  | "provisioning_stage"
  // assets
  | "item_type"
  | "asset_status"
  | "manufacturer"
  | "condition"
  // audit
  | "event_severity"
  | "log_category";
