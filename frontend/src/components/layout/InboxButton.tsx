import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useDashboardTasks } from "@/features/dashboard/hooks/useDashboardTasks";
import { useCompleteTask } from "@/features/dashboard/hooks/useCompleteTask";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardTask } from "@/features/dashboard/types/dashboard.types";

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "";
  return new Date(deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function TaskRow({ task, onComplete, isCompleting }: {
  task: DashboardTask;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}) {
  const overdue = isOverdue(task.deadline);
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{task.module}</span>
          {task.deadline && (
            <span className={cn("text-[10px]", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
              {formatDeadline(task.deadline)}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onComplete(task.task_id)}
        disabled={isCompleting}
        className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Done
      </button>
    </li>
  );
}

export function InboxButton(): JSX.Element {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const tasks = useDashboardTasks({ enabled: !!token });
  const completeTask = useCompleteTask();

  const taskList = tasks.data?.tasks ?? [];
  const count = taskList.length;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open task inbox"
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
          open
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
        )}
      >
        {/* Inbox icon */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My Tasks</span>
            {count > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {count} open
              </span>
            )}
          </div>

          {tasks.isLoading && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</p>
          )}

          {!tasks.isLoading && count === 0 && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">No open tasks.</p>
          )}

          {count > 0 && (
            <>
              <ul className="max-h-72 divide-y divide-border overflow-y-auto">
                {taskList.map((task) => (
                  <TaskRow
                    key={task.task_id}
                    task={task}
                    onComplete={(id) => completeTask.mutate(id)}
                    isCompleting={completeTask.isPending}
                  />
                ))}
              </ul>
              {(tasks.hasPrevPage || tasks.hasNextPage) && (
                <div className="flex justify-end gap-2 border-t border-border px-4 py-2">
                  <button
                    onClick={tasks.goToPrevPage}
                    disabled={!tasks.hasPrevPage}
                    className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={tasks.goToNextPage}
                    disabled={!tasks.hasNextPage}
                    className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
