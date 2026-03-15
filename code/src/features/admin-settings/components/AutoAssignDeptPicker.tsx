import { cn } from "@/lib/cn";
import { useDropdownsByModule } from "../hooks/useDropdownsByModule";
import type { DropdownOption } from "../types/admin-settings.types";

interface Props {
  value: string[];
  onChange: (depts: string[]) => void;
  disabled?: boolean;
}

function getDeptStaleReason(value: string, allDepts: DropdownOption[]): "Disabled" | "Removed" | null {
  const match = allDepts.find((d) => d.value === value);
  if (!match) return "Removed";
  if (!match.is_active) return "Disabled";
  return null;
}

export function AutoAssignDeptPicker({ value: autoAssignDepts, onChange, disabled }: Props): JSX.Element {
  const { data: deptsData } = useDropdownsByModule("employees", "department");
  const allDepts: DropdownOption[] = deptsData?.options ?? [];
  const activeDepts = allDepts.filter((d) => d.is_active);

  const displayDepts: DropdownOption[] = [
    ...activeDepts,
    ...autoAssignDepts
      .filter((v) => !activeDepts.some((d) => d.value === v))
      .map((v) => allDepts.find((d) => d.value === v) ?? {
        id: `__stale_${v}`,
        module: "employees",
        category: "department",
        value: v,
        sort_order: 0,
        is_active: false,
        created_by: null,
        created_at: null,
        updated_at: null,
      }),
  ];

  function toggleDept(v: string) {
    onChange(autoAssignDepts.includes(v) ? autoAssignDepts.filter((d) => d !== v) : [...autoAssignDepts, v]);
  }

  if (displayDepts.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground/60">
        No departments configured. Add them in Dropdown Settings.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-3">
      {displayDepts.map((dept) => {
        const stale = getDeptStaleReason(dept.value, allDepts);
        const checked = autoAssignDepts.includes(dept.value);
        return (
          <label
            key={dept.id}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              disabled && "cursor-not-allowed opacity-50",
              checked
                ? stale
                  ? "border-orange-400 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => !disabled && toggleDept(dept.value)}
              className="h-3.5 w-3.5 accent-primary"
              disabled={disabled}
            />
            {dept.value}
            {stale && checked && (
              <span className="text-[10px] font-medium">⚠</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
