import { cn } from "@/lib/cn";
import type { DropdownOption } from "../types/admin-settings.types";
import type { Role } from "../types/role.types";

function RoleBadge({ label, variant }: { label: string; variant: "system" | "auto-assign" | "stale" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium",
        variant === "system" && "bg-muted text-muted-foreground",
        variant === "auto-assign" && "bg-primary/10 text-primary",
        variant === "stale" && "border border-orange-400/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
      )}
    >
      {label}
    </span>
  );
}

function getStaleDepts(
  role: Role,
  allDepts: DropdownOption[],
): { value: string; reason: "Disabled" | "Removed" }[] {
  return (role.auto_assign_departments ?? []).flatMap((v): { value: string; reason: "Disabled" | "Removed" }[] => {
    const match = allDepts.find((d) => d.value === v);
    if (!match) return [{ value: v, reason: "Removed" }];
    if (!match.is_active) return [{ value: v, reason: "Disabled" }];
    return [];
  });
}

export function RoleDeptCell({ role, allDepts }: { role: Role; allDepts: DropdownOption[] }): JSX.Element {
  const staleDepts = getStaleDepts(role, allDepts);
  const hasStale = staleDepts.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {role.is_system && <RoleBadge label="System" variant="system" />}
      {(role.auto_assign_departments ?? []).length > 0 && !hasStale && (
        <RoleBadge
          label={`Auto-assign (${role.auto_assign_departments.length})`}
          variant="auto-assign"
        />
      )}
      {hasStale && (
        <span
          className="rounded border border-orange-400/40 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400"
          title={staleDepts.map((s) => `${s.value}: ${s.reason}`).join(", ")}
        >
          ⚠ Dept Update Required
        </span>
      )}
      {(role.auto_assign_departments ?? []).length === 0 && !role.is_system && (
        <span className="italic text-muted-foreground/40 text-xs">—</span>
      )}
    </div>
  );
}
