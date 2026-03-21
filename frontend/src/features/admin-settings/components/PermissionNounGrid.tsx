import { useState } from "react";
import { cn } from "@/lib/cn";
import { ACTION_LABELS, NOUN_PERMISSIONS, formatPermissionLabel } from "../types/role.types";
import type { Permission } from "../types/role.types";

interface PermissionNounGridProps {
  selected: Permission[];
  onChange: (permissions: Permission[]) => void;
  readonly?: boolean;
  /** Permissions inherited from the base role — shown as checked+locked with muted style */
  inheritedPermissions?: Permission[];
  /** Permissions that are always locked and cannot be toggled (e.g. manage_roles for non-system-admins) */
  lockedPermissions?: Permission[];
}

function isSelected(selected: Permission[], module: string, action: string): boolean {
  return selected.some((p) => p.module === module && p.action === action);
}

export function PermissionNounGrid({
  selected,
  onChange,
  readonly = false,
  inheritedPermissions,
  lockedPermissions,
}: PermissionNounGridProps): JSX.Element {
  const [selectAll, setSelectAll] = useState(false);

  function toggleAll() {
    if (readonly) return;
    if (selectAll) {
      setSelectAll(false);
      onChange(selected.filter((p) => p.module !== "visibility"));
    } else {
      setSelectAll(true);
      const others = selected.filter((p) => p.module !== "visibility");
      onChange([...others, ...NOUN_PERMISSIONS]);
    }
  }

  function toggle(module: string, action: string) {
    if (readonly || selectAll) return;
    if (isSelected(selected, module, action)) {
      onChange(selected.filter((p) => !(p.module === module && p.action === action)));
    } else {
      onChange([...selected, { module, action }]);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Visibility / Data Access
        </span>
        {!readonly && (
          <button
            type="button"
            onClick={toggleAll}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
              selectAll
                ? "bg-orange-500/20 text-orange-500 hover:bg-orange-500/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {selectAll ? "✓ All Selected" : "Select All"}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {NOUN_PERMISSIONS.map(({ module, action }) => {
          const checked = isSelected(selected, module, action);
          const isInherited = inheritedPermissions
            ? inheritedPermissions.some((p) => p.module === module && p.action === action)
            : false;
          const isPermLocked = lockedPermissions
            ? lockedPermissions.some((p) => p.module === module && p.action === action)
            : false;
          const isDisabled = readonly || selectAll || isInherited || isPermLocked;
          return (
            <label
              key={action}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                isInherited
                  ? "cursor-default border-orange-300/40 bg-orange-500/5 text-orange-400/60"
                  : selectAll
                    ? "cursor-default border-orange-400/20 bg-orange-500/5 text-orange-500/50"
                    : checked
                      ? "cursor-pointer border-orange-400/60 bg-orange-500/10 text-orange-500"
                      : "cursor-pointer border-border bg-background text-muted-foreground hover:bg-muted",
                readonly && "cursor-default opacity-70",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked || isInherited}
                onChange={() => toggle(module, action)}
                disabled={isDisabled}
              />
              <span
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px]",
                  isInherited
                    ? "border-orange-400/50 bg-orange-500/20 text-orange-400/60"
                    : checked
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-muted-foreground",
                  selectAll && !isInherited && "opacity-40",
                )}
              >
                {(checked || isInherited) && "✓"}
              </span>
              {ACTION_LABELS[action] ?? formatPermissionLabel(action)}
            </label>
          );
        })}
      </div>
    </div>
  );
}
