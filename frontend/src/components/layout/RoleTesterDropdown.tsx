import { cn } from "@/lib/cn";
import type { Role } from "@/features/admin-settings/types/role.types";

interface Props {
  roles: Role[];
  selection: Set<string>;
  managerIds: Set<string>;
  isDirty: boolean;
  isApplying: boolean;
  isStopping: boolean;
  employeeId: string | null;
  onToggleRole: (id: string) => void;
  onToggleManager: (id: string) => void;
  onApplyRoles: () => void;
  onStopTesting: () => void;
}

export function RoleTesterDropdown({
  roles, selection, managerIds, isDirty, isApplying, isStopping,
  employeeId, onToggleRole, onToggleManager, onApplyRoles, onStopTesting,
}: Props): JSX.Element {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-amber-400/30 bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-foreground">Role Tester</p>
          <p className="text-[11px] text-muted-foreground">
            Testing as <span className="font-mono">{employeeId}</span>
          </p>
        </div>
        <button
          onClick={onStopTesting}
          disabled={isStopping}
          className="rounded-md border border-destructive/30 px-2.5 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          {isStopping ? "Stopping…" : "Stop Testing"}
        </button>
      </div>

      <div className="px-3 py-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Active Roles
        </p>
        <div className="space-y-1">
          {roles.length === 0 && (
            <p className="text-xs text-muted-foreground">Loading roles…</p>
          )}
          {roles.map((role) => {
            const checked = selection.has(role.id);
            const isManager = managerIds.has(role.id);
            return (
              <div key={role.id} className="space-y-1">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-xs transition-colors",
                    checked
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-muted/50",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => onToggleRole(role.id)}
                  />
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border text-[9px]",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {checked && "✓"}
                  </span>
                  <span className="font-medium">{role.name}</span>
                  {role.is_system && (
                    <span className="ml-auto text-[10px] text-muted-foreground">system</span>
                  )}
                </label>
                {checked && !role.is_system && (
                  <button
                    type="button"
                    onClick={() => onToggleManager(role.id)}
                    className={cn(
                      "ml-6 flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors",
                      isManager
                        ? "border-yellow-400/50 bg-yellow-400/15 text-yellow-600 dark:text-yellow-400"
                        : "border-border text-muted-foreground hover:border-yellow-400/50 hover:text-yellow-600",
                    )}
                  >
                    <span>{isManager ? "★" : "☆"}</span>
                    {isManager ? "Manager" : "Set as Manager"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border px-3 py-3">
        <button
          onClick={onApplyRoles}
          disabled={isApplying || !isDirty}
          className={cn(
            "w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors",
            isApplying || !isDirty ? "cursor-not-allowed opacity-50" : "hover:bg-primary/90",
          )}
        >
          {isApplying
            ? "Applying…"
            : isDirty
              ? `Apply Changes (${selection.size} role${selection.size !== 1 ? "s" : ""})`
              : `${selection.size} role${selection.size !== 1 ? "s" : ""} active — no changes`}
        </button>
      </div>
    </div>
  );
}
