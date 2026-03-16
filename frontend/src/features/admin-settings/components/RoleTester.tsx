import { cn } from "@/lib/cn";
import { useRoleTester } from "../hooks/useRoleTester";
import { EffectivePermissionsGrid } from "./EffectivePermissionsGrid";

export function RoleTester(): JSX.Element {
  const rt = useRoleTester();

  if (!rt.employeeId) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No employee ID available. Sign in to test role assignments.
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-dashed border-primary/30 bg-primary/[0.02] p-5">
      {rt.impersonation.isImpersonating && (
        <div className="flex items-center justify-between rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">TEST MODE</span>
            <span className="text-sm text-foreground">Acting as <span className="font-mono font-medium">{rt.employeeId}</span></span>
            <span className="text-xs text-muted-foreground">(real identity: {rt.impersonation.originalEmployeeId})</span>
          </div>
          <button type="button" onClick={rt.impersonation.stopImpersonation}
            className="rounded-md border border-amber-500/30 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-amber-500/10">
            Stop Testing
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary">Role Tester</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Select roles to preview their combined permissions, then apply them all at once.</p>
        </div>
        {!rt.impersonation.isImpersonating && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono">{rt.employeeId}</span>
            <button type="button" onClick={rt.handleStartTestUser} disabled={rt.isSwitching}
              className={cn("rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors", rt.isSwitching ? "cursor-not-allowed opacity-50" : "hover:bg-primary/10")}>
              {rt.isSwitching ? "Switching..." : "Use Test User"}
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Select Roles</p>
          {!rt.impersonation.isImpersonating && <span className="text-[10px] text-amber-600 dark:text-amber-400">Switch to test user first</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {rt.roles.map((role) => {
            const checked = rt.selectedRoleIds.has(role.id);
            const assigned = rt.assignedRoleIds.has(role.id);
            const isManager = rt.managerRoleIds.has(role.id);
            const disabled = rt.isBusy || !rt.impersonation.isImpersonating;
            return (
              <div key={role.id} className="flex flex-col gap-1">
                <label className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                  disabled ? "cursor-not-allowed opacity-50"
                    : checked ? "cursor-pointer border-primary/40 bg-primary/10 text-primary"
                    : "cursor-pointer border-border bg-card text-foreground hover:bg-muted/50")}>
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => rt.toggleRole(role.id)} disabled={disabled} />
                  <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px]",
                    checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>
                    {checked && "✓"}
                  </span>
                  <span className="font-medium">{role.name}</span>
                  {role.is_system && <span className="text-[10px] text-muted-foreground">(system)</span>}
                  {rt.impersonation.isImpersonating && assigned && (
                    <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">active</span>
                  )}
                </label>
                {checked && !role.is_system && (
                  <button
                    type="button"
                    onClick={() => rt.toggleManagerRole(role.id)}
                    disabled={disabled}
                    className={cn(
                      "ml-1 flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors",
                      disabled ? "cursor-not-allowed opacity-50" :
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

      <div className="flex items-center gap-2">
        <button type="button" onClick={rt.handleApplySelected} disabled={!rt.canApply}
          className={cn("rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-colors",
            !rt.canApply ? "cursor-not-allowed opacity-50" : "hover:bg-primary/90")}>
          {rt.isApplying ? "Applying..." : `Apply ${rt.selectedRoleIds.size} Role${rt.selectedRoleIds.size !== 1 ? "s" : ""}`}
        </button>
        {rt.impersonation.isImpersonating && rt.assignedRoleIds.size > 0 && (
          <button type="button" onClick={rt.handleResetAll} disabled={rt.isBusy}
            className={cn("rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors",
              rt.isBusy ? "cursor-not-allowed opacity-50" : "hover:bg-destructive/10")}>
            {rt.isResetting ? "Resetting..." : "Reset All"}
          </button>
        )}
        {rt.hasSelection && (
          <span className="text-[11px] text-muted-foreground">
            {rt.previewPermissions.length} permission{rt.previewPermissions.length !== 1 ? "s" : ""} from selected roles
          </span>
        )}
      </div>

      <EffectivePermissionsGrid effective={rt.effectivePerms} preview={rt.previewPermissions} showPreview={true} />
    </div>
  );
}
