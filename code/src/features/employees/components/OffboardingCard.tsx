import { useState } from "react";
import { Link } from "react-router-dom";
import type { OffboardingEmployee, OffboardingTask } from "../types/employee.types";
import { useCompleteOffboardingTask } from "../hooks/useCompleteOffboardingTask";
import { useReassignOffboardingTask } from "../hooks/useReassignOffboardingTask";

const TASK_LABELS: Record<string, string> = {
  email_decommission: "Work Email Decommissioned",
  project_migration: "Project History Migrated",
  asset_retrieval: "Assets Retrieved",
  system_account_removal: "System Accounts Removed",
};

const GROUP_LABELS: Record<string, string> = {
  it: "IT",
  manager: "Manager",
  hr: "HR",
};

function DeadlineBadge({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const hoursLeft = (due.getTime() - now.getTime()) / 1000 / 3600;
  const overdue = hoursLeft < 0;
  const urgent = !overdue && hoursLeft <= 24;

  const label = overdue
    ? "Overdue"
    : hoursLeft < 1
    ? "< 1 hr left"
    : hoursLeft < 24
    ? `${Math.round(hoursLeft)}h left`
    : due.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        overdue
          ? "bg-destructive/10 text-destructive"
          : urgent
          ? "bg-yellow-100 text-yellow-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

function TaskRow({ task, employeeId }: { task: OffboardingTask; employeeId: string }) {
  const complete = useCompleteOffboardingTask(employeeId);
  const reassign = useReassignOffboardingTask(employeeId);
  const [showReassign, setShowReassign] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState(task.assignee_id ?? "");

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${task.status === "completed" ? "bg-green-500" : "bg-muted-foreground"}`} />
          <div>
            <p className="text-sm font-medium text-card-foreground">
              {TASK_LABELS[task.task_type] ?? task.task_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {GROUP_LABELS[task.assigned_group] ?? task.assigned_group} team
              {task.assignee_id && ` · Assigned: ${task.assignee_id}`}
              {task.completed_by && ` · Signed off`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.status !== "completed" && <DeadlineBadge dueAt={task.due_at} />}
          {task.status !== "completed" && (
            <button
              onClick={() => setShowReassign((v) => !v)}
              className="rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
            >
              Reassign
            </button>
          )}
          {task.status !== "completed" && (
            <button
              onClick={() => complete.mutate(task.id)}
              disabled={complete.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {complete.isPending ? "Saving…" : "Sign Off"}
            </button>
          )}
          {task.status === "completed" && (
            <span className="text-xs font-medium text-green-600">Completed</span>
          )}
        </div>
      </div>
      {showReassign && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2">
          <input
            type="text"
            placeholder="Assignee employee ID (e.g. emp_abc123)"
            value={assigneeInput}
            onChange={(e) => setAssigneeInput(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => {
              reassign.mutate(
                { taskId: task.id, assigneeId: assigneeInput.trim() || null },
                { onSuccess: () => setShowReassign(false) },
              );
            }}
            disabled={reassign.isPending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {reassign.isPending ? "Saving…" : "Confirm"}
          </button>
          <button
            onClick={() => setShowReassign(false)}
            className="rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function OffboardingCard({ item }: { item: OffboardingEmployee }) {
  const [expanded, setExpanded] = useState(true);
  const { employee, tasks } = item;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-accent/30"
      >
        <div>
          <div className="flex items-center gap-2">
            <Link
              to={`/employees/${employee.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-card-foreground hover:text-primary"
            >
              {employee.first_name} {employee.last_name}
            </Link>
            {employee.employee_code && (
              <span className="font-mono text-xs text-muted-foreground">{employee.employee_code}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{employee.work_email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{completedCount}/{tasks.length} tasks</span>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(completedCount / tasks.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-border px-5 py-4">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} employeeId={employee.id} />
          ))}
        </div>
      )}
    </div>
  );
}
