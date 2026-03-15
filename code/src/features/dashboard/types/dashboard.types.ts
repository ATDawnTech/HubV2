export interface ModuleSummary {
  id: string;
  label: string;
  path: string;
  pending_count: number;
}

export interface DashboardTask {
  task_id: string;
  module: string;
  title: string;
  source_record_id: string;
  assigned_to_id: string | null;
  deadline: string | null; // ISO-8601 datetime string
  status: "open" | "completed";
  completed_at: string | null;
}
