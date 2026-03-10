import { z } from 'zod';

// Project schemas
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  project_manager: z.string().optional(),
  sales_manager: z.string().optional(),
  discount_pct: z.number().min(0).max(100),
  discount_reason: z.string().optional(),
  client: z.string().optional(),
});

export const projectMemberSchema = z.object({
  user_id: z.string().uuid(),
  bill_rate_usd: z.number().min(0),
  member_discount_pct: z.number().min(0).max(100).optional(),
  role: z.string().optional(),
});

// Employee schemas
export const employeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required'),
  location: z.enum(['US', 'IN', 'VN', 'SGP']),
  cost_annual: z.number().min(0, 'Cost must be non-negative').optional(),
  currency_code: z.enum(['USD', 'INR', 'VND', 'SGD']).default('USD'),
  margin_pct: z.number().min(0).max(100).default(30),
});

export type ProjectFormData = z.infer<typeof projectSchema>;
export type ProjectMemberFormData = z.infer<typeof projectMemberSchema>;
export type EmployeeFormData = z.infer<typeof employeeSchema>;