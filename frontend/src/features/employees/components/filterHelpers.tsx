import { useState } from "react";

export function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CheckboxGroup({
  options,
  selected,
  onToggle,
  loading,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading…</p>;
  }
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">No options configured.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-center gap-2.5"
          onClick={() => onToggle(o.value)}
        >
          <div
            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
              selected.includes(o.value)
                ? "border-orange-500 bg-orange-500"
                : "border-border bg-background"
            }`}
          >
            {selected.includes(o.value) && (
              <span className="text-[9px] font-bold leading-none text-white">✓</span>
            )}
          </div>
          <span className="text-sm text-card-foreground">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export function FilterSection({
  label,
  badge,
  defaultOpen = false,
  children,
}: {
  label: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-0.5"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {badge !== undefined && badge > 0 && (
            <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
              {badge}
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground">{open ? "▴" : "▾"}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archiving", label: "Archiving" },
  { value: "archived", label: "Archived" },
  { value: "new_onboard", label: "Onboarding" },
];
