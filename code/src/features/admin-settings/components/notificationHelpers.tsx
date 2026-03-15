import { cn } from "@/lib/cn";
import type { ModuleToggle } from "../types/notification-settings.types";

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean | undefined;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus:outline-none",
        checked ? "bg-primary" : "bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow",
          "transform transition duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function ThresholdRow({
  label,
  description,
  value,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v > 0) onChange(v);
          }}
          className={cn(
            "w-20 rounded-md border border-border bg-background px-2 py-1 text-right text-sm",
            "focus:outline-none focus:ring-1 focus:ring-primary",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export const MODULE_LABELS: Record<string, string> = {
  employees: "Employees",
  assets: "Assets",
  onboarding: "Onboarding",
  intake: "Intake",
  projects: "Projects",
  timesheets: "Timesheets",
  audit: "Audit",
};

export function ModuleToggleTable({
  toggles,
  onChange,
  disabled,
}: {
  toggles: ModuleToggle[];
  onChange: (module: string, channel: "email" | "inapp", enabled: boolean) => void;
  disabled?: boolean;
}) {
  const modules = Array.from(new Set(toggles.map((t) => t.module))).sort();

  function getToggle(module: string, channel: "email" | "inapp"): boolean {
    return toggles.find((t) => t.module === module && t.channel === channel)?.enabled ?? true;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Module</th>
            <th className="w-24 px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Email</th>
            <th className="w-24 px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">In-App</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {modules.map((module) => (
            <tr key={module} className="hover:bg-muted/20">
              <td className="truncate px-4 py-3 font-medium text-foreground">{MODULE_LABELS[module] ?? module}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <Toggle checked={getToggle(module, "email")} onChange={(v) => onChange(module, "email", v)} disabled={disabled} />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <Toggle checked={getToggle(module, "inapp")} onChange={(v) => onChange(module, "inapp", v)} disabled={disabled} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
