import { useState } from "react";
import { useDeleteDropdown } from "../hooks/useDeleteDropdown";
import { useReassignEmployees } from "../hooks/useReassignEmployees";
import { useUpdateDropdown } from "../hooks/useUpdateDropdown";
import { DropdownDisablePanel, DropdownRemovePanel } from "./DropdownConfirmPanels";
import type { DropdownOption } from "../types/admin-settings.types";

export interface DropdownOptionRowProps {
  option: DropdownOption;
  otherActiveOptions: DropdownOption[];
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/** "full_time" → "Full Time" */
export function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "Full Time " → "full_time" — trim edges, collapse internal spaces to _ */
export function toStorageValue(input: string): string {
  return input.trim().replace(/\s+/g, "_");
}

export function DropdownOptionRow({ option, otherActiveOptions, isFirst, isLast, onMoveUp, onMoveDown }: DropdownOptionRowProps): JSX.Element {
  const updateDropdown = useUpdateDropdown();
  const deleteDropdown = useDeleteDropdown();
  const reassignEmployees = useReassignEmployees();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disableConfirming, setDisableConfirming] = useState(false);
  const [editValue, setEditValue] = useState(formatLabel(option.value));

  function handleSave(): void {
    const storage = toStorageValue(editValue);
    if (!storage || storage === option.value) { setEditing(false); return; }
    updateDropdown.mutate(
      { id: option.id, value: storage },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleToggleActive(): void {
    if (option.is_active) { setDisableConfirming(true); return; }
    updateDropdown.mutate({ id: option.id, is_active: true });
  }

  function handleDisableConfirm(reassignTo: string): void {
    const doDisable = () =>
      updateDropdown.mutate(
        { id: option.id, is_active: false },
        { onSuccess: () => setDisableConfirming(false) },
      );
    if (reassignTo) {
      reassignEmployees.mutate(
        { module: option.module, category: option.category, from_value: option.value, to_value: reassignTo },
        { onSuccess: () => doDisable() },
      );
    } else {
      doDisable();
    }
  }

  function handleRemoveConfirm(reassignTo: string): void {
    const doDelete = () =>
      deleteDropdown.mutate(option.id, { onSuccess: () => setConfirming(false) });
    if (reassignTo) {
      reassignEmployees.mutate(
        { module: option.module, category: option.category, from_value: option.value, to_value: reassignTo },
        { onSuccess: () => doDelete() },
      );
    } else {
      doDelete();
    }
  }

  if (disableConfirming) {
    return (
      <DropdownDisablePanel
        option={option}
        otherActiveOptions={otherActiveOptions}
        isPending={updateDropdown.isPending || reassignEmployees.isPending}
        onConfirm={handleDisableConfirm}
        onCancel={() => setDisableConfirming(false)}
      />
    );
  }

  if (confirming) {
    return (
      <DropdownRemovePanel
        option={option}
        otherActiveOptions={otherActiveOptions}
        isPending={deleteDropdown.isPending || reassignEmployees.isPending}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setConfirming(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
      <div className="flex flex-col gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="Move up"
          className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-orange-500 bg-orange-500/10 text-sm font-bold text-orange-500 hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-orange-500/10 disabled:hover:text-orange-500"
        >
          ▴
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="Move down"
          className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-orange-500 bg-orange-500/10 text-sm font-bold text-orange-500 hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-orange-500/10 disabled:hover:text-orange-500"
        >
          ▾
        </button>
      </div>

      <span
        className={`h-2 w-2 flex-shrink-0 rounded-full ${
          option.is_active ? "bg-green-500" : "bg-muted-foreground/30"
        }`}
      />

      {editing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setEditValue(formatLabel(option.value)); } }}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <span className={`flex-1 text-sm ${option.is_active ? "text-card-foreground" : "text-muted-foreground line-through"}`}>
          {formatLabel(option.value)}
        </span>
      )}

      <div className="flex items-center gap-1.5">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={updateDropdown.isPending}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updateDropdown.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setEditValue(formatLabel(option.value)); }}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
            >
              Edit
            </button>
            <button
              onClick={handleToggleActive}
              disabled={updateDropdown.isPending}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {option.is_active ? "Disable" : "Enable"}
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
