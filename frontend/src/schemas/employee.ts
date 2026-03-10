import { z } from 'zod';

// Employee record schema
export const employeeRecordSchema = z.object({
  employee_code: z.string().optional(),
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address').refine(
    (email) => email.endsWith('@atdawntech.com'),
    'Email must be from @atdawntech.com domain'
  ),
  job_title: z.string().optional(),
  department: z.string().optional(),
  location: z.enum(['US', 'IN', 'VN', 'SGP']).default('IN'),
  manager_id: z.string().uuid().optional(),
  joined_on: z.string().optional(),
  is_active: z.boolean().default(true),
});

// Skill schema
export const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  category: z.string().optional(),
});

// Employee skill schema
export const employeeSkillSchema = z.object({
  skill_id: z.string().uuid(),
  level: z.number().min(0).max(9),
  years: z.number().min(0).optional(),
});

// Certification schema
export const certificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  authority: z.string().optional(),
  credential_id: z.string().optional(),
  issued_on: z.string().optional(),
  expires_on: z.string().optional(),
});

// Bulk upload schema
export const bulkUploadSchema = z.object({
  employees: z.array(employeeRecordSchema),
});

export type EmployeeRecord = z.infer<typeof employeeRecordSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type EmployeeSkill = z.infer<typeof employeeSkillSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type BulkUpload = z.infer<typeof bulkUploadSchema>;