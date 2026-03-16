export interface EmployeeRoleEntry {
  role_id: string;
  role_name: string;
  is_manager: boolean;
  assigned_at: string | null;
}

export interface Employee {
  id: string;
  employee_code: string | null;
  first_name: string;
  last_name: string;
  work_email: string;
  job_title: string | null;
  department: string | null;
  manager_id: string | null;
  hire_date: string | null;
  hire_type: string | null;
  work_mode: string | null;
  status: string;
  location: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OffboardingTask {
  id: string;
  employee_id: string;
  task_type: string;
  assigned_group: string;
  assignee_id: string | null;
  status: string;
  due_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  sign_off_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OffboardingEmployee {
  employee: Employee;
  tasks: OffboardingTask[];
}

export interface CreateEmployeeInput {
  first_name: string;
  last_name: string;
  work_email: string;
  job_title?: string | undefined;
  department?: string | undefined;
  manager_id?: string | undefined;
  hire_date?: string | undefined;
  hire_type?: string | undefined;
  work_mode?: string | undefined;
  location?: string | undefined;
  status?: string | undefined;
}

export interface UpdateEmployeeInput {
  first_name?: string | undefined;
  last_name?: string | undefined;
  job_title?: string | undefined;
  department?: string | undefined;
  manager_id?: string | undefined;
  hire_date?: string | undefined;
  hire_type?: string | undefined;
  work_mode?: string | undefined;
  location?: string | undefined;
  status?: string | undefined;
}

export interface EmployeeListParams {
  cursor?: string | undefined;
  q?: string | undefined;
  status?: string[] | undefined;
  department?: string[] | undefined;
  location?: string[] | undefined;
  hire_type?: string[] | undefined;
  work_mode?: string[] | undefined;
  job_title?: string | undefined;
  hire_date_from?: string | undefined;
  hire_date_to?: string | undefined;
  limit?: number | undefined;
}
