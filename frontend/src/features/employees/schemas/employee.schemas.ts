import { z } from "zod";

export const employeeSchema = z.object({
  id: z.string(),
  employee_code: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string(),
  work_email: z.string(),
  job_title: z.string().nullable(),
  department: z.string().nullable(),
  manager_id: z.string().nullable(),
  hire_date: z.string().nullable(),
  hire_type: z.string().nullable(),
  work_mode: z.string().nullable(),
  status: z.string(),
  location: z.string().nullable(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const offboardingTaskSchema = z.object({
  id: z.string(),
  employee_id: z.string(),
  task_type: z.string(),
  assigned_group: z.string(),
  assignee_id: z.string().nullable(),
  status: z.string(),
  due_at: z.string().nullable(),
  completed_by: z.string().nullable(),
  completed_at: z.string().nullable(),
  sign_off_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const offboardingEmployeeSchema = z.object({
  employee: employeeSchema,
  tasks: z.array(offboardingTaskSchema),
});

const emptyToUndefined = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

// Spec 2.2 mandatory: Name, Dept, Location, Hire Type, Work Mode
// Optional: Job Title, Manager, Hire Date
export const createEmployeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  work_email: z
    .string()
    .email("Must be a valid email")
    .refine((v) => v.toLowerCase().endsWith("@atdawntech.com"), {
      message: "Email must be an @AtDawnTech.com address",
    }),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  hire_type: z.string().min(1, "Hire type is required"),
  work_mode: z.string().min(1, "Work mode is required"),
  job_title: emptyToUndefined,
  manager_id: emptyToUndefined,
  hire_date: emptyToUndefined,
  status: z.enum(["new_onboard", "active"]).default("active"),
});

export const updateEmployeeSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  job_title: z.string().optional(),
  department: z.string().optional(),
  manager_id: z.string().optional(),
  hire_date: z.string().optional(),
  hire_type: z.string().optional(),
  work_mode: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["new_onboard", "active", "archiving", "archived"]).optional(),
});

export type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeSchema>;
