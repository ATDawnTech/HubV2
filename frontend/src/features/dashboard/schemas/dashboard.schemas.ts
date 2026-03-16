import { z } from "zod";

export const moduleSummarySchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  pending_count: z.number().int().min(0),
});

export const dashboardTaskSchema = z.object({
  task_id: z.string(),
  module: z.string(),
  title: z.string(),
  source_record_id: z.string(),
  assigned_to_id: z.string().nullable(),
  deadline: z.string().nullable(),
  status: z.enum(["open", "completed"]),
  completed_at: z.string().nullable(),
});
