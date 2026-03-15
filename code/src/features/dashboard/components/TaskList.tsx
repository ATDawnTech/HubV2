import type { DashboardTask } from "../types/dashboard.types";

interface TaskListProps {
  tasks: DashboardTask[];
  onComplete: (taskId: string) => void;
  isCompleting: boolean;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline";
  return new Date(deadline).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

export function TaskList({
  tasks,
  onComplete,
  isCompleting,
  hasNextPage,
  hasPrevPage,
  onNextPage,
  onPrevPage,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">You have no open tasks.</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {tasks.map((task) => (
          <li key={task.task_id} className="flex items-start justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent/30">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-card-foreground">
                {task.title}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {task.module}
                </span>
                <span
                  className={`text-xs ${
                    isOverdue(task.deadline)
                      ? "font-medium text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatDeadline(task.deadline)}
                </span>
              </div>
            </div>
            <button
              onClick={() => onComplete(task.task_id)}
              disabled={isCompleting}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Complete
            </button>
          </li>
        ))}
      </ul>

      {(hasPrevPage || hasNextPage) && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onPrevPage}
            disabled={!hasPrevPage}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
