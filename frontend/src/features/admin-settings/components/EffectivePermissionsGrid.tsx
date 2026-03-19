import { cn } from "@/lib/cn";
import type { Permission } from "../types/role.types";
import {
  VERB_PERMISSIONS,
  NOUN_PERMISSIONS,
  MODULE_LABELS,
  ACTION_LABELS,
  formatPermissionLabel,
} from "../types/role.types";

const ALL_PERMISSIONS = [...VERB_PERMISSIONS, ...NOUN_PERMISSIONS];

const GROUPED_PERMS = ALL_PERMISSIONS.reduce<Record<string, Permission[]>>((acc, p) => {
  const arr = acc[p.module] ?? [];
  arr.push(p);
  acc[p.module] = arr;
  return acc;
}, {});

function hasPerm(list: Permission[], module: string, action: string): boolean {
  return list.some((p) => p.module === module && p.action === action);
}

interface Props {
  effective: Permission[];
  preview: Permission[];
  showPreview: boolean;
}

export function EffectivePermissionsGrid({ effective, preview, showPreview }: Props): JSX.Element {
  const grantedCount = effective.length;
  const previewCount = preview.length;
  const totalCount = ALL_PERMISSIONS.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {showPreview ? "Selected Roles Preview" : "Your Effective Permissions"}
        </p>
        <span className="text-[11px] text-muted-foreground">
          {showPreview
            ? `${previewCount} / ${totalCount} from selection`
            : `${grantedCount} / ${totalCount} granted`}
        </span>
      </div>

      {Object.entries(GROUPED_PERMS).map(([module, perms]) => {
        const moduleGranted = perms.filter((p) => hasPerm(effective, p.module, p.action)).length;
        const modulePreview = perms.filter((p) => hasPerm(preview, p.module, p.action)).length;
        const displayCount = showPreview ? modulePreview : moduleGranted;
        return (
          <div key={module} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {MODULE_LABELS[module] ?? module}
              </span>
              <span className={cn(
                "text-[10px] font-medium",
                displayCount === perms.length ? "text-orange-600 dark:text-orange-400"
                  : displayCount > 0 ? "text-orange-500/70 dark:text-orange-400/70"
                  : "text-muted-foreground/50",
              )}>
                {displayCount}/{perms.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {perms.map((p) => {
                const granted = hasPerm(effective, p.module, p.action);
                const inPreview = hasPerm(preview, p.module, p.action);
                const highlighted = showPreview ? inPreview : granted;
                return (
                  <div key={`${p.module}-${p.action}`} className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs",
                    highlighted
                      ? "border-orange-400/40 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                      : "border-border bg-background text-muted-foreground/40",
                  )}>
                    <span className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px]",
                      highlighted ? "border-orange-500 bg-orange-500 text-white" : "border-muted-foreground/30",
                    )}>
                      {highlighted ? "✓" : "✕"}
                    </span>
                    {ACTION_LABELS[p.action] ?? formatPermissionLabel(p.action)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
