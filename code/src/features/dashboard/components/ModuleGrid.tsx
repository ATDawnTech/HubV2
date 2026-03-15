import { Link } from "react-router-dom";
import type { ModuleSummary } from "../types/dashboard.types";

interface ModuleGridProps {
  modules: ModuleSummary[];
}

/** Backend returns "/admin" but the frontend route is "/admin-settings". */
const PATH_OVERRIDES: Record<string, string> = {
  "/admin": "/admin-settings",
};

export function ModuleGrid({ modules }: ModuleGridProps) {
  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No modules available.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {modules.map((mod) => (
        <Link
          key={mod.id}
          to={PATH_OVERRIDES[mod.path] ?? mod.path}
          className="group flex flex-col items-start rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:bg-primary hover:shadow-md"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground group-hover:text-primary-foreground">
            {mod.id}
          </span>
          <span className="mt-1 text-sm font-semibold text-card-foreground group-hover:text-primary-foreground">
            {mod.label}
          </span>
          {mod.pending_count > 0 && (
            <span className="mt-2 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground">
              {mod.pending_count} pending
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
