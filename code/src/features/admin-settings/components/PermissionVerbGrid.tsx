import { useState } from "react";
import { cn } from "@/lib/cn";
import { ACTION_LABELS, MODULE_LABELS } from "../types/role.types";
import type { Permission } from "../types/role.types";
import {
  GROUPED, isSelected, hasOtherPermsInModule,
  ACTION_DEPS, isLockedByActionDep, getModuleLevel,
} from "./permissionVerbUtils";

interface PermissionVerbGridProps {
  selected: Permission[];
  onChange: (permissions: Permission[]) => void;
  readonly?: boolean;
  /** Permissions inherited from the base role — shown as checked+locked with muted style */
  inheritedPermissions?: Permission[];
  /** Permissions that are always locked and cannot be toggled (e.g. manage_roles for non-system-admins) */
  lockedPermissions?: Permission[];
}

export function PermissionVerbGrid({
  selected,
  onChange,
  readonly = false,
  inheritedPermissions,
  lockedPermissions,
}: PermissionVerbGridProps): JSX.Element {
  const [allModules, setAllModules] = useState<Set<string>>(new Set());

  function setModuleLevel(module: string, level: string, actions: string[]) {
    if (readonly) return;
    const others = selected.filter((p) => p.module !== module);
    if (level === "none") {
      setAllModules((prev) => { const next = new Set(prev); next.delete(module); return next; });
      onChange(others);
    } else if (level === "view") {
      setAllModules((prev) => { const next = new Set(prev); next.delete(module); return next; });
      onChange([...others, { module, action: "view_module" }]);
    } else if (level === "full") {
      setAllModules((prev) => new Set(prev).add(module));
      onChange([...others, ...actions.map((action) => ({ module, action }))]);
    }
  }

  function toggle(module: string, action: string) {
    if (readonly || allModules.has(module)) return;

    const isCurrentlySelected = isSelected(selected, module, action);

    if (action === "view_module") {
      if (hasOtherPermsInModule(selected, module)) return;
      if (isCurrentlySelected) {
        onChange(selected.filter((p) => !(p.module === module && p.action === "view_module")));
      } else {
        onChange([...selected, { module, action: "view_module" }]);
      }
      return;
    }

    if (isLockedByActionDep(selected, module, action)) return;

    if (isCurrentlySelected) {
      let next = selected.filter((p) => !(p.module === module && p.action === action));
      const stillHasOthers = next.some((p) => p.module === module && p.action !== "view_module");
      if (!stillHasOthers) {
        next = next.filter((p) => !(p.module === module && p.action === "view_module"));
      }
      for (const [depAction, deps] of Object.entries(ACTION_DEPS)) {
        const depStillNeeded = deps.some((d) => isSelected(next, module, d));
        if (!depStillNeeded) {
          next = next.filter((p) => !(p.module === module && p.action === depAction));
        }
      }
      onChange(next);
    } else {
      const next = [...selected, { module, action }];
      if (!isSelected(selected, module, "view_module")) {
        next.push({ module, action: "view_module" });
      }
      for (const [depAction, deps] of Object.entries(ACTION_DEPS)) {
        if (deps.includes(action) && !isSelected(selected, module, depAction)) {
          next.push({ module, action: depAction });
        }
      }
      onChange(next);
    }
  }

  return (
    <div className="space-y-3">
      {Object.entries(GROUPED).map(([module, actions]) => {
        const isAll = allModules.has(module);
        const otherPermsExist = hasOtherPermsInModule(selected, module);
        const level = getModuleLevel(selected, module, actions);
        return (
          <div key={module} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {MODULE_LABELS[module] ?? module}
              </span>
              <div className="flex items-center gap-2">
                {!readonly && (
                  <div className="flex items-center gap-1">
                    {(["none", "view", "full"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setModuleLevel(module, lvl, actions)}
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                          level === lvl
                            ? lvl === "none"
                              ? "bg-muted text-foreground"
                              : lvl === "view"
                                ? "bg-blue-500/20 text-blue-600"
                                : "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {lvl === "none" ? "None" : lvl === "view" ? "View Only" : "Full Access"}
                      </button>
                    ))}
                    {level === "custom" && (
                      <span className="rounded bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-500">
                        Custom
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {actions.map((action) => {
                const checked = isSelected(selected, module, action);
                const isInherited = inheritedPermissions
                  ? inheritedPermissions.some((p) => p.module === module && p.action === action)
                  : false;
                const isPermLocked = lockedPermissions
                  ? lockedPermissions.some((p) => p.module === module && p.action === action)
                  : false;
                const lockedByAll = isAll;
                const lockedByDep =
                  (action === "view_module" && otherPermsExist) ||
                  isLockedByActionDep(selected, module, action);
                const isLocked = lockedByAll || lockedByDep || isInherited || isPermLocked;
                return (
                  <label
                    key={action}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                      isInherited
                        ? "cursor-default border-orange-300/40 bg-orange-500/5 text-orange-400/60"
                        : isLocked
                          ? "cursor-default border-primary/20 bg-primary/5 text-primary/50"
                          : checked
                            ? "cursor-pointer border-primary/40 bg-primary/10 text-primary"
                            : "cursor-pointer border-border bg-background text-muted-foreground hover:border-border hover:bg-muted",
                      readonly && "cursor-default opacity-70",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(module, action)}
                      disabled={readonly || isLocked}
                    />
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px]",
                        isInherited
                          ? "border-orange-400/50 bg-orange-500/20 text-orange-400/60"
                          : checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground",
                        isLocked && !isInherited && "opacity-40",
                      )}
                    >
                      {(checked || isInherited) && "✓"}
                    </span>
                    {ACTION_LABELS[action] ?? action}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
