import { useState } from "react";
import { cn } from "@/lib/cn";
import { DropdownAreaPanel } from "../components/DropdownAreaPanel";
import type { Area, AreaGroup } from "./adminSettingsConfig";

function CollapsibleArea({ area }: { area: Area }): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors",
          open
            ? "rounded-t-lg bg-orange-500/10 hover:bg-orange-500/20"
            : "rounded-lg border border-orange-500 bg-card hover:bg-orange-500/5",
        )}
      >
        <span className={cn("text-sm font-semibold", open ? "text-orange-500" : "text-foreground")}>{area.label}</span>
        <span className={cn("text-xs transition-transform duration-150", open ? "rotate-180 text-orange-500" : "text-orange-500")}>
          ▼
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">
          <DropdownAreaPanel module={area.module} category={area.category} categoryLabel={area.label} />
        </div>
      )}
    </div>
  );
}

interface CollapsibleGroupProps {
  group: AreaGroup;
  defaultOpen?: boolean;
}

export function CollapsibleGroup({ group, defaultOpen = false }: CollapsibleGroupProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between px-5 py-4 text-left transition-colors",
          open
            ? "rounded-t-xl bg-orange-500/10 hover:bg-orange-500/20"
            : "rounded-xl border border-orange-500 bg-card hover:bg-orange-500/5",
        )}
      >
        <div>
          <h3 className={cn("text-sm font-bold", open ? "text-orange-500" : "text-foreground")}>{group.groupLabel}</h3>
          <p className={cn("mt-0.5 text-xs", open ? "text-orange-500/70" : "text-muted-foreground")}>
            {group.areas.length} {group.areas.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <span className={cn("text-xs transition-transform duration-150", open ? "rotate-180 text-orange-500" : "text-orange-500")}>
          ▼
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border bg-card px-4 py-4">
          {group.areas.map((area) => (
            <CollapsibleArea key={area.key} area={area} />
          ))}
        </div>
      )}
    </div>
  );
}
