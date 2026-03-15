import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ModuleGrid } from "../components/ModuleGrid";
import { TaskList } from "../components/TaskList";
import { useCompleteTask } from "../hooks/useCompleteTask";
import { useDashboardModules } from "../hooks/useDashboardModules";
import { useDashboardTasks } from "../hooks/useDashboardTasks";

/** Module id → permission module name for view_module gating. */
const MODULE_PERMISSION_MAP: Record<string, string> = {
  employees: "employees",
  assets: "assets",
  intake: "intake",
  onboarding: "onboarding",
  offboarding: "offboarding",
  admin: "admin",
  projects: "project_management",
  audit: "audit",
  timesheets: "timesheets",
  productivity: "productivity",
  ats: "ats",
};

export function DashboardPage(): JSX.Element {
  const { token, isLoading: authLoading, error: authError } = useAuth();
  const isAuthenticated = Boolean(token);
  const { hasPermission, isLoading: permsLoading } = usePermissions();

  const modules = useDashboardModules({ enabled: isAuthenticated });
  const tasks = useDashboardTasks({ enabled: isAuthenticated });
  const completeTask = useCompleteTask();

  if (authLoading) {
    return <LoadingSpinner message="Authenticating…" />;
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorMessage message={authError} />
      </div>
    );
  }

  // Filter module cards by view_module permission
  const visibleModules = (modules.data ?? []).filter((mod) => {
    if (permsLoading) return true;
    const permModule = MODULE_PERMISSION_MAP[mod.id];
    if (!permModule) return true;
    return hasPermission(permModule, "view_module");
  });

  return (
    <main className="px-8 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Hub Dashboard</h1>

      {/* Task list */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          My Tasks
        </h2>

        {tasks.isLoading && <LoadingSpinner message="Loading tasks…" />}
        {tasks.isError && (
          <ErrorMessage
            message="Could not load your tasks."
            onRetry={() => tasks.refetch()}
          />
        )}
        {tasks.data && (
          <TaskList
            tasks={tasks.data.tasks}
            onComplete={(taskId) => completeTask.mutate(taskId)}
            isCompleting={completeTask.isPending}
            hasNextPage={tasks.hasNextPage}
            hasPrevPage={tasks.hasPrevPage}
            onNextPage={tasks.goToNextPage}
            onPrevPage={tasks.goToPrevPage}
          />
        )}
      </section>

      {/* Module summary grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Modules
        </h2>

        {modules.isLoading && <LoadingSpinner message="Loading modules…" />}
        {modules.isError && (
          <ErrorMessage
            message="Could not load module summaries."
            onRetry={() => modules.refetch()}
          />
        )}
        {modules.data && <ModuleGrid modules={visibleModules} />}
      </section>
    </main>
  );
}
