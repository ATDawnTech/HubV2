import { useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { DropdownOption } from "../types/admin-settings.types";
import { formatLabel } from "./DropdownOptionRow";

interface PanelProps {
  option: DropdownOption;
  otherActiveOptions: DropdownOption[];
  isPending: boolean;
  onConfirm: (reassignTo: string) => void;
  onCancel: () => void;
}

export function DropdownDisablePanel({ option, otherActiveOptions, isPending, onConfirm, onCancel }: PanelProps) {
  const [reassignTo, setReassignTo] = useState("");

  return (
    <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 px-3 py-3">
      <p className="mb-1 text-sm font-medium text-card-foreground">
        Disable <span className="font-semibold">"{formatLabel(option.value)}"</span>?
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Disabled values are hidden from new employee forms but remain on existing records. Employees with this value will keep it until manually updated.
      </p>
      {otherActiveOptions.length > 0 && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-foreground">
            Also reassign existing employees to:
          </label>
          <CustomSelect
            value={reassignTo}
            onChange={setReassignTo}
            options={otherActiveOptions.map((o) => ({ value: o.value, label: formatLabel(o.value) }))}
          />
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(reassignTo)}
          disabled={isPending}
          className="rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
        >
          {isPending ? "Disabling…" : "Yes, Disable"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function DropdownRemovePanel({ option, otherActiveOptions, isPending, onConfirm, onCancel }: PanelProps) {
  const [reassignTo, setReassignTo] = useState("");

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3">
      <p className="mb-1 text-sm font-medium text-card-foreground">
        Remove <span className="font-semibold">"{formatLabel(option.value)}"</span>?
      </p>
      <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-muted-foreground">
        <span><span className="font-medium text-foreground">Value (stored):</span> {option.value}</span>
        <span><span className="font-medium text-foreground">Status:</span> {option.is_active ? "Active" : "Disabled"}</span>
        <span><span className="font-medium text-foreground">Module:</span> {option.module}</span>
        <span><span className="font-medium text-foreground">Category:</span> {option.category}</span>
        <span className="col-span-2 mt-1 text-destructive/80">
          This cannot be undone. Any employees currently set to this value will keep it until manually updated.
        </span>
      </div>
      {otherActiveOptions.length > 0 && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-foreground">
            Also reassign existing employees to:
          </label>
          <CustomSelect
            value={reassignTo}
            onChange={setReassignTo}
            options={otherActiveOptions.map((o) => ({ value: o.value, label: formatLabel(o.value) }))}
          />
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(reassignTo)}
          disabled={isPending}
          className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          {isPending ? "Removing…" : "Yes, Remove"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
